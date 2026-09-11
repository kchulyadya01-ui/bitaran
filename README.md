# Distribution & Order Management App

Offline-first order, billing and delivery app for a food distribution dealership in Bhaktapur, Nepal.
Mobile-first PWA — one build serves phone and web.

## Status

Architecture phase. No application code yet.

## Docs

- [docs/architecture.md](docs/architecture.md) — platform, invoice numbering, sync protocol, conflict model, data model, stack
- [docs/compliance-nepal.md](docs/compliance-nepal.md) — questions for the accountant, with sourced findings
- [docs/brief.md](docs/brief.md) — original project brief

## Key constraints driving the design

1. The Dealer works from a phone only, often with no network. Local IndexedDB is the source of truth; the server is a sync point, not a gatekeeper.
2. Nepal's Computerized Invoicing Procedure 2072 forbids deleting invoice data. Everything financial is append-only; corrections are reversing entries.
3. Two partners issue bills from two phones, both possibly offline. Each device owns its own invoice series.
4. Real-time IRD/CBMS reporting would make offline billing impossible. The design assumes turnover stays below the NPR 10 crore threshold, and treats approaching it as a planned migration.
