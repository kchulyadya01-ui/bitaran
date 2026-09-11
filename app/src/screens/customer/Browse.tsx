import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { allStock, money } from '../../lib/domain';
import { useCustomerTenant, useCustomerTenantId, useShopRow } from '../../lib/hooks';
import { useCart } from '../../lib/cart';
import { ProductArt, tintFor } from '../../ui/ProductArt';
import { Search, Plus, Minus, Chevron, Shop } from '../../ui/icons';

export default function Browse() {
  const nav = useNavigate();
  const tenant = useCustomerTenant();
  const tenantId = useCustomerTenantId();
  const customer = useShopRow();
  const { cart, bump } = useCart();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');

  const data = useLiveQuery(async () => {
    if (!tenantId) return null;
    const [products, stock, segments] = await Promise.all([
      db.products.where('tenantId').equals(tenantId).toArray(),
      allStock(tenantId),
      db.segments.where('tenantId').equals(tenantId).toArray(),
    ]);
    return { products, stock, segments: segments.sort((a, b) => a.sortOrder - b.sortOrder) };
  }, [tenantId]);

  const segments = data?.segments ?? [];
  const segmentName = (id: string) => segments.find((s) => s.id === id)?.name ?? '';
  const shown = (data?.products ?? [])
    .filter((p) => cat === 'all' || p.segmentId === cat)
    .filter((p) => (p.name + ' ' + segmentName(p.segmentId)).toLowerCase().includes(q.toLowerCase()));

  const count = Object.values(cart).filter((v) => v > 0).length;
  const total = Object.entries(cart).reduce((s, [id, qty]) => {
    const p = data?.products.find((x) => x.id === id);
    return s + (p ? p.price * qty : 0);
  }, 0);

  return (
    <>
      <div style={{ padding: '20px 18px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <span className="np disp" style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.01em' }}>
              नमस्ते, {customer?.contactName.split(' ')[0] ?? 'ji'}
            </span>
            <span style={{ fontSize: 12.5, color: 'var(--c-muted)' }}>
              buying from {tenant?.name.replace(' Pvt. Ltd.', '') ?? '—'}
            </span>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--c-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Shop size={20} color="var(--c-accent)" />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--c-card)', border: '1px solid var(--c-line)', borderRadius: 999, padding: '13px 16px', boxShadow: 'var(--c-shadow)' }}>
          <Search size={17} color="var(--c-faint)" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items or companies…" style={{ border: 'none', background: 'transparent', padding: 0, fontSize: 14 }} />
        </div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
          <button className={'chip' + (cat === 'all' ? ' on' : '')} style={{ flexShrink: 0 }} onClick={() => setCat('all')}>All</button>
          {segments.map((sg) => (
            <button key={sg.id} className={'chip' + (cat === sg.id ? ' on' : '')} style={{ flexShrink: 0 }} onClick={() => setCat(sg.id)}>{sg.name}</button>
          ))}
        </div>
      </div>

      <div className="scroll" style={{ padding: '0 18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, alignContent: 'start', paddingBottom: 8 }}>
          {shown.map((p) => {
            const have = data!.stock[p.id] ?? 0;
            const out = have <= 0;
            const qty = cart[p.id] ?? 0;
            return (
              <div key={p.id} className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', opacity: out ? 0.55 : 1 }}>
                <div style={{ height: 110, background: out ? '#f0efe9' : tintFor(p.segmentId), display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '22px 22px 0 0' }}>
                  <ProductArt name={p.name} />
                </div>
                <div style={{ padding: '12px 13px 13px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--c-faint)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{segmentName(p.segmentId)}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.35, marginTop: -2 }}>{p.name}</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span className="disp" style={{ fontSize: 17, fontWeight: 700, color: 'var(--c-accent)' }}>Rs {money(p.price)}</span>
                    <span style={{ fontSize: 11, color: 'var(--c-muted)' }}>/ {p.unit}</span>
                  </div>
                  <div style={{ flex: 1 }} />
                  {out ? (
                    <div style={{ height: 42, borderRadius: 999, background: '#f0efe9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: 'var(--c-faint)' }}>
                      Out of stock
                    </div>
                  ) : qty > 0 ? (
                    <div style={{ height: 42, borderRadius: 999, background: 'var(--c-ok)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <button onClick={() => bump(p.id, -1)} style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Less">
                        <Minus size={15} color="#fff" />
                      </button>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{qty}</span>
                      <button onClick={() => bump(p.id, 1)} style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="More">
                        <Plus size={15} color="#fff" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => bump(p.id, 1)}
                      style={{ height: 42, borderRadius: 999, background: 'var(--c-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: 'var(--c-accent)' }}
                    >
                      <Plus size={15} color="var(--c-accent)" /> Add
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '14px 18px 18px' }}>
        <button
          onClick={() => count && nav('/shop/cart')}
          style={{
            width: '100%', height: 62, borderRadius: 999, display: 'flex', alignItems: 'center',
            padding: '0 8px 0 22px', gap: 12, textAlign: 'left',
            background: count ? 'var(--c-ok)' : 'var(--c-card)',
            border: count ? 'none' : '1.5px dashed var(--c-line)',
            boxShadow: count ? 'var(--c-shadow)' : 'none',
          }}
        >
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 11.5, color: count ? 'rgba(255,255,255,0.75)' : 'var(--c-faint)' }}>
              {count ? `${count} item${count === 1 ? '' : 's'} in order` : 'Your order is empty'}
            </span>
            <span className="disp" style={{ fontSize: 19, fontWeight: 700, color: count ? '#fff' : 'var(--c-faint)' }}>
              {count ? `Rs ${money(total)}` : 'Tap + to add'}
            </span>
          </div>
          {!!count && (
            <span style={{ height: 46, borderRadius: 999, background: '#fff', color: 'var(--c-ok)', display: 'flex', alignItems: 'center', gap: 7, padding: '0 18px', fontSize: 14, fontWeight: 700 }}>
              Review <Chevron size={15} color="var(--c-ok)" />
            </span>
          )}
        </button>
      </div>
    </>
  );
}
