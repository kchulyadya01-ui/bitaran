import { db, uid, setMeta, getMeta, type Product, type Customer, type Segment } from './db';
import { fiscalYearOf, formatInvoiceNumber, vatOf } from './domain';

const TENANT = 'tenant-gk';
const TENANT2 = 'tenant-manakamana';
const DAY = 86_400_000;
const HOUR = 3_600_000;

/** Bump when the seed shape changes, so old demo data is replaced rather than mixed. */
const SEED_VERSION = 6;

const SEGMENTS: Omit<Segment, 'tenantId' | 'updatedAt' | 'updatedByDevice'>[] = [
  { id: 'seg-bennevis', name: 'Ben Nevis', sortOrder: 1 },
  { id: 'seg-nova', name: 'Nova', sortOrder: 2 },
  { id: 'seg-century', name: 'Century', sortOrder: 3 },
];

// Placeholder catalog — replace the items and prices with the real ones per company.
const PRODUCTS: Omit<Product, 'tenantId' | 'updatedAt' | 'updatedByDevice'>[] = [
  { id: 'bn-cone', segmentId: 'seg-bennevis', name: 'Chocolate Cone', unit: 'pc', price: 80, lowStockAt: 50 },
  { id: 'bn-cup', segmentId: 'seg-bennevis', name: 'Vanilla Cup 100ml', unit: 'pc', price: 50, lowStockAt: 60 },
  { id: 'bn-chocobar', segmentId: 'seg-bennevis', name: 'Chocobar 60ml', nameNp: 'चकबार', unit: 'pc', price: 45, lowStockAt: 50 },
  { id: 'bn-kulfi', segmentId: 'seg-bennevis', name: 'Malai Kulfi 80ml', nameNp: 'कुल्फी', unit: 'pc', price: 60, lowStockAt: 40 },
  { id: 'bn-family', segmentId: 'seg-bennevis', name: 'Family Pack Vanilla 1L', unit: 'box', price: 420, lowStockAt: 20 },

  { id: 'nv-dolly', segmentId: 'seg-nova', name: 'Mango Dolly', unit: 'pc', price: 25, lowStockAt: 80 },
  { id: 'nv-kulfi', segmentId: 'seg-nova', name: 'Kulfi Stick', unit: 'pc', price: 40, lowStockAt: 50 },
  { id: 'nv-butterscotch', segmentId: 'seg-nova', name: 'Butterscotch Cup 100ml', unit: 'pc', price: 55, lowStockAt: 40 },
  { id: 'nv-family', segmentId: 'seg-nova', name: 'Family Pack Strawberry 1L', unit: 'box', price: 400, lowStockAt: 15 },

  { id: 'ct-chicken', segmentId: 'seg-century', name: 'Chicken Noodles 75g', unit: 'pkt', price: 25, lowStockAt: 100 },
  { id: 'ct-veg', segmentId: 'seg-century', name: 'Veg Noodles 75g', unit: 'pkt', price: 22, lowStockAt: 100 },
  { id: 'ct-munch', segmentId: 'seg-century', name: 'Masala Munch 40g', unit: 'pkt', price: 20, lowStockAt: 60 },
  { id: 'ct-chips', segmentId: 'seg-century', name: 'Salted Chips 52g', unit: 'pkt', price: 55, lowStockAt: 60 },
];

/** A second distributor, so "choose your supplier" is a real choice. */
const SEGMENTS2: Omit<Segment, 'tenantId' | 'updatedAt' | 'updatedByDevice'>[] = [
  { id: 'seg2-nebico', name: 'Nebico', sortOrder: 1 },
  { id: 'seg2-sujal', name: 'Sujal', sortOrder: 2 },
];

