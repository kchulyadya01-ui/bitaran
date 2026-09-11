import NepaliDateRaw from 'nepali-date-converter';
import {
  db, uid, enqueue, audit, getMeta, setMeta,
  STATUS_RANK,
  type Invoice, type InvoiceLine, type OrderEvent, type OrderStatus,
  type PaymentType, type Pick, type Product,
} from './db';

const NepaliDate = NepaliDateRaw as unknown as typeof NepaliDateRaw;

export const VAT_RATE = 0.13;

/** Nepali/Indian digit grouping: 1,24,500 not 124,500. */
export function money(n: number, withPaisa = false): string {
  const neg = n < 0;
  const fixed = Math.abs(n).toFixed(2);
  const [whole, paisa] = fixed.split('.');
  let grouped = whole;
  if (whole.length > 3) {
    const last3 = whole.slice(-3);
    let rest = whole.slice(0, -3);
    const groups: string[] = [];
    while (rest.length > 2) {
      groups.unshift(rest.slice(-2));
      rest = rest.slice(0, -2);
    }
    if (rest.length) groups.unshift(rest);
    grouped = groups.join(',') + ',' + last3;
  }
  const out = withPaisa || paisa !== '00' ? `${grouped}.${paisa}` : grouped;
  return neg ? `-${out}` : out;
}

export const rs = (n: number, withPaisa = false) => `Rs ${money(n, withPaisa)}`;

export function vatOf(subtotal: number) {
  return Math.round(subtotal * VAT_RATE * 100) / 100;
}

// --- Bikram Sambat -----------------------------------------------------------

export function bs(date: Date | number = Date.now()) {
  const d = new NepaliDate(new Date(date));
  return {
    ymd: d.format('YYYY/MM/DD'),
    long: d.format('DD MMMM YYYY'),
    dayMonth: d.format('MMMM DD'),
    year: d.getYear(),
    monthIndex: d.getMonth(),
  };
}

/** Nepali fiscal year starts Shrawan 1 (month index 3). */
export function fiscalYearOf(date: Date | number = Date.now()): number {
  const d = bs(date);
  return d.monthIndex >= 3 ? d.year : d.year - 1;
}

// --- Derived values. Never stored; always summed from events. ----------------

export async function stockOnHand(productId: string): Promise<number> {
  const events = await db.stockEvents.where('productId').equals(productId).toArray();
  return events.reduce((sum, e) => sum + e.delta, 0);
}

export async function allStock(tenantId: string): Promise<Record<string, number>> {
  const events = await db.stockEvents.where('tenantId').equals(tenantId).toArray();
  const out: Record<string, number> = {};
  for (const e of events) out[e.productId] = (out[e.productId] ?? 0) + e.delta;
  return out;
}

export async function balanceOf(customerId: string): Promise<number> {
  const invoices = await db.invoices.where('customerId').equals(customerId).toArray();
  const payments = await db.payments.where('customerId').equals(customerId).toArray();
  const billed = invoices
    .filter((i) => i.status === 'issued' && i.paymentType === 'credit')
    .reduce((s, i) => s + i.total, 0);
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  return Math.round((billed - paid) * 100) / 100;
}

export async function allBalances(tenantId: string): Promise<Record<string, { due: number; oldest?: number; bills: number }>> {
  const invoices = await db.invoices.where('tenantId').equals(tenantId).toArray();
  const payments = await db.payments.where('tenantId').equals(tenantId).toArray();
  const out: Record<string, { due: number; oldest?: number; bills: number }> = {};
  for (const i of invoices) {
    if (i.status !== 'issued' || i.paymentType !== 'credit') continue;
    const row = (out[i.customerId] ??= { due: 0, bills: 0 });
    row.due += i.total;
    row.bills += 1;
    row.oldest = row.oldest === undefined ? i.issuedAt : Math.min(row.oldest, i.issuedAt);
  }
  for (const p of payments) {
    const row = (out[p.customerId] ??= { due: 0, bills: 0 });
    row.due -= p.amount;
  }
  return out;
}

