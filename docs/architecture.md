# Architecture Decisions

Status: draft for review
Date: 2026-09-11
Scope: settles the four unresolved questions that change the shape of the code, before any code is written.

---

## 0. Summary of decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | Platform | Installable PWA (React + Vite + TypeScript). Not React Native. |
| 2 | Invoice numbering across two offline devices | Per-device invoice series with a fixed prefix, reset each Nepali fiscal year. |
| 3 | IRD e-billing / CBMS | Not required at this turnover, but build to the Computerized Invoicing Procedure 2072 rules from day one so approval is possible later without a rewrite. |
| 4 | Conflict resolution | Append-only event log for anything financial. Last-write-wins only for genuinely editable descriptive fields. Never for money. |
| 5 | Local store | IndexedDB via Dexie, treated as source of truth on the Dealer device. |
| 6 | Server | Supabase (Postgres + Auth + Row Level Security). Sync is a custom outbox/cursor protocol, not Supabase realtime replication. |
| 7 | Maps | Leaflet + OpenStreetMap tiles, pre-cached for the service area. No Google Maps. |

---

## 1. Platform: PWA

The brief allows either a cross-platform native app or a PWA. Choosing PWA.

Reasons:
- The same build serves the "mobile-first, also works as a website" requirement. A native app would need a separate web build.
- Retail shop owners install from a link. No app store account, no review delay, no 40 MB download over a weak connection.
- IndexedDB plus a service worker meets every offline requirement in the brief. The Dealer app is data entry and lists, not something that needs native APIs.
- Updates ship instantly, which matters while VAT rules or the Main Dealer's process are still moving.

What we give up, and the mitigation:
- **Background sync while the app is closed.** iOS does not support the Background Sync API. Mitigation: sync runs on app focus, on `online` events, and on a visible "Sync now" button. The Dealer opens the app several times a day, so this is enough. Data is never at risk — it stays in the outbox until it goes.
- **iOS storage eviction.** Safari can evict IndexedDB after ~7 days of no use. Mitigation: request `navigator.storage.persist()` on first run, and warn loudly in the UI if it is denied. If the two partners are on Android, this risk is close to zero — confirm which phones they use.
- **Push notifications on iOS** require the PWA to be installed to the home screen. Acceptable; the Dealer will install it.

Reconsider native only if: the phones turn out to be iPhones *and* storage persistence is denied, or if a barcode scanner becomes a core daily flow.

---

## 2. Invoice numbering across two offline devices

### The problem

Two partners, two phones, both potentially offline, both issuing tax invoices. A single shared counter cannot work: if both devices are offline and each issues "Invoice 47", two different customers hold two different documents with the same legal number. That is unrecoverable after the fact, because the paper is already with the customer.

### Options considered

**A. Server assigns the number at sync time.** Rejected. The invoice is printed or shared at the customer's shop, offline, at the moment of sale. It must carry its final number then. A number that changes later is not a tax invoice.

**B. Server pre-allocates blocks of numbers to each device.** Each device is handed, say, numbers 1–100 while online, and consumes them offline. Keeps one unified series. The cost is gaps: if device A syncs after using 30 of its 100, numbers 31–100 are dead. Gaps in a VAT invoice series are exactly what an auditor asks about, and every gap needs explaining.

**C. Per-device series with a fixed prefix.** Each device owns its own unbroken sequence:

```
A-2082-0001, A-2082-0002, A-2082-0003, ...   (partner 1's phone)
B-2082-0001, B-2082-0002, ...                (partner 2's phone)
```

No collisions, no gaps, no coordination needed, and it works with zero connectivity forever. This is the same shape as issuing separate physical bill books to two salespeople, which is a long-established and accepted practice.

### Decision: Option C

Rules:
- The device prefix is assigned once, at device registration, and is stored server-side. A device cannot pick its own prefix.
- The sequence is strictly incrementing with no gaps, per device, per Nepali fiscal year (Shrawan 1 to Ashar end). It resets to 0001 at the start of each fiscal year.
- The counter lives in IndexedDB and is incremented inside the same transaction that writes the invoice. It can never be edited from the UI.
- A cancelled invoice **keeps its number**. It is never reused and never removed. See section 4.
- Fiscal year is embedded in the number so the series is self-describing at audit.

### Action required before launch

