# Questions for the Accountant

Date: 2026-09-11

We are building a billing and order management app for the business. Four compliance questions change how the software is built, so they are worth answering before the code is written rather than after.

Below each question is what our own research found, so the answer can be a confirmation or a correction rather than a research task. All findings come from secondary sources and need checking against the current Act, Rules and IRD circulars.

---

### 1. Can we use two parallel invoice number series, one per partner?

**Why we ask.** Both partners issue bills from their own phones, often with no mobile network in the delivery areas. A single shared numbering counter cannot work offline: both phones would independently issue the same number to different customers, and the bills are already in the customers' hands by the time the phones reconnect.

**What we propose.** Each phone gets its own unbroken series with a fixed prefix, reset each fiscal year:

- Partner 1: `A-2082-0001`, `A-2082-0002`, …
- Partner 2: `B-2082-0001`, `B-2082-0002`, …

Each series is strictly sequential with no gaps. This mirrors giving two salespeople two separate physical bill books.

**What we need to know.** Is this acceptable to our tax office, and does it need to be declared or registered with them in advance? If parallel series are not allowed, we will use a single series with number blocks pre-assigned to each phone — but that method leaves unused gaps in the sequence, which we would then need to be able to explain at assessment.

---

### 2. Are we below the CBMS / e-billing integration threshold, and by how much?

**What we found.** Real-time integration with the IRD's Central Billing Monitoring System appears to be mandatory above **NPR 10 crore** annual turnover as of the FY 2083/84 budget (NPR 5 crore for hotels, restaurants and canteens). The threshold has been lowered several times in recent years — reportedly from 25 crore, to 20 crore, to the current figure.

**Why it matters so much.** If CBMS applies, every invoice must be reported to the IRD as it is issued, which requires a live internet connection at the point of sale. That is directly incompatible with billing in areas that have no network coverage — which is the core requirement of this app. The entire offline design rests on being below this threshold.

**What we need to know.**
- Confirmation of the current threshold and that we are below it.
- Our current annual turnover, so we know how much headroom there is. We want to plan the CBMS integration work when turnover approaches roughly 8 crore, not discover the obligation after crossing it.

---

### 3. Do we need IRD approval for this software, and when?

**What we found.** The *Procedure Related to Computerized Invoicing, 2072 (2015)* appears to require two approvals for computer-generated invoices: certification of the software from the Department, and approval for its use from our own tax office. Some sources suggest the approval requirement is tied to the same turnover thresholds as CBMS; others suggest it applies to computerized invoicing generally.

**What we need to know.** Which applies to us at our size, and if approval is needed, whether it should be obtained before we start issuing bills from the app.

**What we are doing regardless.** We are building to the technical requirements of Procedure 2072 from the start, so that approval is a paperwork exercise later rather than a rebuild:

- No data can ever be deleted. Cancelled bills keep their number and stay in the record with a cancellation reason.
- Corrections are made as adjustment or reversing entries, never by editing or removing an issued bill.
- Every bill records how many times it has been printed, and every reprint after the first is marked "copy of original".
- Every user action is written to a permanent audit log that can be viewed and printed per user.
- All data is backed up and restorable.

---

### 4. Is our invoice field list complete and correct?

**What we plan to print on every tax invoice.** Seller name and PAN/VAT number; invoice number; date in Bikram Sambat; buyer name and buyer PAN; description of goods; quantity, unit and rate; taxable amount; VAT at 13%; total payable.

**What we need to know.**
- Is anything missing or wrongly labelled for our type of business?
- Our own PAN/VAT number, and the exact registered business name as it must appear.
- **Buyer PAN:** we understand it is required for business-to-business sales, and every customer we sell to is a shop. We plan to make buyer PAN mandatory — the app will refuse to issue a bill to a customer whose PAN is not on file, because a bill missing it would be a defective invoice and our customer could not claim input credit from it. Is that the right call, or are there customers for whom this is not required?
- Is a separate format needed for a cash sale versus a credit sale, or for an abbreviated tax invoice?
- Are there prescribed formats we should be following exactly, given the recent amendment to the VAT Rules introducing new tax invoice formats?

---

### 5. Credit notes and returns

Ice cream and packaged food come back — melted, damaged, expired. We need to know the correct document and procedure for a return or a partial credit against an already-issued bill, and how it should be numbered, so we can build it properly rather than having the Dealer improvise with a discount on the next bill.

---

## Reference sources used

These are secondary and need verification:

- [Procedure Related to Computerized Invoicing, 2072 (2015) — Pioneer Law](https://pioneerlaw.com/procedure-related-to-computerized-invoicing-2072-2015/)
- [Electronic Billing in Nepal: The IRD CBMS Compliance Guide](https://mis.ac/articles/blog/electronic-billing-cbms-nepal.php)
- [Government lowers turnover threshold for mandatory e-billing integration](https://english.clickmandu.com/2026/05/9187/)
- [VAT Invoice Rules & Penalties in Nepal](https://commonlaw.com.np/publications/vat-invoice-rules-and-penalties-in-nepal)
- [Nepal Amends VAT Rules: New Tax Invoice Formats Introduced](https://bizsewa.com/nepal-amends-vat-rules-new-tax-invoice-formats-introduced-new-vat-bill-format/)
- [VAT in Nepal 2082/83: Rates, Thresholds & Returns](https://lawalpine.com/blog/vat-in-nepal-rates-and-thresholds-2082-83)
