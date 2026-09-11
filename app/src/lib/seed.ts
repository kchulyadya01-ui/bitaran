import { db, uid, setMeta, getMeta, type Product, type Customer } from './db';
import { fiscalYearOf, formatInvoiceNumber, vatOf } from './domain';

const TENANT = 'tenant-himal';
const DAY = 86_400_000;

const PRODUCTS: Omit<Product, 'tenantId' | 'updatedAt' | 'updatedByDevice'>[] = [
  { id: 'p-cornetto', name: 'Cornetto Choco Vanilla', nameNp: 'कर्नेटो', unit: 'pc', price: 80, category: 'Ice cream', lowStockAt: 50 },
  { id: 'p-chocobar', name: 'Chocobar 60ml', nameNp: 'चकबार', unit: 'pc', price: 45, category: 'Ice cream', lowStockAt: 50 },
  { id: 'p-family', name: 'Family Pack Vanilla 1L', unit: 'box', price: 420, category: 'Ice cream', lowStockAt: 20 },
  { id: 'p-kulfi', name: 'Malai Kulfi 80ml', nameNp: 'कुल्फी', unit: 'pc', price: 60, category: 'Ice cream', lowStockAt: 40 },
  { id: 'p-waiwai', name: 'Wai Wai Chicken 75g', unit: 'pkt', price: 25, category: 'Noodles', lowStockAt: 100 },
  { id: 'p-lays', name: 'Lays Classic Salted 52g', unit: 'pkt', price: 55, category: 'Snacks', lowStockAt: 60 },
  { id: 'p-kurkure', name: 'Kurkure Masala Munch', unit: 'pkt', price: 20, category: 'Snacks', lowStockAt: 60 },
  { id: 'p-current', name: 'Current Noodles 70g', unit: 'pkt', price: 20, category: 'Noodles', lowStockAt: 100 },
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
  const already = await db.tenants.count();
  if (already > 0) {
    await setMeta('activeTenantId', TENANT);
    if (!(await getMeta<string>('activeUserId'))) await setMeta('activeUserId', 'u-ramesh');
    if (!(await getMeta<string>('activeCustomerId'))) await setMeta('activeCustomerId', 'c-shyam');
    return;
  }

  const now = Date.now();
  const deviceId = (await getMeta<string>('deviceId'))!;

  await db.tenants.add({
    id: TENANT,
    name: 'Himal Distributors Pvt. Ltd.',
    pan: '301122334',
    address: 'Suryabinayak-4, Bhaktapur',
    phone: '01-6612345',
    vatRegistered: true,
    categories: ['Ice cream', 'Snacks', 'Noodles'],
  });

  await db.users.bulkAdd([
    { id: 'u-ramesh', tenantId: TENANT, name: 'Ramesh Shrestha', phone: '9851000042', role: 'owner', prefix: 'A' },
    { id: 'u-sita', tenantId: TENANT, name: 'Sita Karmacharya', phone: '9841100007', role: 'partner', prefix: 'B' },
    { id: 'u-kiran', tenantId: TENANT, name: 'Kiran Suwal', phone: '9808100011', role: 'staff', prefix: 'C' },
    { id: 'u-bibek', tenantId: TENANT, name: 'Bibek Duwal', phone: '9818100022', role: 'rider' },
  ]);

  await db.products.bulkAdd(PRODUCTS.map((p) => ({ ...p, tenantId: TENANT, updatedAt: now, updatedByDevice: deviceId })));
  await db.customers.bulkAdd(CUSTOMERS.map((c) => ({ ...c, tenantId: TENANT, updatedAt: now, updatedByDevice: deviceId })));

  // Opening stock, as one received shipment 6 days ago.
  // Sized so the older credit bills below do not drain everything to zero.
  const opening: Record<string, number> = {
    'p-cornetto': 360, 'p-chocobar': 76, 'p-family': 94, 'p-kulfi': 170,
    'p-waiwai': 720, 'p-lays': 300, 'p-kurkure': 0, 'p-current': 340,
  };
  await db.stockEvents.bulkAdd(
    Object.entries(opening)
      .filter(([, qty]) => qty > 0)
      .map(([productId, qty]) => ({
        id: uid(), tenantId: TENANT, productId, delta: qty,
        reason: 'received' as const, occurredAt: now - 6 * DAY, createdBy: 'u-ramesh',
      })),
  );

  // A few open customer orders waiting to be billed.
  const openOrders: { customerId: string; lines: [string, number][]; agoMin: number }[] = [
    { customerId: 'c-shyam', lines: [['p-cornetto', 24], ['p-waiwai', 10], ['p-lays', 6]], agoMin: 180 },
    { customerId: 'c-sagarmatha', lines: [['p-chocobar', 20], ['p-current', 30]], agoMin: 140 },
    { customerId: 'c-nyatapola', lines: [['p-family', 12], ['p-kulfi', 40], ['p-cornetto', 60]], agoMin: 95 },
    { customerId: 'c-durbar', lines: [['p-lays', 12], ['p-kurkure', 10]], agoMin: 40 },
  ];
  for (const o of openOrders) {
    const orderId = uid();
    await db.orders.add({ id: orderId, tenantId: TENANT, customerId: o.customerId, placedAt: now - o.agoMin * 60_000 });
    await db.orderLines.bulkAdd(o.lines.map(([productId, qty]) => ({ id: uid(), orderId, productId, qty })));
    await db.orderEvents.add({ id: uid(), orderId, status: 'placed', occurredAt: now - o.agoMin * 60_000, createdBy: o.customerId });
  }

  // Older credit bills, so the dues ledger has something real in it.
  const history: { customerId: string; daysAgo: number; lines: [string, number][]; paid?: number }[] = [
    { customerId: 'c-nyatapola', daysAgo: 62, lines: [['p-family', 30], ['p-cornetto', 120]] },
    { customerId: 'c-byasi', daysAgo: 41, lines: [['p-waiwai', 200], ['p-lays', 60]] },
    { customerId: 'c-shyam', daysAgo: 22, lines: [['p-cornetto', 60], ['p-chocobar', 40]] },
    { customerId: 'c-thimi', daysAgo: 9, lines: [['p-kulfi', 50], ['p-current', 80]] },
    { customerId: 'c-taumadhi', daysAgo: 4, lines: [['p-lays', 30], ['p-waiwai', 40]], paid: 1000 },
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

  // Incoming from the Main Dealer.
  const incomings: { ref: string; inDays: number; status: 'ordered' | 'confirmed'; timeConfirmed: boolean; lines: [string, number][]; note?: string }[] = [
    { ref: 'MD/2083/0412', inDays: 0, status: 'confirmed', timeConfirmed: true, lines: [['p-kurkure', 40], ['p-chocobar', 300], ['p-family', 48]] },
    { ref: 'MD/2083/0418', inDays: 2, status: 'confirmed', timeConfirmed: false, lines: [['p-cornetto', 240], ['p-lays', 120], ['p-waiwai', 360]] },
    { ref: 'MD/2083/0421', inDays: 6, status: 'ordered', timeConfirmed: false, lines: [['p-kulfi', 200], ['p-current', 400]], note: 'Monthly ice cream restock' },
  ];
  for (const inc of incomings) {
    const id = uid();
    const at = new Date(now + inc.inDays * DAY);
    at.setHours(14, 30, 0, 0);
    await db.incoming.add({
      id, tenantId: TENANT, ref: inc.ref, expectedAt: at.getTime(),
      timeConfirmed: inc.timeConfirmed, status: inc.status, note: inc.note,
    });
    await db.incomingLines.bulkAdd(inc.lines.map(([productId, qty]) => ({ id: uid(), incomingId: id, productId, qty })));
  }

  await setMeta('activeTenantId', TENANT);
  await setMeta('activeUserId', 'u-ramesh');
  await setMeta('activeCustomerId', 'c-shyam');
}

export async function resetAll() {
  await db.delete();
  location.reload();
}