**The two series must be declared to the tax office.** A tax officer seeing two parallel series needs to know both belong to this business and why. This is a form-and-conversation task, not a code task, and it is cheap to do up front and expensive to fix after six months of bills. Listed as an open question for the accountant.

Fallback if the tax office refuses parallel series: switch to Option B (block allocation) and accept explaining gaps. The code should keep number generation behind a single module so this swap is a one-file change.

---

## 3. IRD compliance: what actually applies

### Findings

**VAT registration** is mandatory for a goods business once turnover passes **NPR 50 lakh** on a rolling 12-month basis. A food distribution dealership will cross this, so assume the business is or will be VAT-registered and that every sale needs a proper tax invoice.

**CBMS (Central Billing Monitoring System)** — the real-time link that reports every invoice to the IRD as it is issued — is threshold-based. The threshold has been lowered repeatedly (NPR 25 crore, then 20 crore, and per the FY 2083/84 budget, **NPR 10 crore** annual turnover; NPR 5 crore for hotels, restaurants and canteens). A small two-partner distributor is well under 10 crore.

**This is the critical finding: CBMS does not apply at this size, so offline-first billing is legally fine.** If CBMS applied, offline invoicing would be impossible by definition, because the invoice must reach the IRD in real time. The whole offline architecture depends on staying under that threshold.

But the threshold keeps falling. Treat it as a business tripwire: when annual turnover approaches NPR 8 crore, the billing module needs a CBMS integration path and IRD-approved software. Design so that adding a "push invoice to CBMS" step later is an extra sync target, not a rewrite.

**Computerized Invoicing Procedure 2072 (2015)** applies to anyone issuing computer-generated invoices, regardless of turnover. It requires approval in two steps: certification of the software from the Department, and approval for its use from the taxpayer's own tax office. Its technical requirements shape our data model directly:

| Rule (Procedure 2072) | What it forces in the code |
|---|---|
| "Deletion of data/statistics once coded in the database should not be possible" | No hard deletes anywhere. Ever. Cancel and correct, never remove. |
| Corrections recorded as adjustments, not deletions | Credit notes and adjustment entries, not edits to an issued invoice. |
| Invoices entered in chronological order | Invoice order follows issue time, and issue time is immutable once set. |
| One-time printing; reprints marked "copy of original" with the reprint count | `print_count` on every invoice; every render after the first is stamped. |
| "Automatic recording of the works in Log Archive"; viewable and printable audit trail per user | A synced, append-only `audit_log` covering every user action. |
| Backups that can be recovered when necessary | Server backup plus a manual on-device export. |
| Invoice format per the VAT Act and Rules | Field list below. |

Notably, Procedure 2072 imposes **no internet or real-time reporting requirement**. Offline issuance is not in conflict with it.

### Required tax invoice fields

Seller name and PAN/VAT number; sequential invoice number; transaction date in Bikram Sambat; buyer name (and **buyer PAN for B2B sales** — every shop we sell to is B2B, so treat buyer PAN as required, not optional); description of goods; quantity and rate; taxable amount; VAT at 13%; total payable.

An invoice missing any required element is a *defective* invoice: the buyer cannot claim input credit from it, and the seller is exposed to penalty at assessment. Since our customers are shops who will want input credit, a defective invoice is a customer-facing failure, not just a compliance one.

Therefore: **the app must refuse to issue an invoice with missing mandatory fields.** No "save as draft and fill the PAN later" path that can produce a numbered invoice. Collect buyer PAN at customer creation, and block invoicing for customers without one until it is entered.

### Sources