const PRODUCTS2: Omit<Product, 'tenantId' | 'updatedAt' | 'updatedByDevice'>[] = [
  { id: 'nb-glucose', segmentId: 'seg2-nebico', name: 'Glucose Biscuit 100g', unit: 'pkt', price: 30, lowStockAt: 80 },
  { id: 'nb-coconut', segmentId: 'seg2-nebico', name: 'Coconut Crunch 120g', unit: 'pkt', price: 45, lowStockAt: 60 },
  { id: 'nb-thin', segmentId: 'seg2-nebico', name: 'Thin Arrowroot 200g', unit: 'pkt', price: 60, lowStockAt: 40 },
  { id: 'sj-cone', segmentId: 'seg2-sujal', name: 'Choco Cone', unit: 'pc', price: 75, lowStockAt: 50 },
  { id: 'sj-cup', segmentId: 'seg2-sujal', name: 'Strawberry Cup 100ml', unit: 'pc', price: 50, lowStockAt: 50 },
  { id: 'sj-family', segmentId: 'seg2-sujal', name: 'Family Pack Butterscotch 1L', unit: 'box', price: 430, lowStockAt: 15 },
];

const CUSTOMERS: Omit<Customer, 'tenantId' | 'updatedAt' | 'updatedByDevice'>[] = [
  { id: 'c-shyam', shopName: 'Shyam Kirana Pasal', contactName: 'Shyam Prasad', phone: '9841000101', pan: '601234567', address: 'Byasi, Bhaktapur', lat: 27.6745, lng: 85.4310 },
  { id: 'c-sagarmatha', shopName: 'Sagarmatha Store', contactName: 'Anil Basnet', phone: '9841000102', pan: '601234568', address: 'Sallaghari', lat: 27.6768, lng: 85.4215 },
  { id: 'c-nyatapola', shopName: 'Nyatapola Cold Store', contactName: 'Rita Prajapati', phone: '9841000103', pan: '601234569', address: 'Taumadhi', lat: 27.6710, lng: 85.4285 },
  { id: 'c-durbar', shopName: 'Durbar Square Snacks', contactName: 'Hari Suwal', phone: '9841000104', pan: '601234570', address: 'Durbar Square', lat: 27.6722, lng: 85.4280 },
  { id: 'c-dairy', shopName: 'Bhaktapur Dairy Corner', contactName: 'Kamal Duwal', phone: '9841000105', pan: '601234571', address: 'Kamalbinayak', lat: 27.6790, lng: 85.4360 },
  { id: 'c-taumadhi', shopName: 'Taumadhi Mart', contactName: 'Sunita Karmacharya', phone: '9841000106', pan: '601234572', address: 'Taumadhi Tole', lat: 27.6715, lng: 85.4292 },
  { id: 'c-surya', shopName: 'Suryabinayak Traders', contactName: 'Bijay Lama', phone: '9841000107', pan: '601234573', address: 'Suryabinayak', lat: 27.6620, lng: 85.4295 },
  { id: 'c-thimi', shopName: 'Thimi Fresh House', contactName: 'Nabin Shrestha', phone: '9841000108', pan: '601234574', address: 'Madhyapur Thimi', lat: 27.6810, lng: 85.3860 },
  { id: 'c-dattatreya', shopName: 'Dattatreya Kirana', contactName: 'Prakash Banmala', phone: '9841000109', pan: '601234575', address: 'Dattatreya Square', lat: 27.6735, lng: 85.4305 },
  { id: 'c-byasi', shopName: 'Byasi Chowk Shop', contactName: 'Gita Twayana', phone: '9841000110', pan: '601234576', address: 'Byasi Chowk', lat: 27.6758, lng: 85.4330 },
];

/** Delivery promise slots the customer chooses from. `endHour` is the deadline. */
export const SLOTS = [
  { id: 'morning', label: 'Morning', range: '8 am – 11 am', endHour: 11 },
  { id: 'midday', label: 'Midday', range: '11 am – 2 pm', endHour: 14 },
  { id: 'afternoon', label: 'Afternoon', range: '2 pm – 5 pm', endHour: 17 },
  { id: 'evening', label: 'Evening', range: '5 pm – 8 pm', endHour: 20 },
];

