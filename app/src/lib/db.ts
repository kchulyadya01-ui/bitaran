import Dexie, { type Table } from 'dexie';

// ---------------------------------------------------------------------------
// Class 1 - append-only. Never updated, never deleted. See docs/architecture.md
// ---------------------------------------------------------------------------

export type PaymentType = 'cash' | 'credit';
export type OrderStatus = 'placed' | 'confirmed' | 'out_for_delivery' | 'delivered' | 'cancelled';

export const STATUS_RANK: Record<OrderStatus, number> = {
  placed: 1,
  confirmed: 2,
  out_for_delivery: 3,
  delivered: 4,
  cancelled: 99,
};

export interface Invoice {
  id: string;
  tenantId: string;
  number: string;
  fiscalYear: number;
  prefix: string;
  seq: number;
  customerId: string;
  orderId?: string;
  buyerPan: string;
  issuedAt: number;
  issuedBy: string;
  subtotal: number;
  vat: number;
  total: number;
  paymentType: PaymentType;
  status: 'issued' | 'cancelled';
  cancelReason?: string;
  cancelledAt?: number;
  printCount: number;
}

export interface InvoiceLine {
  id: string;
  invoiceId: string;
  productId: string;
  nameSnapshot: string;
  unitSnapshot: string;
  rateSnapshot: number;
  qty: number;
  lineTotal: number;
}

export interface Payment {
  id: string;
  tenantId: string;
  customerId: string;
  invoiceId?: string;
  amount: number;
  method: 'cash' | 'digital';
  collectedAt: number;
  collectedBy: string;
  reversesPaymentId?: string;
  note?: string;
}

export interface StockEvent {
  id: string;
  tenantId: string;
  productId: string;
  delta: number;
  reason: 'received' | 'sold' | 'adjustment' | 'damage';
  refId?: string;
  occurredAt: number;
  createdBy: string;
}

export interface OrderEvent {
  id: string;
  orderId: string;
  status: OrderStatus;
  occurredAt: number;
  createdBy: string;
  note?: string;
}

export interface AuditEntry {
  id: string;
  tenantId: string;
  userId: string;
  deviceId: string;
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  deviceTime: number;
}

// ---------------------------------------------------------------------------
// Class 2 - current state, last-write-wins, superseded values kept in history
// ---------------------------------------------------------------------------

export interface Tenant {
  id: string;
  name: string;
  pan: string;
  address: string;
  phone: string;
  vatRegistered: boolean;
  categories: string[];
}

export interface AppUser {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  role: 'owner' | 'partner' | 'staff' | 'rider';
  /** Billing series letter. Absent means this person cannot issue bills. */
  prefix?: string;
  /** Runs the van. Independent of billing — in a small firm the owners do both. */
  delivers?: boolean;
}

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  nameNp?: string;
  unit: string;
  price: number;
  segmentId: string;
  lowStockAt: number;
  updatedAt: number;
  updatedByDevice: string;
}

/**
 * A segment is how the dealer groups their catalog - usually the supplying
 * company or brand (Ben Nevis, Nova, Century), sometimes a product type.
 * Dealers create their own, so nothing here is hard-coded.
 */
export interface Segment {
  id: string;
  tenantId: string;
  name: string;
  sortOrder: number;
  updatedAt: number;
  updatedByDevice: string;
}

export interface Customer {
  id: string;
  tenantId: string;
  shopName: string;
  contactName: string;
  phone: string;
  pan: string;
  address: string;
  lat: number;
  lng: number;
  updatedAt: number;
  updatedByDevice: string;
}

export interface Order {
  id: string;
  tenantId: string;
  customerId: string;
  placedAt: number;
  /** Promised deadline: deliver on or before this moment. */
  deliverBy?: number;
  /** Human label for the promised window, e.g. "Tomorrow, by 2 pm". */
  deliverWindow?: string;
  note?: string;
}

export interface OrderLine {
  id: string;
  orderId: string;
  productId: string;
  qty: number;
}