/** Status advances by rank and never retreats; a late lower-ranked event is audit only. */
export function resolveStatus(events: OrderEvent[]): OrderStatus {
  if (events.some((e) => e.status === 'cancelled')) return 'cancelled';
  let best: OrderStatus = 'placed';
  for (const e of events) {
    if (STATUS_RANK[e.status] > STATUS_RANK[best] && e.status !== 'cancelled') best = e.status;
  }
  return best;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: 'New',
  confirmed: 'Confirmed',
  out_for_delivery: 'On van',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

// --- Invoice numbering -------------------------------------------------------

/**
 * Per-device series: A-2083-0001. The counter is bumped inside the same
 * transaction that writes the invoice, so a number is never handed out twice
 * and never skipped. See docs/architecture.md section 2.
 */
async function takeNextSeq(tenantId: string, prefix: string, fiscalYear: number): Promise<number> {
  const key = `${tenantId}|${prefix}|${fiscalYear}`;
  const row = await db.counters.get(key);
  const next = row?.next ?? 1;
  await db.counters.put({ key, next: next + 1 });
  return next;
}

export function formatInvoiceNumber(prefix: string, fiscalYear: number, seq: number) {
  return `${prefix}-${fiscalYear}-${String(seq).padStart(4, '0')}`;
}

export async function peekNextInvoiceNumber(tenantId: string, prefix: string) {
  const fy = fiscalYearOf();
  const row = await db.counters.get(`${tenantId}|${prefix}|${fy}`);
  return formatInvoiceNumber(prefix, fy, row?.next ?? 1);
}

export interface DraftLine {
  product: Product;
  qty: number;
}

export async function issueInvoice(opts: {
  tenantId: string;
  customerId: string;
  buyerPan: string;
  lines: DraftLine[];
  paymentType: PaymentType;
  orderId?: string;
}): Promise<Invoice> {
  const deviceId = (await getMeta<string>('deviceId'))!;
  const userId = (await getMeta<string>('activeUserId'))!;
  const user = await db.users.get(userId);
  const prefix = user?.prefix ?? 'A';
  const fy = fiscalYearOf();
  const now = Date.now();

  const priced = opts.lines
    .filter((l) => l.qty > 0)
    .map((l) => ({
      ...l,
      lineTotal: Math.round(l.qty * l.product.price * 100) / 100,
    }));
  const subtotal = Math.round(priced.reduce((s, l) => s + l.lineTotal, 0) * 100) / 100;
  const vat = vatOf(subtotal);
  const total = Math.round((subtotal + vat) * 100) / 100;

  let invoice!: Invoice;

  await db.transaction(
    'rw',
    [db.invoices, db.invoiceLines, db.stockEvents, db.payments, db.counters, db.outbox, db.auditLog, db.meta, db.orderEvents],
    async () => {
      const seq = await takeNextSeq(opts.tenantId, prefix, fy);
      const id = uid();
      invoice = {
        id,
        tenantId: opts.tenantId,
        number: formatInvoiceNumber(prefix, fy, seq),
        fiscalYear: fy,
        prefix,
        seq,
        customerId: opts.customerId,
        orderId: opts.orderId,
        buyerPan: opts.buyerPan,
        issuedAt: now,
        issuedBy: userId,
        subtotal,
        vat,
        total,
        paymentType: opts.paymentType,
        status: 'issued',
        printCount: 0,
      };
      await db.invoices.add(invoice);

      const lines: InvoiceLine[] = priced.map((l) => ({
        id: uid(),
        invoiceId: id,
        productId: l.product.id,
        nameSnapshot: l.product.name,
        unitSnapshot: l.product.unit,
        rateSnapshot: l.product.price,
        qty: l.qty,
        lineTotal: l.lineTotal,
      }));
      await db.invoiceLines.bulkAdd(lines);

      // Selling moves stock. Negative stock is allowed and surfaced, never blocked.
      await db.stockEvents.bulkAdd(
        priced.map((l) => ({
          id: uid(),
          tenantId: opts.tenantId,
          productId: l.product.id,
          delta: -l.qty,
          reason: 'sold' as const,
          refId: id,
          occurredAt: now,
          createdBy: userId,
        })),
      );

      // A cash sale is paid at the moment it is billed.
      if (opts.paymentType === 'cash') {
        await db.payments.add({
          id: uid(),
          tenantId: opts.tenantId,
          customerId: opts.customerId,
          invoiceId: id,
          amount: total,
          method: 'cash',
          collectedAt: now,
          collectedBy: userId,
        });
      }

      if (opts.orderId) {
        await db.orderEvents.add({
          id: uid(), orderId: opts.orderId, status: 'confirmed', occurredAt: now, createdBy: userId,
        });
      }

      await db.outbox.add({ id: uid(), entity: 'invoice', op: 'insert', payload: { invoice, lines }, createdAt: now, attempts: 0 });
      await db.auditLog.add({
        id: uid(), tenantId: opts.tenantId, userId, deviceId,
        action: 'issue_invoice', entity: 'invoice', entityId: id, after: invoice, deviceTime: now,
      });
    },
  );

  return invoice;
}

export async function recordPayment(opts: {
  tenantId: string;
  customerId: string;
  amount: number;
  method: 'cash' | 'digital';
  invoiceId?: string;
  note?: string;
}) {
  const userId = (await getMeta<string>('activeUserId'))!;
  const id = uid();
  const row = {
    id,
    tenantId: opts.tenantId,
    customerId: opts.customerId,
    invoiceId: opts.invoiceId,
    amount: opts.amount,
    method: opts.method,
    collectedAt: Date.now(),
    collectedBy: userId,
    note: opts.note,
  };
  await db.payments.add(row);
  await enqueue('payment', 'insert', row);
  await audit('record_payment', 'payment', id, row);
  return row;
}

export async function markOrderStatus(orderId: string, status: OrderStatus, note?: string) {
  const userId = (await getMeta<string>('activeUserId'))!;
  const row: OrderEvent = { id: uid(), orderId, status, occurredAt: Date.now(), createdBy: userId, note };
  await db.orderEvents.add(row);
  await enqueue('orderEvent', 'insert', row);
  await audit('order_status', 'order', orderId, row);
}

/**
 * Tick lines off the shelf while the van is loaded, or untick them.
 *
 * Picking is working state, not a financial record: unticking deletes the row
 * instead of leaving a tombstone, because nothing downstream reads a pick that
 * is no longer true. The row id is orderId:productId, so the same line ticked
 * on two phones converges on one row rather than two.
 */
export async function setPicked(
  lines: { orderId: string; productId: string; qty: number }[],
  picked: boolean,
) {
  if (!lines.length) return;
  const tenantId = (await getMeta<string>('activeTenantId'))!;
  const userId = (await getMeta<string>('activeUserId'))!;
  const now = Date.now();
  await db.transaction('rw', [db.picks, db.outbox, db.auditLog, db.meta], async () => {
    for (const l of lines) {
      const id = `${l.orderId}:${l.productId}`;
      if (picked) {
        const row: Pick = {
          id, tenantId, orderId: l.orderId, productId: l.productId,
          qty: l.qty, pickedAt: now, pickedBy: userId,
        };
        await db.picks.put(row);
        await enqueue('pick', 'insert', row);
      } else {
        await db.picks.delete(id);
        await enqueue('pick', 'update', { id, picked: false, at: now, by: userId });
      }
    }
    await audit(picked ? 'pick_lines' : 'unpick_lines', 'order', lines[0].orderId, {
      count: lines.length, productIds: lines.map((l) => l.productId),
    });
  });
}

export async function receiveIncoming(incomingId: string) {
  const userId = (await getMeta<string>('activeUserId'))!;
  const tenantId = (await getMeta<string>('activeTenantId'))!;
  const inc = await db.incoming.get(incomingId);
  if (!inc || inc.status === 'received') return;
  const lines = await db.incomingLines.where('incomingId').equals(incomingId).toArray();
  const now = Date.now();
  await db.transaction('rw', [db.incoming, db.stockEvents, db.outbox, db.auditLog, db.meta], async () => {
    await db.incoming.put({ ...inc, status: 'received', receivedAt: now });
    await db.stockEvents.bulkAdd(
      lines.map((l) => ({
        id: uid(), tenantId, productId: l.productId, delta: l.qty,
        reason: 'received' as const, refId: incomingId, occurredAt: now, createdBy: userId,
      })),
    );
    await db.outbox.add({ id: uid(), entity: 'incoming', op: 'update', payload: { incomingId, status: 'received' }, createdAt: now, attempts: 0 });
    await db.auditLog.add({
      id: uid(), tenantId, userId, deviceId: (await getMeta<string>('deviceId')) ?? '?',
      action: 'receive_stock', entity: 'incoming', entityId: incomingId, after: { lines }, deviceTime: now,
    });
  });
}

/**
 * Dealer sets the true count by hand — a recount, a delivery not logged
 * through Incoming, damaged stock written off. Recorded as one adjustment
 * event carrying the difference, same as every other stock movement; never
 * overwrites the running total directly.
 */
export async function setStock(productId: string, newQty: number) {
  const tenantId = (await getMeta<string>('activeTenantId'))!;
  const userId = (await getMeta<string>('activeUserId'))!;
  const have = await stockOnHand(productId);
  const delta = Math.round((newQty - have) * 100) / 100;
  if (delta === 0) return;
  const row = {
    id: uid(), tenantId, productId, delta,
    reason: 'adjustment' as const, occurredAt: Date.now(), createdBy: userId,
  };
  await db.transaction('rw', [db.stockEvents, db.outbox, db.auditLog, db.meta], async () => {
    await db.stockEvents.add(row);
    await enqueue('stockEvent', 'insert', row);
    await audit('adjust_stock', 'product', productId, row);
  });
}

/** Class 2 edit: last write wins, and the superseded value is kept. */
export async function updateProductPrice(productId: string, price: number) {
  const deviceId = (await getMeta<string>('deviceId'))!;
  const p = await db.products.get(productId);
  if (!p || p.price === price) return;
  const now = Date.now();
  await db.transaction('rw', [db.products, db.fieldHistory, db.outbox, db.auditLog, db.meta], async () => {
    await db.fieldHistory.add({
      id: uid(), entity: 'product', entityId: productId, field: 'price',
      oldValue: String(p.price), newValue: String(price), changedAt: now, changedByDevice: deviceId,
    });
    await db.products.put({ ...p, price, updatedAt: now, updatedByDevice: deviceId });
    await db.outbox.add({ id: uid(), entity: 'product', op: 'update', payload: { productId, price }, createdAt: now, attempts: 0 });
    await db.auditLog.add({
      id: uid(), tenantId: p.tenantId, userId: (await getMeta<string>('activeUserId')) ?? '?', deviceId,
      action: 'price_change', entity: 'product', entityId: productId, before: { price: p.price }, after: { price }, deviceTime: now,
    });
  });
}

export async function placeOrder(opts: {
  tenantId: string;
  customerId: string;
  lines: { productId: string; qty: number }[];
  deliverBy?: number;
  deliverWindow?: string;
  note?: string;
}) {
  const now = Date.now();
  const orderId = uid();
  await db.transaction('rw', [db.orders, db.orderLines, db.orderEvents, db.outbox], async () => {
    await db.orders.add({
      id: orderId, tenantId: opts.tenantId, customerId: opts.customerId,
      placedAt: now, deliverBy: opts.deliverBy, deliverWindow: opts.deliverWindow, note: opts.note,
    });
    await db.orderLines.bulkAdd(
      opts.lines.filter((l) => l.qty > 0).map((l) => ({ id: uid(), orderId, productId: l.productId, qty: l.qty })),
    );
    await db.orderEvents.add({ id: uid(), orderId, status: 'placed', occurredAt: now, createdBy: opts.customerId });
    await db.outbox.add({ id: uid(), entity: 'order', op: 'insert', payload: { orderId }, createdAt: now, attempts: 0 });
  });
  return orderId;
}

/** Dealers group their own catalog — usually by supplying company. */
export async function addSegment(tenantId: string, name: string) {
  const deviceId = (await getMeta<string>('deviceId'))!;
  const existing = await db.segments.where('tenantId').equals(tenantId).toArray();
  const clash = existing.find((s) => s.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (clash) return clash.id;
  const id = uid();
  const row = {
    id, tenantId, name: name.trim(),
    sortOrder: existing.length ? Math.max(...existing.map((s) => s.sortOrder)) + 1 : 1,
    updatedAt: Date.now(), updatedByDevice: deviceId,
  };
  await db.segments.add(row);
  await enqueue('segment', 'insert', row);
  await audit('add_segment', 'segment', id, row);
  return id;
}

export async function renameSegment(segmentId: string, name: string) {
  const deviceId = (await getMeta<string>('deviceId'))!;
  const seg = await db.segments.get(segmentId);
  if (!seg || seg.name === name.trim() || !name.trim()) return;
  const now = Date.now();
  await db.transaction('rw', [db.segments, db.fieldHistory, db.outbox], async () => {
    await db.fieldHistory.add({
      id: uid(), entity: 'segment', entityId: segmentId, field: 'name',
      oldValue: seg.name, newValue: name.trim(), changedAt: now, changedByDevice: deviceId,
    });
    await db.segments.put({ ...seg, name: name.trim(), updatedAt: now, updatedByDevice: deviceId });
    await db.outbox.add({ id: uid(), entity: 'segment', op: 'update', payload: { segmentId, name: name.trim() }, createdAt: now, attempts: 0 });
  });
}

export async function addProduct(opts: {
  tenantId: string;
  segmentId: string;
  name: string;
  unit: string;
  price: number;
  lowStockAt: number;
  openingStock: number;
}) {
  const deviceId = (await getMeta<string>('deviceId'))!;
  const userId = (await getMeta<string>('activeUserId'))!;
  const id = uid();
  const now = Date.now();
  const row = {
    id, tenantId: opts.tenantId, segmentId: opts.segmentId, name: opts.name.trim(),
    unit: opts.unit.trim() || 'pc', price: opts.price, lowStockAt: opts.lowStockAt,
    updatedAt: now, updatedByDevice: deviceId,
  };
  await db.transaction('rw', [db.products, db.stockEvents, db.outbox, db.auditLog], async () => {
    await db.products.add(row);
    if (opts.openingStock > 0) {
      await db.stockEvents.add({
        id: uid(), tenantId: opts.tenantId, productId: id, delta: opts.openingStock,
        reason: 'adjustment', occurredAt: now, createdBy: userId,
      });
    }
    await db.outbox.add({ id: uid(), entity: 'product', op: 'insert', payload: row, createdAt: now, attempts: 0 });
    await db.auditLog.add({
      id: uid(), tenantId: opts.tenantId, userId, deviceId,
      action: 'add_product', entity: 'product', entityId: id, after: row, deviceTime: now,
    });
  });
  return id;
}

export async function addCustomer(opts: {
  tenantId: string;
  shopName: string;
  contactName: string;
  phone: string;
  pan: string;
  address: string;
  lat?: number;
  lng?: number;
}) {
  const deviceId = (await getMeta<string>('deviceId'))!;
  const id = uid();
  const now = Date.now();
  const row = {
    id,
    tenantId: opts.tenantId,
    shopName: opts.shopName.trim(),
    contactName: opts.contactName.trim(),
    phone: opts.phone.trim(),
    pan: opts.pan.trim(),
    address: opts.address.trim(),
    // 0,0 means "not pinned yet" - the route screen skips those rather than
    // dropping the shop in the Gulf of Guinea.
    lat: opts.lat ?? 0,
    lng: opts.lng ?? 0,
    updatedAt: now,
    updatedByDevice: deviceId,
  };
  await db.customers.add(row);
  await enqueue('customer', 'insert', row);
  await audit('add_customer', 'customer', id, row);
  return row;
}

/**
 * A shop is one business but a separate customer row per supplier it buys from.
 * Switching supplier finds that row, or registers the shop with the new supplier.
 */
export async function resolveCustomerForTenant(tenantId: string, phone: string) {
  const inTenant = await db.customers.where('tenantId').equals(tenantId).toArray();
  const found = inTenant.find((c) => c.phone === phone);
  if (found) return found;
  const profile = (await db.customers.toArray()).find((c) => c.phone === phone);
  if (!profile) return undefined;
  return addCustomer({
    tenantId,
    shopName: profile.shopName,
    contactName: profile.contactName,
    phone: profile.phone,
    pan: profile.pan,
    address: profile.address,
    lat: profile.lat,
    lng: profile.lng,
  });
}

/** Ask the phone where it is. Resolves undefined if refused or unavailable. */
export function currentPosition(): Promise<{ lat: number; lng: number } | undefined> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(undefined);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(undefined),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  });
}

