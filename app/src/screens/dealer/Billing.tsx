import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Customer, type Order, type Product } from '../../lib/db';
import { addCustomer, allStock, currentPosition, issueInvoice, money, peekNextInvoiceNumber, stamp, vatOf } from '../../lib/domain';
import { useActiveUser, useOnline, useTenantId, useToast } from '../../lib/hooks';
import { Back, Plus, Minus, Receipt, Alert, NoWifi, Sync, Search, Pin, Check, Clock } from '../../ui/icons';

export default function Billing() {
  const { orderId } = useParams();
  const nav = useNavigate();
  const tenantId = useTenantId();
  const user = useActiveUser();
  const online = useOnline();
  const [toast, setToast] = useToast();

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [mode, setMode] = useState<'cash' | 'credit'>('cash');
  const [picker, setPicker] = useState<'none' | 'customer' | 'product' | 'newCustomer'>('none');
  const [newShop, setNewShop] = useState({ shopName: '', contactName: '', phone: '', pan: '', address: '' });
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [pinning, setPinning] = useState(false);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [fromOrder, setFromOrder] = useState<Order | null>(null);

  // The bill carries the moment it was issued, so show that moment ticking
  // while it is being made — no one should have to guess what will be stamped.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const base = useLiveQuery(async () => {
    if (!tenantId) return null;
    const [products, customers, stock] = await Promise.all([
      db.products.where('tenantId').equals(tenantId).toArray(),
      db.customers.where('tenantId').equals(tenantId).toArray(),
      allStock(tenantId),
    ]);
    return { products, customers, stock };
  }, [tenantId]);

  const nextNumber = useLiveQuery(
    async () => (tenantId && user ? peekNextInvoiceNumber(tenantId, user.prefix ?? 'A') : ''),
    [tenantId, user?.prefix],
  );

  // Seed the draft from the customer order, if we came from one.
  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    (async () => {
      const order = await db.orders.get(orderId);
      const lines = await db.orderLines.where('orderId').equals(orderId).toArray();
      if (cancelled || !order) return;
      setFromOrder(order);
      setCustomerId(order.customerId);
      setQty(Object.fromEntries(lines.map((l) => [l.productId, l.qty])));
    })();
    return () => { cancelled = true; };
  }, [orderId]);

  const customer: Customer | undefined = useMemo(
    () => base?.customers.find((c) => c.id === customerId),
    [base, customerId],
  );

  const lines = useMemo(() => {
    if (!base) return [];
    return Object.entries(qty)
      .filter(([, q]) => q > 0)
      .map(([id, q]) => ({ product: base.products.find((p) => p.id === id)!, qty: q }))
      .filter((l) => l.product);
  }, [qty, base]);

  const subtotal = lines.reduce((s, l) => s + l.qty * l.product.price, 0);
  const vat = vatOf(subtotal);
  const total = Math.round((subtotal + vat) * 100) / 100;

  const bump = (id: string, d: number) =>
    setQty((q) => ({ ...q, [id]: Math.max(0, (q[id] ?? 0) + d) }));

  const dueAlready = useLiveQuery(async () => {
    if (!customerId) return 0;
    const invs = await db.invoices.where('customerId').equals(customerId).toArray();
    const pays = await db.payments.where('customerId').equals(customerId).toArray();
    const billed = invs.filter((i) => i.status === 'issued' && i.paymentType === 'credit').reduce((s, i) => s + i.total, 0);
    return billed - pays.reduce((s, p) => s + p.amount, 0);
  }, [customerId], 0);

  const blocked = !customer || !customer.pan || !lines.length || busy;

  async function issue() {
    if (blocked || !tenantId || !customer) return;
    setBusy(true);
    try {
      const inv = await issueInvoice({
        tenantId,
        customerId: customer.id,
        buyerPan: customer.pan,
        lines,
        paymentType: mode,
        orderId,
      });
      nav(`/invoice/${inv.id}`, { replace: true });
    } catch (e) {
      console.error(e);
      setToast('Could not issue the bill');
      setBusy(false);
    }
  }

  async function saveNewShop() {
    if (!tenantId) return;
    const c = await addCustomer({
      tenantId,
      ...newShop,
      lat: pin?.lat,
      lng: pin?.lng,
    });
    setCustomerId(c.id);
    setNewShop({ shopName: '', contactName: '', phone: '', pan: '', address: '' });
    setPin(null);
    setPicker('none');
    setToast(`${c.shopName} added`);
  }

  const newShopReady = newShop.shopName.trim().length > 1 && newShop.pan.trim().length >= 9;

  const filtered = (base?.products ?? []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <header className="topbar">
        <button onClick={() => nav(-1)} aria-label="Back"><Back size={22} /></button>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>New bill</div>
          <div className="num" style={{ fontSize: 11, color: 'var(--muted)' }}>{nextNumber} · {stamp(now)}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 8px', border: '1px solid var(--line)' }}>
          {online ? <Sync size={13} color="var(--ok)" /> : <NoWifi size={13} color="var(--bad)" />}
          <span style={{ fontSize: 11, fontWeight: 600, color: online ? 'var(--ok)' : 'var(--bad)' }}>
            {online ? 'Online' : 'Offline'}
          </span>
        </div>
      </header>

      <div className="scroll">
        {fromOrder && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 16px', background: 'var(--paper)', borderBottom: '1px solid var(--line)' }}>
            <Clock size={14} color="var(--muted)" />
            <span className="num" style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4 }}>
              From the shop's order · placed {stamp(fromOrder.placedAt)}
              {fromOrder.deliverWindow ? ` · ${fromOrder.deliverWindow.toLowerCase()}` : ''}
            </span>
          </div>
        )}
        <button
          onClick={() => setPicker('customer')}
          style={{ width: '100%', padding: '14px 16px', background: 'var(--card)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}
        >
          <div style={{ width: 40, height: 40, background: customer ? 'var(--ink)' : '#c9c9c2', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, flexShrink: 0 }}>
            {customer ? customer.shopName.slice(0, 2).toUpperCase() : '?'}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{customer?.shopName ?? 'Choose a shop'}</div>
            {customer ? (
              <div className="num" style={{ fontSize: 11, color: customer.pan ? 'var(--ok)' : 'var(--bad)', fontWeight: 500 }}>
                {customer.pan ? `PAN ${customer.pan} · verified` : 'No PAN on file — cannot bill'}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>A bill needs a buyer with a PAN</div>
            )}
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textDecoration: 'underline' }}>
            {customer ? 'Change' : 'Pick'}
          </span>
        </button>

        <div className="rows">
          {lines.map((l) => {
            const have = base?.stock[l.product.id] ?? 0;
            const over = l.qty > have;
            return (
              <div key={l.product.id} style={{ background: 'var(--card)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{l.product.name}</span>
                    <span className="num" style={{ fontSize: 11, color: 'var(--muted)' }}>Rs {money(l.product.price)} / {l.product.unit}</span>
                  </div>
                  <span className="num" style={{ fontSize: 15, fontWeight: 600 }}>{money(l.qty * l.product.price)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="stepper">
                    <button onClick={() => bump(l.product.id, -1)} style={{ borderRight: '1px solid var(--ink)' }}><Minus size={16} /></button>
                    <span className="v num">{l.qty}</span>
                    <button onClick={() => bump(l.product.id, 1)} style={{ borderLeft: '1px solid var(--ink)', background: 'var(--ink)' }}><Plus size={16} color="#fff" /></button>
                  </div>
                  <span className="num" style={{ fontSize: 11, fontWeight: over ? 600 : 400, color: over ? 'var(--bad)' : 'var(--muted)' }}>
                    {over ? `only ${have} in stock` : `${have} in stock`}
                  </span>
                </div>
              </div>
            );
          })}
          <button onClick={() => { setSearch(''); setPicker('product'); }} style={{ background: 'var(--card)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={18} color="var(--ok)" />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ok)' }}>Add item</span>
          </button>
        </div>
      </div>

      <div className="footer">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)' }}>
            <span>Taxable amount</span><span className="num" style={{ color: 'var(--ink)' }}>{money(subtotal, true)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)' }}>
            <span>VAT 13%</span><span className="num" style={{ color: 'var(--ink)' }}>{money(vat, true)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 8, borderTop: '1px solid var(--line)' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Total</span>
            <span className="num" style={{ fontSize: 26, fontWeight: 600 }}>{money(total, true)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', border: '1px solid var(--ink)' }}>
          {(['cash', 'credit'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1, height: 48, fontSize: 14, fontWeight: 600,
                background: mode === m ? 'var(--ink)' : 'var(--card)',
                color: mode === m ? '#fff' : 'var(--muted)',
              }}
            >
              {m === 'cash' ? 'Cash' : 'Credit · pay later'}
            </button>
          ))}
        </div>

        {mode === 'credit' && dueAlready > 0 && (
          <div style={{ display: 'flex', gap: 8, padding: '10px 12px', background: 'var(--bad-soft)', borderLeft: '3px solid var(--bad)' }}>
            <Alert size={15} color="var(--bad)" />
            <span className="num" style={{ fontSize: 12, color: 'var(--bad)', lineHeight: 1.45 }}>
              Shop already owes {money(dueAlready)}
            </span>
          </div>
        )}

        {customer && !customer.pan && (
          <div style={{ display: 'flex', gap: 8, padding: '10px 12px', background: 'var(--bad-soft)', borderLeft: '3px solid var(--bad)' }}>
            <Alert size={15} color="var(--bad)" />
            <span style={{ fontSize: 12, color: 'var(--bad)', lineHeight: 1.45 }}>
              This shop has no PAN. A bill without a buyer PAN is a defective invoice — add it first.
            </span>
          </div>
        )}

        <button className="btn" disabled={blocked} onClick={issue}>
          <Receipt size={18} color="#fff" />
          {busy ? 'Issuing…' : `Issue bill · ${money(total, true)}`}
        </button>
        <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.4 }}>
          Saved on this phone now, sent when signal returns
        </div>
      </div>

      {(picker === 'customer' || picker === 'product') && (
        <div className="sheet-back" onClick={() => setPicker('none')}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {picker === 'customer' ? 'Which shop?' : 'Add an item'}
            </div>
            {picker === 'customer' && (
              <button
                onClick={() => setPicker('newCustomer')}
                style={{ display: 'flex', alignItems: 'center', gap: 11, border: '1.5px dashed #b9b9b2', padding: 14, textAlign: 'left' }}
              >
                <div style={{ width: 34, height: 34, background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Plus size={17} color="#fff" />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>New shop</span>
                  <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>name, PAN and location</span>
                </div>
              </button>
            )}
            {picker === 'product' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'var(--paper)', border: '1px solid var(--line)', padding: '12px 13px' }}>
                <Search size={16} color="var(--muted)" />
                <input
                  autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search items" style={{ border: 'none', background: 'transparent', padding: 0 }}
                />
              </div>
            )}
            <div style={{ maxHeight: '50vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--line)' }}>
              {picker === 'customer'
                ? (base?.customers ?? []).map((c) => (
                    <button key={c.id} onClick={() => { setCustomerId(c.id); setPicker('none'); }} className="row" style={{ textAlign: 'left' }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontSize: 14.5, fontWeight: 600 }}>{c.shopName}</span>
                        <span className="num" style={{ fontSize: 11, color: c.pan ? 'var(--muted)' : 'var(--bad)' }}>
                          {c.pan ? `PAN ${c.pan}` : 'no PAN'} · {c.address}
                        </span>
                      </div>
                    </button>
                  ))
                : filtered.map((p: Product) => (
                    <button key={p.id} onClick={() => { bump(p.id, 1); setPicker('none'); }} className="row" style={{ textAlign: 'left' }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontSize: 14.5, fontWeight: 600 }}>{p.name}</span>
                        <span className="num" style={{ fontSize: 11, color: 'var(--muted)' }}>
                          Rs {money(p.price)} / {p.unit} · {base?.stock[p.id] ?? 0} in stock
                        </span>
                      </div>
                      <Plus size={18} color="var(--ok)" />
                    </button>
                  ))}
            </div>
            <button className="btn ghost" onClick={() => setPicker('none')}>Close</button>
          </div>
        </div>
      )}

      {picker === 'newCustomer' && (
        <div className="sheet-back" onClick={() => setPicker('customer')}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>New shop</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>
                PAN is required — a bill to a shop without one is a defective invoice.
              </div>
            </div>

            <input
              autoFocus value={newShop.shopName}
              onChange={(e) => setNewShop({ ...newShop, shopName: e.target.value })}
              placeholder="Shop name"
            />
            <input
              className="num" value={newShop.pan} inputMode="numeric"
              onChange={(e) => setNewShop({ ...newShop, pan: e.target.value.replace(/\D/g, '').slice(0, 9) })}
              placeholder="Buyer PAN (9 digits)"
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                style={{ flex: 1 }} value={newShop.contactName}
                onChange={(e) => setNewShop({ ...newShop, contactName: e.target.value })}
                placeholder="Owner name"
              />
              <input
                style={{ flex: 1 }} className="num" inputMode="tel" value={newShop.phone}
                onChange={(e) => setNewShop({ ...newShop, phone: e.target.value.replace(/[^0-9+]/g, '').slice(0, 15) })}
                placeholder="Phone"
              />
            </div>
            <input
              value={newShop.address}
              onChange={(e) => setNewShop({ ...newShop, address: e.target.value })}
              placeholder="Area or tole"
            />

            <button
              onClick={async () => {
                setPinning(true);
                const pos = await currentPosition();
                setPinning(false);
                if (pos) setPin(pos);
                else setToast('Could not get location — you can pin it later');
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 11, padding: 14, textAlign: 'left',
                border: `1.5px solid ${pin ? 'var(--ok)' : 'var(--line)'}`,
                background: pin ? '#eef2ee' : 'var(--card)',
              }}
            >
              {pin ? <Check size={18} color="var(--ok)" /> : <Pin size={18} color="var(--muted)" />}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: pin ? 'var(--ok)' : 'var(--ink)' }}>
                  {pin ? 'Location pinned' : pinning ? 'Finding you…' : 'Pin location here'}
                </span>
                <span className="num" style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {pin ? `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}` : 'stand at the shop and tap — optional'}
                </span>
              </div>
            </button>

            <button className="btn" disabled={!newShopReady} onClick={saveNewShop}>
              {newShopReady ? 'Save shop' : 'Name and PAN needed'}
            </button>
            <button className="btn ghost" onClick={() => setPicker('customer')}>Back</button>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