export function deadlineFor(dayOffset: number, slotId: string): { at: number; label: string } {
  const slot = SLOTS.find((s) => s.id === slotId) ?? SLOTS[1];
  const d = new Date(Date.now() + dayOffset * DAY);
  d.setHours(slot.endHour, 0, 0, 0);
  const dayWord = dayOffset === 0 ? 'Today' : dayOffset === 1 ? 'Tomorrow' : d.toLocaleDateString([], { weekday: 'long' });
  return { at: d.getTime(), label: `${dayWord}, by ${slot.range.split('–')[1].trim()}` };
}

let seeding: Promise<void> | null = null;

/** React StrictMode mounts twice; without this guard both runs race and Dexie throws. */
export function seedIfEmpty(): Promise<void> {
  seeding ??= doSeed();
  return seeding;
}

async function doSeed() {
  if (!(await getMeta<string>('deviceId'))) {
    await setMeta('deviceId', 'device-' + uid().slice(-6));
  }

  const version = await getMeta<number>('seedVersion');
  const already = await db.tenants.count();

  if (already > 0 && version === SEED_VERSION) {
    await setMeta('activeTenantId', TENANT);
    if (!(await getMeta<string>('activeUserId'))) await setMeta('activeUserId', 'u-ramesh');
    if (!(await getMeta<string>('activeCustomerId'))) await setMeta('activeCustomerId', 'c-shyam');
    if (!(await getMeta<string>('customerTenantId'))) await setMeta('customerTenantId', TENANT);
    if (!(await getMeta<string>('shopPhone'))) await setMeta('shopPhone', CUSTOMERS[0].phone);
    return;
  }

  // Demo data only — no real bills exist yet, so replacing it wholesale is safe.
  if (already > 0) {
    await Promise.all(db.tables.filter((t) => t.name !== 'meta').map((t) => t.clear()));
  }

  const now = Date.now();
  const deviceId = (await getMeta<string>('deviceId'))!;
  const stamp = { tenantId: TENANT, updatedAt: now, updatedByDevice: deviceId };

  await db.tenants.add({
    id: TENANT,
    name: 'G.K Suppliers Pvt. Ltd.',
    pan: '301122334',
    address: 'Kamalbinayak, Bhaktapur',
    phone: '01-6612345',
    vatRegistered: true,
    categories: SEGMENTS.map((s) => s.name),
  });

  await db.users.bulkAdd([
    { id: 'u-ramesh', tenantId: TENANT, name: 'Krishna Gopal Chulyadya', phone: '9851000042', role: 'owner', prefix: 'A', delivers: true },
    { id: 'u-sita', tenantId: TENANT, name: 'Gyanendra Manandhar', phone: '9841100007', role: 'owner', prefix: 'B', delivers: true },
    { id: 'u-kiran', tenantId: TENANT, name: 'Saraswoti Joshi', phone: '9808100011', role: 'staff', prefix: 'C' },
  ]);

  await db.segments.bulkAdd(SEGMENTS.map((s) => ({ ...s, ...stamp })));
  await db.products.bulkAdd(PRODUCTS.map((p) => ({ ...p, ...stamp })));
  await db.customers.bulkAdd(CUSTOMERS.map((c) => ({ ...c, ...stamp })));

  // Opening stock, as one received shipment 6 days ago. Masala Munch is deliberately
  // at zero so the out-of-stock and incoming-shipment states are visible.
  const opening: Record<string, number> = {
    'bn-cone': 360, 'bn-cup': 220, 'bn-chocobar': 76, 'bn-kulfi': 170, 'bn-family': 94,
    'nv-dolly': 480, 'nv-kulfi': 260, 'nv-butterscotch': 150, 'nv-family': 60,
    'ct-chicken': 720, 'ct-veg': 540, 'ct-munch': 0, 'ct-chips': 300,
  };
  await db.stockEvents.bulkAdd(
    Object.entries(opening)
      .filter(([, qty]) => qty > 0)
      .map(([productId, qty]) => ({
        id: uid(), tenantId: TENANT, productId, delta: qty,
        reason: 'received' as const, occurredAt: now - 6 * DAY, createdBy: 'u-ramesh',
      })),
  );

  // Open customer orders, each with a promised delivery deadline.
  const openOrders: { customerId: string; lines: [string, number][]; agoMin: number; dayOffset: number; slot: string }[] = [
    { customerId: 'c-shyam', lines: [['bn-cone', 24], ['ct-chicken', 10], ['ct-chips', 6]], agoMin: 180, dayOffset: 0, slot: 'afternoon' },
    { customerId: 'c-sagarmatha', lines: [['bn-chocobar', 20], ['ct-veg', 30]], agoMin: 140, dayOffset: 0, slot: 'evening' },
    { customerId: 'c-nyatapola', lines: [['bn-family', 12], ['bn-kulfi', 40], ['bn-cone', 60]], agoMin: 95, dayOffset: 1, slot: 'morning' },
    { customerId: 'c-durbar', lines: [['nv-dolly', 40], ['ct-munch', 10]], agoMin: 40, dayOffset: 1, slot: 'midday' },
  ];
  for (const o of openOrders) {
    const orderId = uid();
    const due = deadlineFor(o.dayOffset, o.slot);
    await db.orders.add({
      id: orderId, tenantId: TENANT, customerId: o.customerId,
      placedAt: now - o.agoMin * 60_000,
      deliverBy: due.at, deliverWindow: due.label,
    });
    await db.orderLines.bulkAdd(o.lines.map(([productId, qty]) => ({ id: uid(), orderId, productId, qty })));
    await db.orderEvents.add({ id: uid(), orderId, status: 'placed', occurredAt: now - o.agoMin * 60_000, createdBy: o.customerId });
  }

  // Older credit bills, so the dues ledger has something real in it.
  const history: { customerId: string; daysAgo: number; lines: [string, number][]; paid?: number }[] = [
    { customerId: 'c-nyatapola', daysAgo: 62, lines: [['bn-family', 30], ['bn-cone', 120]] },
    { customerId: 'c-byasi', daysAgo: 41, lines: [['ct-chicken', 200], ['ct-chips', 60]] },
    { customerId: 'c-shyam', daysAgo: 22, lines: [['bn-cone', 60], ['bn-chocobar', 40]] },
    { customerId: 'c-thimi', daysAgo: 9, lines: [['nv-kulfi', 50], ['ct-veg', 80]] },
    { customerId: 'c-taumadhi', daysAgo: 4, lines: [['nv-dolly', 60], ['ct-chicken', 40]], paid: 1000 },
  ];
  const fy = fiscalYearOf();
  let seq = 1;
  for (const h of history) {
    const at = now - h.daysAgo * DAY;
    const id = uid();
    const priced = h.lines.map(([productId, qty]) => {
      const p = PRODUCTS.find((x) => x.id === productId)!;
      return { productId, qty, name: p.name, unit: p.unit, rate: p.price, lineTotal: qty * p.price };
    });
    const subtotal = priced.reduce((s, l) => s + l.lineTotal, 0);
    const vat = vatOf(subtotal);
    const cust = CUSTOMERS.find((c) => c.id === h.customerId)!;
    await db.invoices.add({
      id, tenantId: TENANT, number: formatInvoiceNumber('A', fy, seq), fiscalYear: fy, prefix: 'A', seq,
      customerId: h.customerId, buyerPan: cust.pan, issuedAt: at, issuedBy: 'u-ramesh',
      subtotal, vat, total: Math.round((subtotal + vat) * 100) / 100,
      paymentType: 'credit', status: 'issued', printCount: 1,
    });
    await db.invoiceLines.bulkAdd(priced.map((l) => ({
      id: uid(), invoiceId: id, productId: l.productId, nameSnapshot: l.name,
      unitSnapshot: l.unit, rateSnapshot: l.rate, qty: l.qty, lineTotal: l.lineTotal,
    })));
    await db.stockEvents.bulkAdd(priced.map((l) => ({
      id: uid(), tenantId: TENANT, productId: l.productId, delta: -l.qty,
      reason: 'sold' as const, refId: id, occurredAt: at, createdBy: 'u-ramesh',
    })));
    if (h.paid) {
      await db.payments.add({
        id: uid(), tenantId: TENANT, customerId: h.customerId, invoiceId: id,
        amount: h.paid, method: 'cash', collectedAt: at + DAY, collectedBy: 'u-ramesh',
      });
    }
    seq += 1;
  }
  await db.counters.put({ key: `${TENANT}|A|${fy}`, next: seq });

  // Incoming from the Main Dealer, per supplying company.
  const incomings: { ref: string; inDays: number; hour: number; status: 'ordered' | 'confirmed'; timeConfirmed: boolean; lines: [string, number][]; note?: string }[] = [
    { ref: 'CENTURY/2083/0412', inDays: 0, hour: 14.5, status: 'confirmed', timeConfirmed: true, lines: [['ct-munch', 40], ['ct-chicken', 300], ['ct-chips', 120]] },
    { ref: 'BENNEVIS/2083/0418', inDays: 2, hour: 10, status: 'confirmed', timeConfirmed: false, lines: [['bn-cone', 240], ['bn-chocobar', 200], ['bn-family', 48]] },
    { ref: 'NOVA/2083/0421', inDays: 6, hour: 11, status: 'ordered', timeConfirmed: false, lines: [['nv-dolly', 400], ['nv-kulfi', 200]], note: 'Monthly Nova restock' },
  ];
  for (const inc of incomings) {
    const id = uid();
    const at = new Date(now + inc.inDays * DAY);
    at.setHours(Math.floor(inc.hour), (inc.hour % 1) * 60, 0, 0);
    await db.incoming.add({
      id, tenantId: TENANT, ref: inc.ref, expectedAt: at.getTime(),
      timeConfirmed: inc.timeConfirmed, status: inc.status, note: inc.note,
    });
    await db.incomingLines.bulkAdd(inc.lines.map(([productId, qty]) => ({ id: uid(), incomingId: id, productId, qty })));
  }

  // Second distributor: its own PAN, address, catalog and stock. No customers of
  // its own yet — a shop registers with it the first time it orders.
  await db.tenants.add({
    id: TENANT2,
    name: 'Manakamana Traders Pvt. Ltd.',
    pan: '302233445',
    address: 'Thimi-7, Bhaktapur',
    phone: '01-6634567',
    vatRegistered: true,
    categories: SEGMENTS2.map((x) => x.name),
  });
  await db.users.add({ id: 'u2-owner', tenantId: TENANT2, name: 'Deepak Shrestha', phone: '9851200088', role: 'owner', prefix: 'A' });
  const stamp2 = { tenantId: TENANT2, updatedAt: now, updatedByDevice: deviceId };
  await db.segments.bulkAdd(SEGMENTS2.map((x) => ({ ...x, ...stamp2 })));
  await db.products.bulkAdd(PRODUCTS2.map((x) => ({ ...x, ...stamp2 })));
  await db.stockEvents.bulkAdd(
    PRODUCTS2.map((x) => ({
      id: uid(), tenantId: TENANT2, productId: x.id, delta: 200,
      reason: 'received' as const, occurredAt: now - 4 * DAY, createdBy: 'u2-owner',
    })),
  );

  await setMeta('seedVersion', SEED_VERSION);
  await setMeta('activeTenantId', TENANT);
  await setMeta('activeUserId', 'u-ramesh');
  await setMeta('activeCustomerId', 'c-shyam');
  await setMeta('shopPhone', CUSTOMERS[0].phone);
  await setMeta('customerTenantId', TENANT);
  void HOUR;
}

export async function resetAll() {
  await db.delete();
  location.reload();
}
