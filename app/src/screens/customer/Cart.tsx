import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { bs, money, placeOrder, vatOf } from '../../lib/domain';
import { useActiveCustomer, useOnline, useTenantId } from '../../lib/hooks';
import { useCart } from '../../lib/cart';
import { Back, Plus, Minus, Info } from '../../ui/icons';

const DAY = 86_400_000;

export default function Cart() {
  const nav = useNavigate();
  const tenantId = useTenantId();
  const customer = useActiveCustomer();
  const online = useOnline();
  const { cart, bump, clear } = useCart();
  const [day, setDay] = useState('tom');
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const products = useLiveQuery(
    async () => (tenantId ? db.products.where('tenantId').equals(tenantId).toArray() : []),
    [tenantId], [],
  );

  const lines = Object.entries(cart)
    .map(([id, qty]) => ({ product: products.find((p) => p.id === id)!, qty }))
    .filter((l) => l.product && l.qty > 0);

  const subtotal = lines.reduce((s, l) => s + l.qty * l.product.price, 0);
  const vat = vatOf(subtotal);
  const total = Math.round((subtotal + vat) * 100) / 100;

  const days = [
    { id: 'tom', label: 'Tomorrow', sub: bs(Date.now() + DAY).dayMonth },
    { id: 'd2', label: bs(Date.now() + 2 * DAY).dayMonth, sub: new Date(Date.now() + 2 * DAY).toLocaleDateString([], { weekday: 'long' }) },
    { id: 'pick', label: 'Pick day', sub: 'calendar' },
  ];

  async function submit() {
    if (!tenantId || !customer || !lines.length || busy) return;
    setBusy(true);
    const id = await placeOrder({
      tenantId,
      customerId: customer.id,
      lines: lines.map((l) => ({ productId: l.product.id, qty: l.qty })),
      wantedOn: days.find((d) => d.id === day)?.label,
      note: note || undefined,
    });
    clear();
    nav(`/shop/orders/${id}`, { replace: true });
  }

  return (
    <>
      <div style={{ padding: '20px 18px 12px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={() => nav(-1)} aria-label="Back"><Back size={22} color="var(--c-ink)" /></button>
        <span className="disp" style={{ fontSize: 22, fontWeight: 500 }}>Your order</span>
      </div>

      <div className="scroll" style={{ padding: '0 18px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ overflow: 'hidden' }}>
            {lines.map((l, i) => (
              <div key={l.product.id} style={{ padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 10, borderTop: i ? '1px solid #f0e7d9' : 'none' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{l.product.name}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--c-muted)' }}>Rs {money(l.product.price)} / {l.product.unit}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ height: 38, borderRadius: 9, border: '1.5px solid var(--c-accent)', display: 'flex', alignItems: 'center' }}>
                    <button onClick={() => bump(l.product.id, -1)} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Less"><Minus size={14} color="var(--c-accent)" /></button>
                    <span style={{ minWidth: 26, textAlign: 'center', fontSize: 14.5, fontWeight: 600 }}>{l.qty}</span>
                    <button onClick={() => bump(l.product.id, 1)} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="More"><Plus size={14} color="var(--c-accent)" /></button>
                  </div>
                  <span className="disp" style={{ minWidth: 56, textAlign: 'right', fontSize: 16, fontWeight: 600 }}>{money(l.qty * l.product.price)}</span>
                </div>
              </div>
            ))}
            {!lines.length && <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--c-muted)' }}>Nothing in the order yet</div>}
          </div>

          <div className="card" style={{ padding: '15px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--c-muted)' }}>When do you want it?</span>
            <div style={{ display: 'flex', gap: 9 }}>
              {days.map((d) => (
                <button
                  key={d.id} onClick={() => setDay(d.id)}
                  style={{
                    flex: 1, minHeight: 56, borderRadius: 11, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 3,
                    border: `1.5px solid ${day === d.id ? 'var(--c-accent)' : 'var(--c-line)'}`,
                    background: day === d.id ? '#fdf2ea' : 'var(--c-card)',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{d.label}</span>
                  <span style={{ fontSize: 11, color: day === d.id ? 'var(--c-accent)' : 'var(--c-faint)' }}>{d.sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: '15px 16px' }}>
            {noteOpen ? (
              <input autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for the dealer" style={{ border: 'none', background: 'transparent', padding: 0, fontSize: 14 }} />
            ) : (
              <button onClick={() => setNoteOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left' }}>
                <Info size={17} color="var(--c-faint)" />
                <span style={{ fontSize: 13.5, color: note ? 'var(--c-ink)' : 'var(--c-faint)' }}>{note || 'Add a note for the dealer'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 18px 18px', display: 'flex', flexDirection: 'column', gap: 13 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--c-muted)' }}>
            <span>Items</span><span style={{ color: 'var(--c-ink)' }}>Rs {money(subtotal, true)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--c-muted)' }}>
            <span>VAT 13%</span><span style={{ color: 'var(--c-ink)' }}>Rs {money(vat, true)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 9, borderTop: '1px solid var(--c-line)' }}>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>Total</span>
            <span className="disp" style={{ fontSize: 26, fontWeight: 600 }}>Rs {money(total, true)}</span>
          </div>
        </div>

        <button className="btn warm" disabled={!lines.length || busy} onClick={submit}>
          {busy ? 'Sending…' : 'Place order · अर्डर पठाउनुहोस्'}
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, justifyContent: 'center' }}>
          <Info size={14} color="#8e7358" />
          <span style={{ fontSize: 11.5, color: '#8e7358', lineHeight: 1.45, textAlign: 'center' }}>
            {online ? 'Sent straight away. No signal? It waits on your phone and sends itself.' : 'No signal — the order waits on your phone and sends itself.'}
          </span>
        </div>
      </div>
    </>
  );
}
