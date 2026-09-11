import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { allStock, dueLabel, markOrderStatus, money, resolveStatus, setPicked, stamp } from '../../lib/domain';
import { useTenantId, useToast } from '../../lib/hooks';
import { Check, Van, Alert, Clock, Receipt } from '../../ui/icons';

type View = 'item' | 'order';

/** An order with no promised deadline is packed after every order that has one. */
const FAR = Number.MAX_SAFE_INTEGER;

type Line = { orderId: string; productId: string; qty: number };

function Tick({ on, half, size = 28 }: { on: boolean; half?: boolean; size?: number }) {
  return (
    <div
      style={{
        width: size, height: size, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1.5px solid ${on ? 'var(--ok)' : half ? 'var(--warn)' : '#c9c9c2'}`,
        background: on ? 'var(--ok)' : 'var(--card)',
      }}
    >
      {on
        ? <Check size={size - 10} color="#fff" />
        : half
          ? <div style={{ width: size - 16, height: 2, background: 'var(--warn)' }} />
          : null}
    </div>
  );
}

export default function Pack() {
  const nav = useNavigate();
  const tenantId = useTenantId();
  const [toast, setToast] = useToast();
  const [view, setView] = useState<View>('item');

  const data = useLiveQuery(async () => {
    if (!tenantId) return null;
    const [orders, customers, products, invoices, picks, stock] = await Promise.all([
      db.orders.where('tenantId').equals(tenantId).toArray(),
      db.customers.where('tenantId').equals(tenantId).toArray(),
      db.products.where('tenantId').equals(tenantId).toArray(),
      db.invoices.where('tenantId').equals(tenantId).toArray(),
      db.picks.where('tenantId').equals(tenantId).toArray(),
      allStock(tenantId),
    ]);
    const byCustomer = Object.fromEntries(customers.map((c) => [c.id, c]));
    const byProduct = Object.fromEntries(products.map((p) => [p.id, p]));
    const pickedIds = new Set(picks.map((p) => p.id));

    const rows = await Promise.all(
      orders.map(async (o) => {
        const [lines, events] = await Promise.all([
          db.orderLines.where('orderId').equals(o.id).toArray(),
          db.orderEvents.where('orderId').equals(o.id).toArray(),
        ]);
        const invoice = invoices.find((i) => i.orderId === o.id && i.status === 'issued');
        return {
          id: o.id,
          shop: byCustomer[o.customerId]?.shopName ?? 'Unknown shop',
          area: byCustomer[o.customerId]?.address ?? '',
          placedAt: o.placedAt,
          deliverBy: o.deliverBy,
          status: resolveStatus(events),
          invoice,
          lines: lines.map((l) => ({
            orderId: o.id,
            productId: l.productId,
            qty: l.qty,
            name: byProduct[l.productId]?.name ?? 'Unknown item',
            unit: byProduct[l.productId]?.unit ?? '',
            picked: pickedIds.has(`${o.id}:${l.productId}`),
          })),
        };
      }),
    );

    // The pack list is everything that has not left the shop yet. An order
    // still waiting for its bill belongs here too — the goods get pulled off
    // the shelf either way, the bill just has to exist before the van moves.
    const packing = rows
      .filter((r) => r.status === 'placed' || r.status === 'confirmed')
      .sort((a, b) => (a.deliverBy ?? FAR) - (b.deliverBy ?? FAR));

    // Same lines, seen from the store room: one row per item, every order's
    // quantity added up, so a run to the cold store happens once per item.
    const items = new Map<string, {
      productId: string; name: string; unit: string;
      qty: number; shops: number; lines: Line[]; picked: number;
    }>();
    for (const o of packing) {
      for (const l of o.lines) {
        const row = items.get(l.productId) ?? {
          productId: l.productId, name: l.name, unit: l.unit,
          qty: 0, shops: 0, lines: [], picked: 0,
        };
        row.qty += l.qty;
        row.shops += 1;
        row.lines.push({ orderId: l.orderId, productId: l.productId, qty: l.qty });
        if (l.picked) row.picked += 1;
        items.set(l.productId, row);
      }
    }

    const allLines = packing.flatMap((o) => o.lines);
    return {
      packing,
      stock,
      items: [...items.values()].sort((a, b) => a.name.localeCompare(b.name)),
      total: allLines.length,
      done: allLines.filter((l) => l.picked).length,
      ready: packing.filter((o) => o.invoice && o.lines.length > 0 && o.lines.every((l) => l.picked)),
    };
  }, [tenantId]);

  async function loadOnVan(orderIds: string[], label: string) {
    for (const id of orderIds) await markOrderStatus(id, 'out_for_delivery', 'packed');
    setToast(label);
  }

  const pct = data?.total ? Math.round((data.done / data.total) * 100) : 0;

  return (
    <>
      <header className="topbar" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Van size={20} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div className="title">Pack the van</div>
            <div className="num" style={{ fontSize: 11, color: 'var(--muted)' }}>
              {data?.packing.length ?? 0} order{data?.packing.length === 1 ? '' : 's'} · {data?.done ?? 0} of {data?.total ?? 0} lines pulled
            </div>
          </div>
          <span className="num" style={{ fontSize: 20, fontWeight: 600 }}>{pct}%</span>
        </div>
        <div style={{ height: 6, background: 'var(--line)' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? 'var(--ok)' : 'var(--ink)' }} />
        </div>
        <div className="tabs">
          {([['item', 'By item'], ['order', 'By shop']] as [View, string][]).map(([id, label]) => (
            <button key={id} className={view === id ? 'on' : ''} onClick={() => setView(id)}>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="scroll">
        {view === 'item' ? (
          <>
            <div style={{ padding: '12px 16px 8px' }}>
              <span className="lbl">Pull this much off the shelf</span>
            </div>
            <div className="rows">
              {(data?.items ?? []).map((it) => {
                const all = it.picked === it.lines.length;
                const some = it.picked > 0 && !all;
                const have = data?.stock[it.productId] ?? 0;
                const short = it.qty > have;
                return (
                  <button
                    key={it.productId}
                    className="row"
                    style={{ textAlign: 'left', background: all ? 'var(--paper)' : 'var(--card)' }}
                    onClick={() => setPicked(it.lines, !all)}
                  >
                    <Tick on={all} half={some} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                      <span style={{
                        fontSize: 14.5, fontWeight: 600,
                        color: all ? 'var(--faint)' : 'var(--ink)',
                        textDecoration: all ? 'line-through' : 'none',
                      }}>{it.name}</span>
                      <span className="num" style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {it.shops} shop{it.shops === 1 ? '' : 's'}
                        {some ? ` · ${it.picked} of ${it.lines.length} pulled` : ''}
                      </span>
                      {short && (
                        <span className="num" style={{ fontSize: 11, color: 'var(--bad)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Alert size={12} color="var(--bad)" /> only {have} in stock
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                      <span className="num" style={{ fontSize: 18, fontWeight: 600 }}>{it.qty}</span>
                      <span className="num" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{it.unit}</span>
                    </div>
                  </button>
                );
              })}
              {!data?.items.length && <div className="empty" style={{ margin: 16 }}>Nothing waiting to be packed</div>}
            </div>
          </>
        ) : (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(data?.packing ?? []).map((o) => {
              const done = o.lines.filter((l) => l.picked).length;
              const all = done === o.lines.length && o.lines.length > 0;
              const due = dueLabel(o.deliverBy);
              const dueColor = due.tone === 'bad' ? 'var(--bad)' : due.tone === 'warn' ? 'var(--warn)' : 'var(--muted)';
              return (
                <div key={o.id} className="card" style={{ borderLeft: `3px solid ${all ? 'var(--ok)' : 'var(--ink)'}`, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '13px 14px', display: 'flex', flexDirection: 'column', gap: 6, borderBottom: '1px solid var(--hair)' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 600 }}>{o.shop}</span>
                      <span className="num" style={{ fontSize: 12, fontWeight: 600, color: all ? 'var(--ok)' : 'var(--muted)' }}>
                        {done}/{o.lines.length}
                      </span>
                    </div>
                    <div className="num" style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {o.area} · {o.invoice ? `${o.invoice.number} · ${money(o.invoice.total)}` : 'no bill yet'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={12} color="var(--muted)" />
                      <span className="num" style={{ fontSize: 11, color: 'var(--muted)' }}>ordered {stamp(o.placedAt)}</span>
                    </div>
                    {o.deliverBy && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Van size={12} color={dueColor} />
                        <span className="num" style={{ fontSize: 11, color: dueColor, fontWeight: due.tone === 'muted' ? 400 : 600 }}>
                          deliver {due.text}
                        </span>
                      </div>
                    )}
                  </div>

                  {o.lines.map((l) => (
                    <button
                      key={l.productId}
                      onClick={() => setPicked([{ orderId: l.orderId, productId: l.productId, qty: l.qty }], !l.picked)}
                      style={{ padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', borderBottom: '1px solid var(--hair)', background: 'transparent' }}
                    >
                      <Tick on={l.picked} size={24} />
                      <span style={{
                        flex: 1, fontSize: 13.5,
                        color: l.picked ? 'var(--faint)' : 'var(--ink)',
                        textDecoration: l.picked ? 'line-through' : 'none',
                      }}>{l.name}</span>
                      <span className="num" style={{ fontSize: 13.5, fontWeight: 600 }}>{l.qty} {l.unit}</span>
                    </button>
                  ))}

                  <div style={{ padding: 12 }}>
                    {!o.invoice ? (
                      <button className="btn ghost" style={{ height: 46 }} onClick={() => nav(`/bill/${o.id}`)}>
                        <Receipt size={16} /> Make the bill first
                      </button>
                    ) : (
                      <button
                        className="btn" style={{ height: 46, background: all ? 'var(--ok)' : '#c9c9c2' }}
                        disabled={!all}
                        onClick={() => loadOnVan([o.id], `${o.shop} loaded`)}
                      >
                        <Van size={16} color="#fff" />
                        {all ? 'Loaded on van' : `${o.lines.length - done} item${o.lines.length - done === 1 ? '' : 's'} still to pull`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {!data?.packing.length && <div className="empty">Nothing waiting to be packed</div>}
          </div>
        )}
      </div>

      {!!data?.ready.length && (
        <div className="footer">
          <button
            className="btn"
            style={{ background: 'var(--ok)' }}
            onClick={() => loadOnVan(data.ready.map((o) => o.id), `${data.ready.length} order${data.ready.length === 1 ? '' : 's'} on the van`)}
          >
            <Van size={18} color="#fff" />
            Load {data.ready.length} packed order{data.ready.length === 1 ? '' : 's'} on the van
          </button>
          <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.4 }}>
            They move to the Route screen for delivery
          </div>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
