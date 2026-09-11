import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type OrderStatus } from '../../lib/db';
import { bs, money, resolveStatus, allBalances, dueLabel, setMeta, stamp } from '../../lib/domain';
import { useTenant, useTenantId, usePending, useOnline, useMeta } from '../../lib/hooks';
import MoreMenu from '../../ui/MoreMenu';
import { Sync, NoWifi, Plus, Clock, Van, Check, Chevron, Note, Menu } from '../../ui/icons';

type Tab = 'new' | 'billed' | 'out' | 'done';

const TAB_OF: Record<OrderStatus, Tab | null> = {
  placed: 'new', confirmed: 'billed', out_for_delivery: 'out', delivered: 'done', cancelled: null,
};

type Row = {
  shop: string; deliverBy?: number; placedAt: number; amount: number;
};

type SortId = 'due' | 'newest' | 'oldest' | 'amount' | 'shop';

/** An order with no promised deadline sorts after every order that has one. */
const FAR = Number.MAX_SAFE_INTEGER;

const SORTS: { id: SortId; label: string; hint: string; cmp: (a: Row, b: Row) => number }[] = [
  { id: 'due', label: 'Delivery due', hint: 'soonest deadline first', cmp: (a, b) => (a.deliverBy ?? FAR) - (b.deliverBy ?? FAR) },
  { id: 'newest', label: 'Order time · newest', hint: 'what just came in', cmp: (a, b) => b.placedAt - a.placedAt },
  { id: 'oldest', label: 'Order time · oldest', hint: 'waiting longest first', cmp: (a, b) => a.placedAt - b.placedAt },
  { id: 'amount', label: 'Amount', hint: 'biggest order first', cmp: (a, b) => b.amount - a.amount },
  { id: 'shop', label: 'Shop name', hint: 'A to Z', cmp: (a, b) => a.shop.localeCompare(b.shop) },
];

export default function Today() {
  const nav = useNavigate();
  const tenant = useTenant();
  const tenantId = useTenantId();
  const pending = usePending();
  const online = useOnline();
  const [tab, setTab] = useState<Tab>('new');
  const [sortOpen, setSortOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Kept in Dexie so the choice survives making a bill and coming back.
  const sortId = useMeta<SortId>('orderSort') ?? 'due';
  const sort = SORTS.find((s) => s.id === sortId) ?? SORTS[0];

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
          deliverBy: o.deliverBy,
          deliverWindow: o.deliverWindow,
          note: o.note,
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
  const visible = (data?.rows ?? []).filter((r) => TAB_OF[r.status] === tab).sort(sort.cmp);

  return (
    <>
      <header className="topbar" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="More"
              style={{
                width: 34, height: 34, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 999,
              }}
            >
              <Menu size={17} color="var(--ink)" />
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <div className="title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {tenant?.name.replace(' Pvt. Ltd.', '') ?? 'Loading'}
              </div>
              <div className="num" style={{ fontSize: 11, color: 'var(--muted)' }}>
                {tenant?.address.split(',').pop()?.trim()} · {bs().ymd}
              </div>
            </div>
          </div>
          <Link
            to="/sync"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', textDecoration: 'none', borderRadius: 999,
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

      <MoreMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="scroll">
        <div style={{ padding: 19, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, background: 'var(--ink)', color: '#fff', padding: 18, borderRadius: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Orders today</div>
              <div className="num" style={{ fontSize: 34, fontWeight: 600, lineHeight: 1, marginTop: 4 }}>{data?.todaysOrders.length ?? 0}</div>
            </div>
            <div className="card" style={{ flex: 1.4, padding: 18 }}>
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
                <span className="num" style={{ fontSize: 15, fontWeight: 600, color: tab === id ? '#fff' : 'var(--muted)' }}>{counts[id]}</span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: -4 }}>
            <span className="lbl">{visible.length} order{visible.length === 1 ? '' : 's'}</span>
            <button
              onClick={() => setSortOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', border: '1px solid var(--line)', background: 'var(--card)', borderRadius: 999 }}
            >
              <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>Sort</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{sort.label}</span>
              <span style={{ display: 'flex', transform: 'rotate(90deg)' }}><Chevron size={13} color="var(--muted)" /></span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: -6 }}>
            {visible.map((r) => {
              const hot = r.status === 'placed';
              const tone = hot ? 'var(--accent)' : r.status === 'confirmed' ? 'var(--ok)' : r.status === 'out_for_delivery' ? 'var(--warn)' : '#c9c9c2';
              return (
                <button
                  key={r.id}
                  onClick={() => (r.invoice ? nav(`/invoice/${r.invoice.id}`) : nav(`/bill/${r.id}`))}
                  className="card"
                  style={{ padding: '13px 14px', display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, width: '100%' }}>
                    <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{r.shop}</span>
                    <span className="num" style={{ fontSize: 15, fontWeight: 600 }}>{money(r.amount)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%' }}>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {r.itemCount} items · {r.invoice ? r.invoice.number : 'no bill yet'}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '4px 9px', borderRadius: 999,
                      border: `1px solid ${tone}`, color: hot ? '#fff' : tone, background: hot ? 'var(--accent)' : 'transparent',
                    }}>
                      {hot ? 'MAKE BILL' : r.status === 'confirmed' ? 'BILLED' : r.status === 'out_for_delivery' ? 'ON VAN' : 'DONE'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%', paddingTop: 6, borderTop: '1px solid var(--hair)', marginTop: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={13} color="var(--muted)" />
                      <span className="num" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                        ordered {stamp(r.placedAt)}
                      </span>
                    </div>
                    {r.note && (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                        <Note size={13} color="var(--warn)" />
                        <span style={{ fontSize: 11.5, color: 'var(--ink)', lineHeight: 1.45 }}>
                          &ldquo;{r.note}&rdquo;
                        </span>
                      </div>
                    )}
                    {r.deliverBy && r.status !== 'delivered' && (() => {
                      const due = dueLabel(r.deliverBy);
                      const c = due.tone === 'bad' ? 'var(--bad)' : due.tone === 'warn' ? 'var(--warn)' : 'var(--muted)';
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Van size={13} color={c} />
                          <span className="num" style={{ fontSize: 11.5, color: c, fontWeight: due.tone === 'muted' ? 400 : 600 }}>
                            deliver {due.text}
                          </span>
                        </div>
                      );
                    })()}
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

      {sortOpen && (
        <div className="sheet-back" onClick={() => setSortOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Sort orders by</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--line)' }}>
              {SORTS.map((o) => (
                <button
                  key={o.id}
                  onClick={() => { setMeta('orderSort', o.id); setSortOpen(false); }}
                  className="row"
                  style={{ textAlign: 'left' }}
                >
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 14.5, fontWeight: o.id === sortId ? 600 : 500 }}>{o.label}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{o.hint}</span>
                  </div>
                  {o.id === sortId && <Check size={18} color="var(--ok)" />}
                </button>
              ))}
            </div>
            <button className="btn ghost" onClick={() => setSortOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}
