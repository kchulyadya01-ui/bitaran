# Distribution & Order Management App

Offline-first order, billing and delivery app for food distributors in Nepal.
Multi-tenant: any distribution business signs up and gets its own catalog, customers, stock, PAN and invoice series.
Mobile-first PWA — one build serves phone and web.

## Live

- **App:** https://kchulyadya01-ui.github.io/bitaran/ — open on a phone, then Add to Home Screen / Install
- **Designs:** https://claude.ai/code/artifact/613f78ad-30e7-4af4-bad0-d114ed634d36

## Status

Working offline-first PWA against local IndexedDB. No server yet — every write queues in an
outbox that does not drain. See "What is left" below.

```bash
cd app && npm install && npm run dev   # http://localhost:5173
./deploy.sh                            # build + publish to GitHub Pages
```

## Docs

- [docs/architecture.md](docs/architecture.md) — platform, invoice numbering, sync protocol, conflict model, data model, stack
- [docs/compliance-nepal.md](docs/compliance-nepal.md) — questions for the accountant, with sourced findings
- [docs/brief.md](docs/brief.md) — original project brief
- [design/](design/) — screen designs (`.dc.html` artboards + `canvas.json`)
- [app/](app/) — the PWA

## Key constraints driving the design

1. The Dealer works from a phone only, often with no network. Local IndexedDB is the source of truth; the server is a sync point, not a gatekeeper.
2. Nepal's Computerized Invoicing Procedure 2072 forbids deleting invoice data. Everything financial is append-only; corrections are reversing entries.
3. Several people issue bills from their own phones, any of them possibly offline. Each billing device owns its own invoice series (A, B, C...), so numbers can never collide.
4. Real-time IRD/CBMS reporting would make offline billing impossible. The design assumes a tenant's turnover stays below the NPR 10 crore threshold, and treats approaching it as a planned migration.
