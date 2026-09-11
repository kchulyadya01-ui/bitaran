import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, STATUS_RANK, type OrderStatus } from '../../lib/db';
import { bs, money, resolveStatus, stamp, vatOf } from '../../lib/domain';
import { useShopRows } from '../../lib/hooks';
import { Van, Check, Whats, Chevron, Note } from '../../ui/icons';

const STEPS: { id: OrderStatus; label: string; blank: string }[] = [
  { id: 'placed', label: 'Order placed', blank: '' },
  { id: 'confirmed', label: 'Confirmed by dealer', blank: 'waiting for the dealer' },
  { id: 'out_for_delivery', label: 'Out for delivery', blank: 'not on the van yet' },
  { id: 'delivered', label: 'Delivered', blank: 'bill will arrive here' },
];

export default function Track() {
  const { id } = useParams();
  const nav = useNavigate();
  const shopRows = useShopRows();

  const data = useLiveQuery(async () => {
    if (!shopRows.length) return null;
    const ids = shopRows.map((r) => r.id);
    const orders = (await db.orders.where('customerId').anyOf(ids).toArray()).sort((a, b) => b.placedAt - a.placedAt);
    const order = id ? orders.find((o) => o.id === id) : orders[0];
    if (!order) return { order: null, orders };
    const [lines, events, products, invoice, supplier] = await Promise.all([
      db.orderLines.where('orderId').equals(order.id).toArray(),
      db.orderEvents.where('orderId').equals(order.id).toArray(),
      db.products.toArray(),
      db.invoices.where('customerId').anyOf(ids).toArray(),
      db.tenants.get(order.tenantId),
    ]);
    const byId = Object.fromEntries(products.map((p) => [p.id, p]));
    const priced = lines.map((l) => ({ ...l, name: byId[l.productId]?.name ?? '?', price: byId[l.productId]?.price ?? 0 }));
    const subtotal = priced.reduce((s, l) => s + l.qty * l.price, 0);
    return {
      order, orders, events, priced, supplier,
      status: resolveStatus(events),
      total: subtotal + vatOf(subtotal),
      invoice: invoice.find((i) => i.orderId === order.id),
    };
  }, [shopRows.map((r) => r.id).join(','), id]);

  if (!data) return <div className="scroll" style={{ padding: 24 }}><span className="lbl">loading</span></div>;
  if (!data.order) {
    return (
      <>
        <div style={{ padding: '20px 18px 14px' }}><span className="disp" style={{ fontSize: 22, fontWeight: 500 }}>Your orders</span></div>
        <div className="scroll" style={{ padding: '0 18px' }}>
          <div className="card" style={{ padding: 24, textAlign: 'center', fontSize: 13.5, color: 'var(--c-muted)' }}>
            No orders yet. Add a few items and place one.
          </div>
        </div>
      </>
    );
  }

  const { order, orders, status, priced, total, invoice, events, supplier } = data;
  const rank = STATUS_RANK[status!];
  const timeOf = (s: OrderStatus) => events!.find((e) => e.status === s)?.occurredAt;

  return (
    <>
      <div style={{ padding: '20px 18px 14px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span className="disp" style={{ fontSize: 21, fontWeight: 500 }}>
            Order {bs(order.placedAt).year}-{String(order.placedAt).slice(-4)}
          </span>
          <span style={{ fontSize: 12, color: 'var(--c-muted)' }}>
            {supplier?.name.replace(' Pvt. Ltd.', '')} · placed {stamp(order.placedAt)}
          </span>
        </div>
        {orders.length > 1 && (
          <button onClick={() => nav(`/shop/orders/${orders[(orders.findIndex((o) => o.id === order.id) + 1) % orders.length].id}`)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 600, color: 'var(--c-accent)' }}>
            Older <Chevron size={14} color="var(--c-accent)" />
          </button>
        )}
      </div>

      <div className="scroll" style={{ padding: '0 18px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--c-ok)', borderRadius: 24, padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 26, background: status === 'delivered' ? 'var(--c-ink)' : 'var(--c-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {status === 'delivered' ? <Check size={26} color="#fffdf8" /> : <Van size={26} color="#fffdf8" />}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="disp" style={{ fontSize: 20, fontWeight: 600, color: '#fffdf8' }}>
                {status === 'placed' ? 'Waiting for dealer' : status === 'confirmed' ? 'Confirmed' : status === 'out_for_delivery' ? 'On the way' : status === 'delivered' ? 'Delivered' : 'Cancelled'}
              </span>
              <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)' }}>
                {status === 'delivered'
                  ? 'thank you'
                  : order.deliverWindow
                    ? order.deliverWindow.toLowerCase()
                    : `from ${supplier?.name.replace(' Pvt. Ltd.', '') ?? ''}`}
              </span>
            </div>
          </div>

          {order.note && (
            <div className="card" style={{ padding: '14px 16px', display: 'flex', gap: 11, alignItems: 'flex-start' }}>
              <Note size={16} color="var(--c-accent)" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 11.5, color: 'var(--c-muted)' }}>Your note to the dealer</span>
                <span style={{ fontSize: 13.5, lineHeight: 1.45 }}>&ldquo;{order.note}&rdquo;</span>
              </div>
            </div>
          )}

          <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column' }}>
            {STEPS.map((s, i) => {
              const done = STATUS_RANK[s.id] <= rank;
              const current = STATUS_RANK[s.id] === rank;
              const at = timeOf(s.id);
              const last = i === STEPS.length - 1;
              return (
                <div key={s.id} style={{ display: 'flex', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 22 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 11,
                      background: done && !current ? 'var(--c-ok)' : 'var(--c-card)',
                      border: current ? '3px solid var(--c-accent)' : done ? 'none' : '2px solid #eadfcd',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {done && !current && <Check size={12} color="#fffdf8" w={3} />}
                    </div>
                    {!last && <div style={{ width: 2, flex: 1, minHeight: 34, background: done ? 'var(--c-ok)' : 'var(--c-line)' }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: last ? 0 : 22, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: current ? 'var(--c-accent)' : done ? 'var(--c-ink)' : 'var(--c-faint)' }}>{s.label}</span>
                    <span style={{ fontSize: 11.5, color: done ? 'var(--c-muted)' : 'var(--c-faint)' }}>
                      {at ? stamp(at) : s.blank}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 11 }}>
            {priced!.map((l) => (
              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                <span>{l.name} × {l.qty}</span>
                <span style={{ fontWeight: 600 }}>{money(l.qty * l.price)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 10, borderTop: '1px solid #f0e7d9' }}>
              <span style={{ fontSize: 13, color: 'var(--c-muted)' }}>{invoice ? `Bill ${invoice.number}` : 'Total with VAT'}</span>
              <span className="disp" style={{ fontSize: 20, fontWeight: 600 }}>Rs {money(invoice?.total ?? total!, true)}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 18px 18px', display: 'flex', gap: 10 }}>
        <a
          className="btn warm ghost" style={{ flex: 1, height: 54, textDecoration: 'none' }}
          href={`tel:${supplier?.phone ?? ''}`}
        >
          Call dealer
        </a>
        <a
          className="btn warm ghost" style={{ width: 54, height: 54, flex: 'none' }}
          href={`https://wa.me/977${(supplier?.phone ?? '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer" aria-label="WhatsApp"
        >
          <Whats size={19} color="var(--c-ink)" />
        </a>
      </div>
    </>
  );
}