export interface Incoming {
  id: string;
  tenantId: string;
  ref: string;
  expectedAt: number;
  timeConfirmed: boolean;
  status: 'ordered' | 'confirmed' | 'received';
  receivedAt?: number;
  note?: string;
}

export interface IncomingLine {
  id: string;
  incomingId: string;
  productId: string;
  qty: number;
}

export interface FieldHistory {
  id: string;
  entity: string;
  entityId: string;
  field: string;
  oldValue: string;
  newValue: string;
  changedAt: number;
  changedByDevice: string;
}

// Local only - never leaves the device as data, only as effects
export interface OutboxItem {
  id: string;
  entity: string;
  op: 'insert' | 'update';
  payload: unknown;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

export interface Meta {
  key: string;
  value: unknown;
}

export interface Counter {
  key: string; // `${tenantId}|${prefix}|${fiscalYear}`
  next: number;
}

class AppDb extends Dexie {
  invoices!: Table<Invoice, string>;
  invoiceLines!: Table<InvoiceLine, string>;
  payments!: Table<Payment, string>;
  stockEvents!: Table<StockEvent, string>;
  orderEvents!: Table<OrderEvent, string>;
  auditLog!: Table<AuditEntry, string>;
  tenants!: Table<Tenant, string>;
  users!: Table<AppUser, string>;
  products!: Table<Product, string>;
  segments!: Table<Segment, string>;
  customers!: Table<Customer, string>;
  orders!: Table<Order, string>;
  orderLines!: Table<OrderLine, string>;
  incoming!: Table<Incoming, string>;
  incomingLines!: Table<IncomingLine, string>;
  fieldHistory!: Table<FieldHistory, string>;
  outbox!: Table<OutboxItem, string>;
  meta!: Table<Meta, string>;
  counters!: Table<Counter, string>;

  constructor() {
    super('bitaran');
    this.version(1).stores({
      invoices: 'id, tenantId, customerId, number, issuedAt, status',
      invoiceLines: 'id, invoiceId, productId',
      payments: 'id, tenantId, customerId, invoiceId, collectedAt',
      stockEvents: 'id, tenantId, productId, occurredAt',
      orderEvents: 'id, orderId, occurredAt',
      auditLog: 'id, tenantId, entityId, deviceTime',
      tenants: 'id',
      users: 'id, tenantId',
      products: 'id, tenantId, category',
      customers: 'id, tenantId',
      orders: 'id, tenantId, customerId, placedAt',
      orderLines: 'id, orderId, productId',
      incoming: 'id, tenantId, expectedAt, status',
      incomingLines: 'id, incomingId',
      fieldHistory: 'id, entityId, changedAt',
      outbox: 'id, createdAt',
      meta: 'key',
      counters: 'key',
    });
    // v2: catalog grouped into dealer-defined segments; orders carry a delivery deadline.
    this.version(2).stores({
      segments: 'id, tenantId, sortOrder',
      products: 'id, tenantId, segmentId',
    });
  }
}

export const db = new AppDb();

export const uid = (): string =>
  // UUIDv7-ish: time-ordered prefix so rows sort by creation with no coordination
  Date.now().toString(16).padStart(12, '0') + '-' + Math.random().toString(16).slice(2, 14);

/** Every local write also lands in the outbox. Nothing leaves until a server exists. */
export async function enqueue(entity: string, op: 'insert' | 'update', payload: unknown) {
  await db.outbox.add({ id: uid(), entity, op, payload, createdAt: Date.now(), attempts: 0 });
}

export async function audit(action: string, entity: string, entityId: string, after?: unknown, before?: unknown) {
  const deviceId = (await getMeta<string>('deviceId')) ?? 'unknown';
  const userId = (await getMeta<string>('activeUserId')) ?? 'unknown';
  const tenantId = (await getMeta<string>('activeTenantId')) ?? 'unknown';
  await db.auditLog.add({
    id: uid(), tenantId, userId, deviceId, action, entity, entityId, before, after, deviceTime: Date.now(),
  });
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const row = await db.meta.get(key);
  return row?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown) {
  await db.meta.put({ key, value });
}
