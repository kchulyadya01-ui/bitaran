# What is built, and what is left

Date: 2026-09-11

## Built and working

Everything below runs against IndexedDB on the device, with no network.

**Choosing a side**
- First run asks whether you supply shops or run one, and the whole app follows: navigation, skin and what you can reach. Changeable from More / Account.

**Dealer**
- Today's orders, filtered by state, with live counts, the day's figures, and each order's delivery deadline ("deliver within 1 h · by 5 pm", red once late)
- Billing: pick a shop, quantity steppers, VAT computed live, cash/credit, existing-debt warning, stock warnings
- Tax invoice: seller name and PAN, sequential number in the device's own series, Bikram Sambat date, buyer name and PAN, line items, taxable amount, 13% VAT, total, amount in words, ORIGINAL / COPY OF ORIGINAL stamp
- Delivery route: stops ordered by nearest-neighbour from the depot using real customer coordinates, tick to mark delivered
- Stock and prices grouped into **segments** the dealer defines — usually the supplying company (Ben Nevis, Nova, Century), sometimes a type. Add a segment, rename one, add an item with its price, unit, opening stock and low-stock threshold. Tap a price to change it (old value kept in history)
- Add a customer mid-bill: shop name, buyer PAN, owner, phone, area, and a GPS pin taken at the shop
- Incoming stock: what is coming and when; marking received posts stock events
- Dues ledger: balances summed from invoices minus payments, ageing bands, record a payment
- Reports: 7-day sales chart, best sellers, dues summary, CSV export for the accountant
- Sync queue: every queued write, visible and named
- Switch between team members — which changes the invoice series letter

**Customer**
- Choose which supplier to order from — name, address and PAN shown — and the catalog, prices and stock switch with it. A shop registers itself with a supplier the first time it orders from them
- Catalog with real stock awareness (out-of-stock items are shown, not hidden), grouped by the supplier's segments
- Place an order with a promised window: pick a day, then Morning / Midday / Afternoon / Evening. Past slots are disabled. The dealer sees that deadline on the order and on the route
- The draft survives a reload, so a dropped connection loses nothing
- Track status through the four states
- Bills and outstanding balance

**Platform**
- Installable PWA, precached app shell, works fully offline after first load
- Append-only financial events; balances and stock are always derived, never stored
- Every write also queues in the outbox
- Order status advances by rank and never retreats
- Invoice counter is transactional and per device, per fiscal year

---

## What is left

### 1. There is no server — this is the big one

The outbox fills and never drains. Every device is an island: two phones cannot see each
other's orders, bills or payments, because there is nothing between them.

Needed: Supabase project, Postgres schema mirroring `src/lib/db.ts`, Row Level Security
keyed on `tenant_id`, a `server_seq` column, and the push/pull worker described in
`architecture.md` section 5. The client side is already shaped for it — idempotent
client-generated keys, outbox rows, cursor in `meta` — so this is server work plus a
drain loop, not a rewrite.

**Until this lands, the app is a single-device tool.**

### 2. No authentication

"Switch person" in More is a development affordance, not a login. Needed: real sign-in
(phone or email), server-enforced roles (`owner` / `biller` / `rider`), and customer
accounts. Tenant isolation currently exists only as a `tenantId` on every row and in every
query — with no server there is nothing enforcing it.

### 3. Multi-tenant is schema-deep, not flow-deep

Every table carries `tenantId` and every query is scoped by it, but there is one hard-coded
business and no signup. Needed: the signup flow from the designs, tenant provisioning, and
per-tenant invoice-prefix assignment.

### 4. Remaining create/edit gaps

Adding a customer, a segment and a product all work now. Still missing: editing or removing
an existing customer or product, and logging a new incoming shipment from the Main Dealer
(receiving one works). A product also cannot be moved between segments, and a segment cannot
be deleted or reordered.

### 5. Invoice cancellation and credit notes

The data model supports it (`status`, `cancelReason`, `reversesPaymentId`) and Procedure 2072
requires corrections to be adjustments rather than deletions. There is no UI. Returns of
melted or damaged stock have nowhere to go — ask the accountant for the correct document
first (question 5 in `compliance-nepal.md`).

### 6. Reprint counting is approximate

`printCount` increments every time the invoice screen is opened, not when the bill is
actually printed or shared. Procedure 2072 cares about print count, so this should move to
the print/share action.

### 7. The audit log has no viewer

It is written on every meaningful action, but Procedure 2072 wants it viewable and printable
per user. Needs a screen.

### 8. The map is schematic

Stops are plotted from real latitude and longitude and the route order is genuine, but there
are no OpenStreetMap tiles, no offline tile cache for the service area, and no hand-off to a
navigation app. Leaflet plus a cached tile bounding box is the plan in `architecture.md`.

### 9. Receipts share as text

Sharing sends a formatted text message via the Web Share API, falling back to a WhatsApp deep
link. A shop owner will want the actual bill image or PDF. Needs the invoice rendered to
PNG/PDF on device and shared as a file.

### 10. Language

Some labels are bilingual, but there is no i18n layer and no language switch. Nepali-first
users cannot use the app in Nepali today.

### 11. Storage persistence is requested but not verified

The app calls `navigator.storage.persist()` on first run. If iOS denies it, IndexedDB can be
evicted after about a week of not opening the app, and there is currently no warning. Needs a
check plus a visible warning, and it needs testing on the partners' actual phones.

### 12. Backup and restore

Procedure 2072 requires recoverable backups. Only a sales CSV export exists. Needs a full
local export and re-import, independent of the server.

### 13. No tests

None. The parts that most deserve them: invoice numbering under concurrency, VAT rounding,
balance and stock derivation, and status-rank resolution.

---

## Suggested order

1. Server + sync + auth (items 1–2) — nothing else is real until two phones agree
2. Cancellation and credit notes (item 5) — needed before real billing, and the accountant's answer gates it
3. Edit/remove for customers and products (item 4)
4. Receipt as an image (item 9), audit log viewer (item 7), tests (item 13)
5. Real map tiles (item 8), language (item 10)

Still open from before, and cheap to close: which phones the partners use, the business PAN,
and the five questions in `compliance-nepal.md`.
