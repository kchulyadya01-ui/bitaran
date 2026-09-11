# Project Brief: Distribution & Order Management App

## 1. Business Context

The app is being built for a small food distribution business based in Bhaktapur, Nepal. The business operates as follows:

- The business (referred to below as **"the Dealer"**) holds the local dealership for ice cream, snacks, and other packaged food items.
- The Dealer receives stock from an upstream **Main Dealer / Manufacturer Supplier**, and in turn distributes those goods to local retail customers (shops, small stores) in and around the service area.
- Delivery is done using an EV (electric vehicle) van.
- The business is run by two partners under a registered supplying/partnership company.
- The Dealer works entirely from a mobile phone — **there is no laptop or desktop in daily use.** The app must be fully usable on mobile from end to end. Desktop/web access can exist as a secondary reference, but it is not the primary design target.
- Delivery routes frequently pass through areas with **poor or no internet connectivity.**

## 2. Problems We're Trying to Solve

| # | Problem | Impact |
|---|---------|--------|
| 1 | Orders from retail customers are taken manually (phone calls, verbal, or paper) | Slow, error-prone, easy to lose track of orders |
| 2 | Billing is done manually | Time-consuming, inconsistent, no proper record-keeping, risk of non-compliance with VAT invoice rules |
| 3 | No digital record of who owes what | Hard to track outstanding payments/credit customers |
| 4 | No systematic way to plan delivery routes | Wasted time and fuel, inefficient stop sequencing |
| 5 | Delivery areas often have no network coverage | Any tool that depends on constant internet access breaks in the field |
| 6 | No visibility into incoming stock from the Main Dealer | The Dealer doesn't know when the next batch of goods will arrive, making it hard to plan customer deliveries and manage stock-outs |
| 7 | No easy way for retail customers to place orders themselves | Customers currently must call or message directly, adding friction on both sides |

## 3. Goals of the App

1. Let retail **customers place orders directly**, without needing to call.
2. Let the **Dealer receive, view, and manage** those orders from their phone.
3. Let the Dealer **generate proper bills/invoices** for each order, including VAT-compliant details.
4. Give the Dealer a **map view** of customer locations to plan efficient delivery routes.
5. Make the entire Dealer-side experience **work offline** — order viewing, billing, stock updates, and delivery status must all function with no internet, and sync automatically once a connection is available.
6. Let the Dealer **track incoming stock from the Main Dealer**, including expected arrival/delivery timing, so they know what's coming and when.
7. Keep a simple **ledger of payments and outstanding balances** per customer.
8. Be **mobile-first in every screen and interaction** — no assumption of desktop use.

## 4. User Roles

### A. Customer (retail shop / buyer)
- Browses available products (ice cream, snacks, other food items) with current prices.
- Places an order (quantity, items, preferred delivery time if relevant).
- Views order status (placed → confirmed → out for delivery → delivered).
- Views their own bill/receipt history and outstanding balance.

### B. Dealer (the business owner and their partner)
- Receives and manages incoming customer orders.
- Manages the product catalog (items, prices, stock levels).
- Generates bills/invoices per order (VAT-compliant format for Nepal).
- Views a map of customer locations and plans/follows a delivery route.
- Marks orders as delivered, collects payment, and logs it.
- Tracks outstanding dues per customer.
- Views/logs incoming stock from the Main Dealer, including expected arrival date/time.
- All of the above must work fully offline, with automatic sync when back online.

### C. Main Dealer (upstream supplier) — data source only, not a full user role for now
- The app does not need a separate login/interface for the Main Dealer at this stage.
- The Dealer should be able to manually log/record what has been ordered from the Main Dealer and the expected arrival date/time of that stock, so they can plan ahead. This can start as a simple manual entry feature (Dealer enters "Order X from Main Dealer, expected [date/time]") rather than a live integration.

## 5. Core Features

### 5.1 Order Management
- Customer-facing: browse catalog, place order, track order status.
- Dealer-facing: receive orders in a live list, confirm/reject, update status, view order history.

### 5.2 Product Catalog / Listings
- Item name, unit, price, current stock level.
- Dealer can update prices and stock from their phone.
- Low-stock indicator.

### 5.3 Billing & Invoicing
- Auto-generate a bill from a confirmed order.
- Include VAT-relevant fields (seller PAN/VAT number, invoice number, date, VAT breakdown) so it holds up as a proper tax invoice.
- Support both cash and credit (pay-later) sales.
- Shareable digital receipt (e.g. via WhatsApp/SMS).
- **Note:** confirm with an accountant whether the business is required to use IRD-approved e-billing software based on turnover; this affects how invoice numbers/sync should be handled.

### 5.4 Incoming Stock Tracking (from Main Dealer)
- Dealer logs stock orders placed with the Main Dealer.
- Dealer records/edits the expected arrival date and time for each incoming shipment.
- A simple view showing "what's coming and when" to help plan customer deliveries.
- Once stock arrives, Dealer marks it received and it updates the local stock/catalog quantities.

### 5.5 Map & Delivery
- Customer locations shown on a map.
- Simple route ordering for the day's deliveries.
- Delivery confirmation per stop (marked done, optionally with a note or photo).

### 5.6 Payments & Ledger
- Record payment collected per order (cash / digital).
- Running outstanding balance per customer.
- Simple summary of who owes what.

### 5.7 Offline-First Behavior (Dealer side — critical requirement)
- All Dealer-side data (orders, catalog, customer list, prices) is stored locally on the device.
- The Dealer can view orders, create bills, update stock, and mark deliveries complete with **zero internet connection.**
- All changes made offline are queued and automatically synced to the server/other partner's device once connectivity returns.
- If the same data is edited from two devices while both were offline, the system should resolve it with a clear rule (e.g., latest edit wins) and keep a log so nothing is silently lost.

### 5.8 Customer-Side Connectivity Behavior
- Customers typically order from an area with normal network access, so the customer app does not need full offline functionality.
- However, if a customer's connection drops while placing an order, the order should be held locally on their device and sent automatically once the connection returns, instead of being lost.

### 5.9 Reports (basic, for the Dealer/partners only)
- Daily sales summary.
- Outstanding dues report.
- Best-selling items.

## 6. Design & Technical Requirements

- **Mobile-first, mobile-only in practice.** Every screen must be fully usable on a phone; no feature should require a desktop.
- **Offline-first architecture** for the Dealer side: local storage as the source of truth, with a background sync queue for when connectivity returns.
- Simple, clean, professional UI — this is a working tool for people on the move, not a showcase design. Prioritize large tap targets, minimal steps per action, and clarity over visual complexity.
- Should be buildable as either:
  - A native/cross-platform mobile app (e.g., React Native/Flutter) for the strongest offline guarantees, or
  - A Progressive Web App (PWA) with local storage (IndexedDB) and a service worker, if faster/cheaper to build first and iterate.
- Language: interface should be simple and clear; consider supporting both English and Nepali text where practical.

## 7. Out of Scope (for now)

- Full live integration with the Main Dealer's own systems (manual logging is sufficient at this stage).
- Advanced analytics or AI-based demand forecasting.
- Multi-branch/multi-warehouse support (this is a single small operation with two partners).

## 8. Success Criteria

- The Dealer can fully take, bill, and deliver an order from their phone, including while offline in the field.
- Customers can place an order themselves without a phone call.
- The Dealer always knows what stock is incoming and when.
- Billing produced by the app is valid enough to stand as a proper VAT invoice in Nepal.
- No order or bill data is ever lost due to lack of network connectivity.
