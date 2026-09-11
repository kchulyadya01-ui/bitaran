import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { allStock, money } from '../../lib/domain';
import { useActiveCustomer, useTenant, useTenantId } from '../../lib/hooks';
import { useCart } from '../../lib/cart';
import { ProductArt, ART_TINT } from '../../ui/ProductArt';
import { Search, Plus, Minus, Chevron, Shop } from '../../ui/icons';

export default function Browse() {
  const nav = useNavigate();
  const tenant = useTenant();
  const tenantId = useTenantId();
  const customer = useActiveCustomer();
  const { cart, bump } = useCart();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');

  const data = useLiveQuery(async () => {
    if (!tenantId) return null;
    const [products, stock] = await Promise.all([
      db.products.where('tenantId').equals(tenantId).toArray(),
      allStock(tenantId),
    ]);
    return { products, stock };
  }, [tenantId]);

  const cats = ['All', ...new Set((data?.products ?? []).map((p) => p.category))];
  const shown = (data?.products ?? [])
    .filter((p) => cat === 'All' || p.category === cat)
    .filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

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
              {tenant?.name.replace(' Pvt. Ltd.', '')} · delivers tomorrow
            </span>
          </div>
          <div style={{ width: 42, height: 42, borderRadius: 21, background: '#f1e5d3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Shop size={20} color="#8e7358" />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--c-card)', border: '1px solid var(--c-line)', borderRadius: 12, padding: '13px 14px' }}>
          <Search size={17} color="var(--c-faint)" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ice cream, snacks…" style={{ border: 'none', background: 'transparent', padding: 0, fontSize: 14 }} />
        </div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
          {cats.map((c) => (
            <button key={c} className={'chip' + (cat === c ? ' on' : '')} style={{ flexShrink: 0 }} onClick={() => setCat(c)}>{c}</button>
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
              <div key={p.id} className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', opacity: out ? 0.6 : 1 }}>
                <div style={{ height: 88, background: out ? '#f2eae2' : ART_TINT[p.category] ?? '#f5ece0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ProductArt id={p.id} category={p.category} />
                </div>
                <div style={{ padding: '10px 11px 11px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.35 }}>{p.name}</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span className="disp" style={{ fontSize: 17, fontWeight: 600 }}>Rs {money(p.price)}</span>
                    <span style={{ fontSize: 11, color: 'var(--c-muted)' }}>/ {p.unit}</span>
                  </div>
                  <div style={{ flex: 1 }} />
                  {out ? (
                    <div style={{ height: 42, borderRadius: 10, background: '#f2eae2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#8e7358' }}>
                      Out of stock
                    </div>
                  ) : (
                    <div style={{ height: 42, borderRadius: 10, border: `1.5px solid ${qty > 0 ? 'var(--c-accent)' : '#e0d2be'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <button onClick={() => bump(p.id, -1)} style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Less">
                        <Minus size={15} color={qty > 0 ? 'var(--c-accent)' : '#cdbda9'} />
                      </button>
                      <span style={{ fontSize: 15, fontWeight: 600, color: qty > 0 ? 'var(--c-ink)' : '#cdbda9' }}>{qty}</span>
                      <button onClick={() => bump(p.id, 1)} style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="More">
                        <Plus size={15} color="var(--c-accent)" />
                      </button>
                    </div>
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
            width: '100%', height: 58, borderRadius: 14, display: 'flex', alignItems: 'center',
            padding: '0 8px 0 18px', gap: 12, textAlign: 'left',
            background: count ? 'var(--c-ink)' : 'var(--c-card)',
            border: count ? '1px solid var(--c-ink)' : '1px dashed #dccfba',
          }}
        >
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 11.5, color: count ? '#bfae9a' : 'var(--c-faint)' }}>
              {count ? `${count} item${count === 1 ? '' : 's'} in order` : 'Your order is empty'}
            </span>
            <span className="disp" style={{ fontSize: 19, fontWeight: 600, color: count ? '#fffdf8' : 'var(--c-faint)' }}>
              {count ? `Rs ${money(total)}` : 'Tap + to add'}
            </span>
          </div>
          {!!count && (
            <span style={{ height: 42, borderRadius: 10, background: 'var(--c-accent)', color: '#fffdf8', display: 'flex', alignItems: 'center', gap: 7, padding: '0 16px', fontSize: 14, fontWeight: 600 }}>
              Review <Chevron size={15} color="#fffdf8" />
            </span>
          )}
        </button>
      </div>
    </>
  );
}
