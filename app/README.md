# Bitaran — app

Offline-first PWA. React + Vite + TypeScript, Dexie (IndexedDB) as the source of truth.

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # -> dist/
npm run preview   # serve the built PWA
```

There is no server yet. Every write also lands in an `outbox` table, ready for the sync
protocol in `../docs/architecture.md`. Demo data is seeded on first run; wipe it from
More → Reset demo data.
