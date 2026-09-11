import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { allStock, money, updateProductPrice } from '../../lib/domain';
import { useTenantId, useToast } from '../../lib/hooks';
import { Search } from '../../ui/icons';

export default function Catalog() {
  const tenantId = useTenantId();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('All');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [toast, setToast] = useToast();

  const data = useLiveQuery(async () => {
    if (!tenantId) return null;
    const [products, stock, incoming] = await Promise.all([
      db.products.where('tenantId').equals(tenantId).toArray(),
      allStock(tenantId),
      db.incoming.where('tenantId').equals(tenantId).toArray(),
    ]);
    const soon: Record<string, number> = {};
    for (const inc of incoming.filter((i) => i.status !== 'received')) {
      const lines = await db.incomingLines.where('incomingId').equals(inc.id).toArray();
      for (const l of lines) soon[l.productId] = Math.min(soon[l.productId] ?? Infinity, inc.expectedAt);
    }
    return { products, stock, soon };
  }, [tenantId]);

  const cats = ['All', ...new Set((data?.products ?? []).map((p) => p.category))];
  const lowCount = (data?.products ?? []).filter((p) => (data!.stock[p.id] ?? 0) <= p.lowStockAt).length;

  const shown = (data?.products ?? [])
    .filter((p) => (cat === 'All' ? true : cat === 'Low' ? (data!.stock[p.id] ?? 0) <= p.lowStockAt : p.category === cat))
    .filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  const stockValue = (data?.products ?? []).reduce((s, p) => s + (data!.stock[p.id] ?? 0) * p.price, 0);

  async function save(id: string) {
    const n = Number(draft);
    if (Number.isFinite(n) && n > 0) {
      await updateProductPrice(id, n);
      setToast('Price updated — old value kept in history');
    }
    setEditing(null);
  }

  return (
    <>
      <header className="topbar" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 14 }}>
        <div className="title">Stock &amp; prices</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'var(--paper)', border: '1px solid var(--line)', padding: '12px 13px' }}>
          <Search size={16} color="var(--muted)" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${data?.products.length ?? 0} items`} style={{ border: 'none', background: 'transparent', padding: 0 }} />
        </div>
        <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 2 }}>
          {cats.map((c) => (
            <button key={c} className={'chip' + (cat === c ? ' on' : '')} style={{ flexShrink: 0 }} onClick={() => setCat(c)}>{c}</button>
          ))}
          <button
            className="chip"
            style={{ flexShrink: 0, borderColor: 'var(--bad)', color: cat === 'Low' ? '#fff' : 'var(--bad)', background: cat === 'Low' ? 'var(--bad)' : 'var(--card)' }}
            onClick={() => setCat('Low')}
          >
            Low · {lowCount}
          </button>
        </div>
      </header>

      <div className="scroll">
        <div className="rows">
          {shown.map((p) => {
            const have = data!.stock[p.id] ?? 0;
            const out = have <= 0;
            const low = !out && have <= p.lowStockAt;
            const eta = data!.soon[p.id];
            return (
              <div key={p.id} className="row" style={{ background: out ? 'var(--bad-soft)' : 'var(--card)' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600 }}>{p.name}</span>
                  <span className="num" style={{ fontSize: 11, color: out ? 'var(--bad)' : low ? 'var(--warn)' : 'var(--muted)', fontWeight: out || low ? 600 : 400 }}>
                    {out ? 'OUT OF STOCK' : low ? `LOW · below ${p.lowStockAt} ${p.unit}` : p.category}
                    {out && eta ? ` · arriving ${new Date(eta).toLocaleDateString([], { day: 'numeric', month: 'short' })}` : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                  {editing === p.id ? (
                    <input
                      autoFocus type="number" value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => save(p.id)}
                      onKeyDown={(e) => e.key === 'Enter' && save(p.id)}
                      style={{ width: 90, padding: 6, fontSize: 15, textAlign: 'right' }}
                    />
                  ) : (
                    <button className="num" style={{ fontSize: 15, fontWeight: 600, textDecoration: 'underline dotted' }} onClick={() => { setEditing(p.id); setDraft(String(p.price)); }}>
                      Rs {money(p.price)}
                    </button>
                  )}
                  <span className="num" style={{ fontSize: 11, color: out ? 'var(--bad)' : low ? 'var(--warn)' : 'var(--muted)', fontWeight: out || low ? 600 : 400 }}>
                    {have} {p.unit}
                  </span>
                </div>
              </div>
            );
          })}
          {!shown.length && <div className="empty" style={{ margin: 16 }}>Nothing matches</div>}
        </div>
      </div>

      <div className="footer" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span className="num" style={{ fontSize: 12, color: 'var(--muted)' }}>Stock value</span>
          <span className="num" style={{ fontSize: 18, fontWeight: 600 }}>Rs {money(stockValue)}</span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 150, textAlign: 'right', lineHeight: 1.4 }}>Tap a price to change it</span>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