- [Procedure Related to Computerized Invoicing, 2072 (2015) — Pioneer Law](https://pioneerlaw.com/procedure-related-to-computerized-invoicing-2072-2015/)
- [Electronic Billing in Nepal: The IRD CBMS Compliance Guide](https://mis.ac/articles/blog/electronic-billing-cbms-nepal.php)
- [Government lowers turnover threshold for mandatory e-billing integration](https://english.clickmandu.com/2026/05/9187/)
- [VAT Invoice Rules & Penalties in Nepal](https://commonlaw.com.np/publications/vat-invoice-rules-and-penalties-in-nepal)
- [VAT in Nepal 2082/83: Rates, Thresholds & Returns](https://lawalpine.com/blog/vat-in-nepal-rates-and-thresholds-2082-83)

These are secondary sources. The accountant confirms against the actual Act and current IRD circulars before launch. See `compliance-nepal.md`.

---

## 4. Conflict resolution: events, not overwrites

The brief proposes "latest edit wins" as the conflict rule. That is right for some data and actively dangerous for the rest.

Consider: partner A records that Shyam's shop paid NPR 5,000. Partner B, offline, records that the same shop paid NPR 3,000 for a different bill. Under last-write-wins on a `balance` field, one payment silently overwrites the other and NPR 3,000 of collected cash disappears from the books. The Dealer finds out weeks later, if ever.

The fix is to never store a derived figure as an editable field.

### Two classes of data

**Class 1 — Financial and operational facts. Append-only events. No updates, no deletes.**

Applies to: payments, invoices, stock movements, order status changes, deliveries.

Each row is an immutable record of something that happened, carrying a client-generated UUIDv7 as its primary key. Two devices writing concurrently produce two rows, and both survive. Nothing can overwrite anything.

Derived values are computed, never stored as truth:
- Customer outstanding balance = sum of invoice totals − sum of payments recorded
- Stock on hand = sum of stock received − sum sold ± adjustments

Both examples above then resolve correctly with no conflict logic at all: the two payments are two rows, the balance is 8,000, nothing is lost.

Corrections use a reversing entry — a negative payment row referencing the original, with a reason — which also satisfies the Procedure 2072 requirement that corrections be adjustments rather than deletions. The same mechanism gives us the audit trail for free.

**Class 2 — Descriptive, genuinely editable fields. Last-write-wins, with history.**

Applies to: product name, product price, customer name, phone, address, notes.

These are current-state fields where a later edit legitimately replaces an earlier one. Resolve with `updated_at`, tie-broken by `device_id` so the outcome is deterministic rather than arbitrary. Every superseded value is kept in a `field_history` row, so a price overwritten by the other partner can be seen and restored — satisfying the brief's "keep a log so nothing is silently lost".

One exception inside Class 2: **a price change must never alter an already-issued invoice.** Every invoice line stores the price at the moment of sale as its own value. Invoice lines are Class 1 data.

### Order status: ranked states, not timestamps

Order status is a state machine (`placed → confirmed → out_for_delivery → delivered`, plus `cancelled`). Resolving it purely by timestamp allows a late-syncing "confirmed" from one device to drag an already-delivered order backwards.

Rule: status advances by rank, never retreats. A lower-ranked status arriving later is stored in the event log for audit but does not change the current state. `cancelled` is the exception and requires an explicit dealer action with a reason, which is recorded as its own event.

### Stock going negative

If both partners sell the last carton while offline, stock goes negative on sync. That is not a bug to prevent — it is a real-world event that already happened, and the app's job is to surface it, not hide it. Show a clear warning on the stock screen and in the sync report. Never block a sale because the count disagrees; the Dealer is standing in front of the physical stock and knows better than the database.

---

## 5. Sync protocol

Local IndexedDB is the source of truth on the Dealer device. The server is a synchronisation point and a backup, not a gatekeeper.

**Push — outbox pattern.** Every local write also appends to an `outbox` table: `{id (uuidv7), entity, op, payload, created_at, attempts, last_error}`. A worker drains the outbox oldest-first whenever connectivity exists. Rows leave the outbox only on server acknowledgement. Failures increment `attempts` and back off exponentially; after several failures the row is surfaced in the UI rather than retried silently forever.

**Idempotency.** Every record's primary key is generated on the client (UUIDv7 — sortable by creation time, no coordination needed). The server upserts with `ON CONFLICT DO NOTHING` for event rows. Replaying the entire outbox is therefore harmless, which makes "retry on any doubt" the correct and safe behaviour.

**Pull — server sequence cursor, not timestamps.** Phone clocks drift, are set by hand, and jump across time zones. Never use a client timestamp to decide what is new. The server assigns a monotonic `server_seq` to every row it accepts; clients pull `WHERE server_seq > my_cursor` and advance the cursor. Client timestamps are stored as `device_time` for display only; `server_seq` is the ordering truth.

**Sync triggers.** App focus, `online` event, after any local write when already online, on a fixed interval while the app is open, and a manual "Sync now" button. The button matters: it converts an invisible system into something the Dealer can act on when standing in a spot with a bar of signal.

**Sync status must be visible.** A persistent indicator showing synced / N pending / error. People trust a system they can see working. It also turns "I think the app lost my order" into "it says 3 pending", which is the difference between a support call and a glance.

---

## 6. Data model sketch

Append-only (Class 1):

```
invoices          id, number, fiscal_year, device_prefix, customer_id,
                  issued_at, issued_by, subtotal, vat_amount, total,
                  payment_type (cash|credit), status (issued|cancelled),
                  cancelled_reason, cancelled_at, print_count, buyer_pan
invoice_lines     id, invoice_id, product_id, name_snapshot, qty, unit,
                  rate_snapshot, line_total
payments          id, customer_id, invoice_id?, amount, method (cash|digital),
                  collected_at, collected_by, reverses_payment_id?, note
stock_events      id, product_id, delta, reason (received|sold|adjustment|damage),
                  ref_id, occurred_at, created_by
order_events      id, order_id, status, occurred_at, created_by, note
incoming_stock    id, main_dealer_ref, expected_at, logged_at, status, note
incoming_lines    id, incoming_stock_id, product_id, qty
audit_log         id, user_id, device_id, action, entity, entity_id,
                  before, after, device_time, server_seq
```

Current-state, last-write-wins (Class 2):

```
products          id, name, name_ne, unit, price, low_stock_threshold,
                  updated_at, updated_by_device
customers         id, shop_name, contact_name, phone, pan, address,
                  lat, lng, updated_at, updated_by_device
field_history     id, entity, entity_id, field, old_value, new_value,
                  changed_at, changed_by_device
```

Local only, never synced:

```
outbox            id, entity, op, payload, created_at, attempts, last_error
sync_meta         cursor, last_sync_at, device_prefix, device_id
invoice_counter   fiscal_year, next_number   (transactional, UI cannot edit)
```

Note `name_snapshot` and `rate_snapshot` on invoice lines: an issued invoice is frozen, including its wording and prices, independent of any later catalog edit.

---

## 7. Stack

```
React 19 + Vite + TypeScript
Dexie 4                  IndexedDB wrapper, reactive queries via dexie-react-hooks
vite-plugin-pwa          Workbox service worker, app shell precache
Supabase                 Postgres + Auth + Row Level Security
Leaflet + OpenStreetMap  map and route planning
nepali-date-converter    Bikram Sambat dates on invoices
react-i18next            English / Nepali
```

**Why not Next.js:** server rendering buys nothing here. The Dealer app must run entirely from cache with no server. A plain SPA is simpler to make correctly offline. The customer-facing catalog would benefit from SSR for SEO, but shop customers arrive via a direct link or QR code, not search.

**Auth.** Dealer side: email and password for two known users. Customer side: phone number and PIN, avoiding per-message SMS OTP costs at this scale. Revisit OTP if impersonation becomes a real concern.

**Maps and routing.** Leaflet with OpenStreetMap tiles, which cover Bhaktapur well and cost nothing. Tiles for the service area bounding box at zoom 13–17 are pre-cached into IndexedDB on a Wi-Fi connection, so the map renders with no signal. Route ordering runs locally: nearest-neighbour seeded, then 2-opt improvement, over straight-line distances. Straight-line distance is an approximation, but for a compact delivery area it produces a sensible stop order, and the Dealer can drag to reorder. No routing API, so no cost and no connectivity requirement.

**Receipt sharing.** Render the invoice to HTML, rasterise to PNG on device, share via the Web Share API with files (works in Android Chrome and installed iOS PWAs), falling back to a `wa.me` deep link with a text summary plus a download. No server round trip, so it works offline.

---

## 8. Open questions blocking nothing yet, but needed before launch

1. Which phones do the two partners use — Android or iPhone? Decides how hard we push on storage persistence warnings. (Android: low risk. iPhone: needs the install-to-home-screen flow to be mandatory.)
2. Confirmation that two parallel invoice series are acceptable to their tax office — see `compliance-nepal.md`.
3. Is the business already VAT-registered, and what is its PAN? Needed on every invoice.
4. Current annual turnover, to confirm distance from the NPR 10 crore CBMS threshold.
5. Does the Main Dealer supply anything machine-readable (a PDF, an SMS, a WhatsApp message with a fixed shape)? If so, incoming stock logging could be partly parsed rather than fully typed. Manual entry ships first regardless.
