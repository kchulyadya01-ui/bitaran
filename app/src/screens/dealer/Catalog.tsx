import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { addProduct, addSegment, allStock, money, renameSegment, setStock, updateProductPrice } from '../../lib/domain';
import { useTenantId, useToast } from '../../lib/hooks';
import { Search, Plus, Grid } from '../../ui/icons';

type Sheet =
  | { kind: 'none' }
  | { kind: 'segment'; editing?: { id: string; name: string } }
  | { kind: 'product'; segmentId: string; segmentName: string }
  | { kind: 'stock'; productId: string; name: string; unit: string; have: number };

export default function Catalog() {
  const tenantId = useTenantId();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sheet, setSheet] = useState<Sheet>({ kind: 'none' });
  const [toast, setToast] = useToast();

  const [segName, setSegName] = useState('');
  const [form, setForm] = useState({ name: '', unit: 'pc', price: '', low: '', opening: '' });
  const [stockDraft, setStockDraft] = useState('');

  const data = useLiveQuery(async () => {
    if (!tenantId) return null;
    const [segments, products, stock, incoming] = await Promise.all([
      db.segments.where('tenantId').equals(tenantId).toArray(),
      db.products.where('tenantId').equals(tenantId).toArray(),
      allStock(tenantId),
      db.incoming.where('tenantId').equals(tenantId).toArray(),
    ]);
    const soon: Record<string, number> = {};
    for (const inc of incoming.filter((i) => i.status !== 'received')) {
      const lines = await db.incomingLines.where('incomingId').equals(inc.id).toArray();
      for (const l of lines) soon[l.productId] = Math.min(soon[l.productId] ?? Infinity, inc.expectedAt);
    }
    return { segments: segments.sort((a, b) => a.sortOrder - b.sortOrder), products, stock, soon };
  }, [tenantId]);

  const lowCount = (data?.products ?? []).filter((p) => (data!.stock[p.id] ?? 0) <= p.lowStockAt).length;

  const matches = (p: { name: string; id: string; lowStockAt: number }) =>
    p.name.toLowerCase().includes(q.toLowerCase())
    && (filter === 'low' ? (data!.stock[p.id] ?? 0) <= p.lowStockAt : true);

  const groups = (data?.segments ?? [])
    .filter((s) => filter === 'all' || filter === 'low' || filter === s.id)
    .map((s) => ({ segment: s, items: (data?.products ?? []).filter((p) => p.segmentId === s.id).filter(matches) }))
    .filter((g) => g.items.length || (filter !== 'low' && !q));

  const stockValue = (data?.products ?? []).reduce((s, p) => s + (data!.stock[p.id] ?? 0) * p.price, 0);

  async function savePrice(id: string) {
    const n = Number(draft);
    if (Number.isFinite(n) && n > 0) {
      await updateProductPrice(id, n);
      setToast('Price updated — old value kept in history');
    }
    setEditing(null);
  }

  async function submitSegment() {
    if (!tenantId || !segName.trim()) return;
    if (sheet.kind === 'segment' && sheet.editing) {
      await renameSegment(sheet.editing.id, segName);
      setToast(`Renamed to ${segName.trim()}`);
    } else {
      await addSegment(tenantId, segName);
      setToast(`${segName.trim()} added`);
    }
    setSegName('');
    setSheet({ kind: 'none' });
  }

  async function submitStock() {
    if (sheet.kind !== 'stock') return;
    const n = Number(stockDraft);
    if (!Number.isFinite(n) || n < 0) return;
    const diff = n - sheet.have;
    await setStock(sheet.productId, n);
    setToast(diff === 0 ? 'No change' : `${sheet.name}: ${diff > 0 ? '+' : ''}${diff} ${sheet.unit}`);
    setSheet({ kind: 'none' });
  }

  async function submitProduct() {
    if (!tenantId || sheet.kind !== 'product') return;
    const price = Number(form.price);
    if (!form.name.trim() || !Number.isFinite(price) || price <= 0) return;
    await addProduct({
      tenantId,
      segmentId: sheet.segmentId,
      name: form.name,
      unit: form.unit,
      price,
      lowStockAt: Number(form.low) || 0,
      openingStock: Number(form.opening) || 0,
    });
    setToast(`${form.name.trim()} added to ${sheet.segmentName}`);
    setForm({ name: '', unit: 'pc', price: '', low: '', opening: '' });
    setSheet({ kind: 'none' });
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
          <button className={'chip' + (filter === 'all' ? ' on' : '')} style={{ flexShrink: 0 }} onClick={() => setFilter('all')}>All</button>
          {(data?.segments ?? []).map((s) => (
            <button key={s.id} className={'chip' + (filter === s.id ? ' on' : '')} style={{ flexShrink: 0 }} onClick={() => setFilter(s.id)}>{s.name}</button>
          ))}
          <button
            className="chip" style={{ flexShrink: 0, borderColor: 'var(--bad)', color: filter === 'low' ? '#fff' : 'var(--bad)', background: filter === 'low' ? 'var(--bad)' : 'var(--card)' }}
            onClick={() => setFilter('low')}
          >
            Low · {lowCount}
          </button>
        </div>
      </header>

      <div className="scroll">
        {groups.map(({ segment, items }) => (
          <div key={segment.id} style={{ marginBottom: 14 }}>
            <div style={{ padding: '12px 16px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => { setSegName(segment.name); setSheet({ kind: 'segment', editing: { id: segment.id, name: segment.name } }); }}
                style={{ flex: 1, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 2 }}
              >
                <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>{segment.name}</span>
                <span className="num" style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {items.length} item{items.length === 1 ? '' : 's'} · tap to rename
                </span>
              </button>
              <button
                onClick={() => setSheet({ kind: 'product', segmentId: segment.id, segmentName: segment.name })}
                style={{ display: 'flex', alignItems: 'center', gap: 5, border: '1px solid var(--line)', padding: '8px 10px' }}
              >
                <Plus size={14} color="var(--ok)" />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ok)' }}>Item</span>
              </button>
            </div>

            <div className="rows">
              {items.map((p) => {
                const have = data!.stock[p.id] ?? 0;
                const out = have <= 0;
                const low = !out && have <= p.lowStockAt;
                const eta = data!.soon[p.id];
                return (
                  <div key={p.id} className="row" style={{ background: out ? 'var(--bad-soft)' : 'var(--card)' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                      <span style={{ fontSize: 14.5, fontWeight: 600 }}>{p.name}</span>
                      <span className="num" style={{ fontSize: 11, color: out ? 'var(--bad)' : low ? 'var(--warn)' : 'var(--muted)', fontWeight: out || low ? 600 : 400 }}>
                        {out ? 'OUT OF STOCK' : low ? `LOW · below ${p.lowStockAt} ${p.unit}` : `per ${p.unit}`}
                        {out && eta ? ` · arriving ${new Date(eta).toLocaleDateString([], { day: 'numeric', month: 'short' })}` : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                      {editing === p.id ? (
                        <input
                          autoFocus type="number" value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={() => savePrice(p.id)}
                          onKeyDown={(e) => e.key === 'Enter' && savePrice(p.id)}
                          style={{ width: 90, padding: 6, fontSize: 15, textAlign: 'right' }}
                        />
                      ) : (
                        <button className="num" style={{ fontSize: 15, fontWeight: 600, textDecoration: 'underline dotted' }} onClick={() => { setEditing(p.id); setDraft(String(p.price)); }}>
                          Rs {money(p.price)}
                        </button>
                      )}
                      <button
                        className="num"
                        style={{ fontSize: 11, color: out ? 'var(--bad)' : low ? 'var(--warn)' : 'var(--muted)', fontWeight: out || low ? 700 : 600, textDecoration: 'underline dotted' }}
                        onClick={() => { setStockDraft(String(have)); setSheet({ kind: 'stock', productId: p.id, name: p.name, unit: p.unit, have }); }}
                      >
                        {have} {p.unit}
                      </button>
                    </div>
                  </div>
                );
              })}
              {!items.length && (
                <button
                  onClick={() => setSheet({ kind: 'product', segmentId: segment.id, segmentName: segment.name })}
                  style={{ background: 'var(--card)', padding: 18, fontSize: 13, color: 'var(--muted)', border: '1px dashed var(--line)' }}
                >
                  Nothing in {segment.name} yet — add the first item
                </button>
              )}
            </div>
          </div>
        ))}

        {!groups.length && <div className="empty" style={{ margin: 16 }}>Nothing matches</div>}

        <div style={{ padding: '0 16px 16px' }}>
          <button
            onClick={() => { setSegName(''); setSheet({ kind: 'segment' }); }}
            style={{ width: '100%', border: '1.5px dashed #b9b9b2', padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <div style={{ width: 38, height: 38, background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Grid size={18} color="#fff" />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, textAlign: 'left' }}>
              <span style={{ fontSize: 14.5, fontWeight: 600 }}>Add a segment</span>
              <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>a supplying company, or a type like Ice cream</span>
            </div>
          </button>
        </div>
      </div>

      <div className="footer" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span className="num" style={{ fontSize: 12, color: 'var(--muted)' }}>Stock value</span>
          <span className="num" style={{ fontSize: 18, fontWeight: 600 }}>Rs {money(stockValue)}</span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 150, textAlign: 'right', lineHeight: 1.4 }}>Tap a price to change it</span>
      </div>

      {sheet.kind === 'segment' && (
        <div className="sheet-back" onClick={() => setSheet({ kind: 'none' })}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{sheet.editing ? 'Rename segment' : 'New segment'}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>
                Usually the company you buy from — Ben Nevis, Nova, Century — or a type like Ice cream or Noodles.
              </div>
            </div>
            <input autoFocus value={segName} onChange={(e) => setSegName(e.target.value)} placeholder="Company or type" onKeyDown={(e) => e.key === 'Enter' && submitSegment()} />
            <button className="btn" disabled={!segName.trim()} onClick={submitSegment}>{sheet.editing ? 'Save' : 'Add segment'}</button>
            <button className="btn ghost" onClick={() => setSheet({ kind: 'none' })}>Cancel</button>
          </div>
        </div>
      )}

      {sheet.kind === 'product' && (
        <div className="sheet-back" onClick={() => setSheet({ kind: 'none' })}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>New item</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>in {sheet.segmentName}</div>
            </div>
            <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Item name" />
            <div style={{ display: 'flex', gap: 10 }}>
              <input style={{ flex: 1.3 }} type="number" inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Price" />
              <input style={{ flex: 1 }} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="Unit" />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input style={{ flex: 1 }} type="number" value={form.opening} onChange={(e) => setForm({ ...form, opening: e.target.value })} placeholder="Stock now" />
              <input style={{ flex: 1 }} type="number" value={form.low} onChange={(e) => setForm({ ...form, low: e.target.value })} placeholder="Warn below" />
            </div>
            <button className="btn" disabled={!form.name.trim() || !Number(form.price)} onClick={submitProduct}>Add item</button>
            <button className="btn ghost" onClick={() => setSheet({ kind: 'none' })}>Cancel</button>
          </div>
        </div>
      )}

      {sheet.kind === 'stock' && (
        <div className="sheet-back" onClick={() => setSheet({ kind: 'none' })}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{sheet.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>
                Set what's really on the shelf — after a count, a delivery, or damage. Currently {sheet.have} {sheet.unit}.
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                autoFocus type="number" inputMode="numeric" value={stockDraft}
                onChange={(e) => setStockDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitStock()}
                style={{ flex: 1, fontSize: 20, fontWeight: 600 }}
              />
              <span className="num" style={{ fontSize: 13, color: 'var(--muted)' }}>{sheet.unit}</span>
            </div>
            {Number.isFinite(Number(stockDraft)) && Number(stockDraft) !== sheet.have && (
              <div className="num" style={{ fontSize: 12, color: Number(stockDraft) > sheet.have ? 'var(--ok)' : 'var(--bad)', fontWeight: 600 }}>
                {Number(stockDraft) > sheet.have ? '+' : ''}{Math.round((Number(stockDraft) - sheet.have) * 100) / 100} {sheet.unit}
              </div>
            )}
            <button className="btn" disabled={!stockDraft.trim() || Number(stockDraft) < 0} onClick={submitStock}>Save count</button>
            <button className="btn ghost" onClick={() => setSheet({ kind: 'none' })}>Cancel</button>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