/** Nepal reads times as 5 pm, not 17:00 - keep every screen on one clock. */
export function clock(at: number) {
  return new Date(at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
}

/** Date and time together, the way a bill or an order is stamped: "Bhadra 26 · 4:35 pm". */
export function stamp(at: number) {
  return `${bs(at).dayMonth} · ${clock(at)}`;
}

/** The same stamp on the invoice face, where the numeric BS date is the legal one. */
export function stampFull(at: number) {
  return `${bs(at).ymd} · ${clock(at)}`;
}

/** How a delivery deadline reads on a card: "in 3 h", "today by 5 pm", "2 h late". */
export function dueLabel(deliverBy?: number) {
  if (!deliverBy) return { text: 'no time set', tone: 'muted' as const };
  const diff = deliverBy - Date.now();
  const hours = diff / 3_600_000;
  const time = clock(deliverBy);
  if (diff < 0) {
    const late = Math.abs(hours);
    return { text: late < 1 ? 'late' : `${Math.floor(late)} h late`, tone: 'bad' as const };
  }
  if (hours < 1) return { text: `within ${Math.max(1, Math.round(diff / 60_000))} min`, tone: 'bad' as const };
  if (hours < 12) return { text: `within ${Math.floor(hours)} h · by ${time}`, tone: 'warn' as const };
  const day = new Date(deliverBy);
  const today = new Date(); today.setHours(23, 59, 59, 999);
  const word = day.getTime() <= today.getTime() ? 'today' : bs(deliverBy).dayMonth;
  return { text: `${word} by ${time}`, tone: 'muted' as const };
}

export { getMeta, setMeta };
