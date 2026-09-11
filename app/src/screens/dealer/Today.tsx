import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type OrderStatus } from '../../lib/db';
import { bs, money, resolveStatus, allBalances } from '../../lib/domain';
import { useTenant, useTenantId, usePending, useOnline } from '../../lib/hooks';
import { Sync, NoWifi, Plus } from '../../ui/icons';

type Tab = 'new' | 'billed' | 'out' | 'done';

const TAB_OF: Record<OrderStatus, Tab | null> = {
  placed: 'new', confirmed: 'billed', out_for_delivery: 'out', delivered: 'done', cancelled: null,
};

export default function Today() {
  const nav = useNavigate();
  const tenant = useTenant();
  const tenantId = useTenantId();
  const pending = usePending();
  const online = useOnline();
  const [tab, setTab] = useState<Tab>('new');

  const data = useLiveQuery(async () => {
    if (!tenantId) return null;
    const [orders, customers, products, invoices] = await Promise.all([
      db.orders.where('tenantId').equals(tenantId).toArray(),
      db.customers.where('tenantId').equals(tenantId).toArray(),
      db.products.where('tenantId').equals(tenantId).toArray(),
      db.invoices.where('tenantId').equals(tenantId).toArray(),
    ]);
    const byCustomer = Object.fromEntries(customers.map((c) => [c.id, c]));
    const byProduct = Object.fromEntries(products.map((p) => [p.id, p]));
    const rows = await Promise.all(
      orders.map(async (o) => {
        const [lines, events] = await Promise.all([
          db.orderLines.where('orderId').equals(o.id).toArray(),
          db.orderEvents.where('orderId').equals(o.id).toArray(),
        ]);
        const status = resolveStatus(events);
        const invoice = invoices.find((i) => i.orderId === o.id && i.status === 'issued');
        const subtotal = lines.reduce((s, l) => s + l.qty * (byProduct[l.productId]?.price ?? 0), 0);
        return {
          id: o.id,
          shop: byCustomer[o.customerId]?.shopName ?? 'Unknown shop',
          customerId: o.customerId,
          itemCount: lines.length,
          placedAt: o.placedAt,
          status,
          invoice,
          amount: invoice ? invoice.total : Math.round(subtotal * 1.13 * 100) / 100,
        };
      }),
    );
    const balances = await allBalances(tenantId);
    const overdue = Object.values(balances).reduce((s, b) => s + Math.max(0, b.due), 0);
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const todaysOrders = rows.filter((r) => r.placedAt >= startOfDay.getTime());
    const toCollect = rows
      .filter((r) => r.status !== 'delivered' && r.status !== 'cancelled')
      .reduce((s, r) => s + r.amount, 0);
    return { rows, todaysOrders, toCollect, overdue };
  }, [tenantId]);

  const counts: Record<Tab, number> = { new: 0, billed: 0, out: 0, done: 0 };
  for (const r of data?.rows ?? []) {
    const t = TAB_OF[r.status];
    if (t) counts[t] += 1;
  }
  const visible = (data?.rows ?? []).filter((r) => TAB_OF[r.status] === tab);

  return (
    <>
      <header className="topbar" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <div className="title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {tenant?.name.replace(' Pvt. Ltd.', '') ?? 'Loading'}
            </div>
            <div className="num" style={{ fontSize: 11, color: 'var(--muted)' }}>
              {tenant?.address.split(',').pop()?.trim()} · {bs().ymd}
            </div>
          </div>
          <Link
            to="/sync"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', textDecoration: 'none',
              background: pending ? '#fdf6e3' : '#eef2ee',
              border: `1px solid ${pending ? '#e8d9a8' : '#cfe0d5'}`,
            }}
          >
            {online ? <Sync size={14} color={pending ? '#8a5a00' : 'var(--ok)'} /> : <NoWifi size={14} color="var(--bad)" />}
            <span className="num" style={{ fontSize: 12, fontWeight: 600, color: pending ? '#8a5a00' : 'var(--ok)' }}>
              {pending ? `${pending} pending` : 'synced'}
            </span>
          </Link>
        </div>
      </header>

      <div className="scroll">
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, background: 'var(--ink)', color: '#fff', padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Orders today</div>
              <div className="num" style={{ fontSize: 34, fontWeight: 600, lineHeight: 1, marginTop: 4 }}>{data?.todaysOrders.length ?? 0}</div>
            </div>
            <div className="card" style={{ flex: 1.4, padding: 14 }}>
              <div className="lbl">To collect</div>
              <div className="num" style={{ fontSize: 26, fontWeight: 600, lineHeight: 1, marginTop: 4 }}>{money(data?.toCollect ?? 0)}</div>
              {!!data?.overdue && (
                <div className="num" style={{ fontSize: 11, color: 'var(--bad)', fontWeight: 500, marginTop: 4 }}>
                  + {money(data.overdue)} overdue
                </div>
              )}
            </div>
          </div>

          <div className="tabs">
            {([['new', 'New'], ['billed', 'Billed'], ['out', 'On van'], ['done', 'Done']] as [Tab, string][]).map(([id, label]) => (
              <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
                <span>{label}</span>
                <span className="num" style={{ fontSize: 15, fontWeight: 600, color: tab === id ? 'var(--ink)' : 'var(--muted)' }}>{counts[id]}</span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {visible.map((r) => {
              const hot = r.status === 'placed';
              const tone = hot ? 'var(--ink)' : r.status === 'confirmed' ? 'var(--ok)' : r.status === 'out_for_delivery' ? 'var(--warn)' : '#c9c9c2';
              return (
                <button
                  key={r.id}
                  onClick={() => (r.invoice ? nav(`/invoice/${r.invoice.id}`) : nav(`/bill/${r.id}`))}
                  className="card"
                  style={{ borderLeft: `3px solid ${tone}`, padding: '13px 14px', display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, width: '100%' }}>
                    <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{r.shop}</span>
                    <span className="num" style={{ fontSize: 15, fontWeight: 600 }}>{money(r.amount)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%' }}>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {r.itemCount} items · {r.invoice ? r.invoice.number : new Date(r.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '4px 7px',
                      border: `1px solid ${tone}`, color: hot ? '#fff' : tone, background: hot ? 'var(--ink)' : 'transparent',
                    }}>
                      {hot ? 'MAKE BILL' : r.status === 'confirmed' ? 'BILLED' : r.status === 'out_for_delivery' ? 'ON VAN' : 'DONE'}
                    </span>
                  </div>
                </button>
              );
            })}
            {!visible.length && <div className="empty">Nothing here right now</div>}
          </div>

          <button className="btn" onClick={() => nav('/bill')}>
            <Plus size={18} color="#fff" />
            New bill · बिल बनाउने
          </button>
        </div>
      </div>
    </>
  );
}
