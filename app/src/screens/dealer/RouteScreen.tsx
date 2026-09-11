import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { dueLabel, markOrderStatus, money, resolveStatus } from '../../lib/domain';
import { useTenantId } from '../../lib/hooks';
import { Check } from '../../ui/icons';

const DEPOT = { lat: 27.6620, lng: 85.4295 }; // Suryabinayak

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Nearest-neighbour ordering from the depot. No routing API, so it works offline. */
function orderStops<T extends { lat: number; lng: number }>(stops: T[]): T[] {
  const left = [...stops];
  const out: T[] = [];
  let at = DEPOT;
  while (left.length) {
    let bestI = 0;
    let bestD = Infinity;
    left.forEach((s, i) => {
      const d = km(at, s);
      if (d < bestD) { bestD = d; bestI = i; }
    });
    const [next] = left.splice(bestI, 1);
    out.push(next);
    at = next;
  }
  return out;
}

export default function RouteScreen() {
  const tenantId = useTenantId();

  const raw = useLiveQuery(async () => {
    if (!tenantId) return null;
    const orders = await db.orders.where('tenantId').equals(tenantId).toArray();
    const customers = await db.customers.where('tenantId').equals(tenantId).toArray();
    const invoices = await db.invoices.where('tenantId').equals(tenantId).toArray();
    const byCustomer = Object.fromEntries(customers.map((c) => [c.id, c]));
    const rows = await Promise.all(
      orders.map(async (o) => {
        const events = await db.orderEvents.where('orderId').equals(o.id).toArray();
        const status = resolveStatus(events);
        const inv = invoices.find((i) => i.orderId === o.id && i.status === 'issued');
        const c = byCustomer[o.customerId];
        return {
          orderId: o.id, status, shop: c?.shopName ?? '?',
          lat: c?.lat ?? 0, lng: c?.lng ?? 0,
          pinned: !!c?.lat && !!c?.lng,
          deliverBy: o.deliverBy,
          amount: inv?.total ?? 0, paid: inv?.paymentType === 'cash',
        };
      }),
    );
    return rows.filter((r) => r.status === 'confirmed' || r.status === 'out_for_delivery' || r.status === 'delivered');
  }, [tenantId]);

  const stops = useMemo(() => {
    if (!raw) return [];
    // A shop with no pin cannot be routed, but it still has to be delivered -
    // so it goes at the end of the list rather than on the map at (0, 0).
    const routable = raw.filter((r) => r.status !== 'delivered' && r.pinned);
    const unpinned = raw.filter((r) => r.status !== 'delivered' && !r.pinned);
    const pending = [...orderStops(routable), ...unpinned];
    const done = raw.filter((r) => r.status === 'delivered');
    return [...done, ...pending];
  }, [raw]);

  const doneCount = stops.filter((s) => s.status === 'delivered').length;
  const totalKm = useMemo(() => {
    let at = DEPOT;
    let sum = 0;
    for (const s of stops.filter((x) => x.status !== 'delivered')) { sum += km(at, s); at = s; }
    return sum;
  }, [stops]);

  // Plot real coordinates into the map box.
  const box = useMemo(() => {
    const pts = [DEPOT, ...stops.filter((s) => s.pinned)];
    const lats = pts.map((p) => p.lat);
    const lngs = pts.map((p) => p.lng);
    const pad = 0.004;
    return {
      minLat: Math.min(...lats) - pad, maxLat: Math.max(...lats) + pad,
      minLng: Math.min(...lngs) - pad, maxLng: Math.max(...lngs) + pad,
    };
  }, [stops]);

  const W = 390, H = 260;
  const xy = (p: { lat: number; lng: number }) => ({
    x: ((p.lng - box.minLng) / (box.maxLng - box.minLng)) * W,
    y: H - ((p.lat - box.minLat) / (box.maxLat - box.minLat)) * H,
  });

  const pending = stops.filter((s) => s.status !== 'delivered');
  const path = [DEPOT, ...pending.filter((p) => p.pinned)].map(xy).map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  return (
    <>
      <div style={{ position: 'relative', background: '#e7e5dc', height: H, flexShrink: 0 }}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
          <rect width={W} height={H} fill="#e7e5dc" />
          <g stroke="#f7f6f2" strokeWidth="11">
            <line x1="0" y1={H * 0.34} x2={W} y2={H * 0.31} />
            <line x1="0" y1={H * 0.72} x2={W} y2={H * 0.75} />
            <line x1={W * 0.32} y1="0" x2={W * 0.35} y2={H} />
            <line x1={W * 0.66} y1="0" x2={W * 0.63} y2={H} />
          </g>
          <path d={path} fill="none" stroke="#16181a" strokeWidth="2.6" strokeDasharray="1 8" strokeLinecap="round" />
          <circle cx={xy(DEPOT).x} cy={xy(DEPOT).y} r="6" fill="#0a5c36" />
          {stops.filter((s) => s.pinned).map((s, i) => {
            const p = xy(s);
            const done = s.status === 'delivered';
            const next = !done && s.orderId === pending[0]?.orderId;
            return (
              <g key={s.orderId}>
                <circle cx={p.x} cy={p.y} r={next ? 14 : 11} fill={done ? '#16181a' : next ? '#b3261e' : '#fff'} stroke="#16181a" strokeWidth={done || next ? 0 : 2.4} />
                {done ? (
                  <path d={`M${p.x - 4.5} ${p.y} l3 3.2 l6 -6.4`} fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <text x={p.x} y={p.y + 4.5} fontFamily="IBM Plex Mono, monospace" fontSize="12" fontWeight="600" fill={next ? '#fff' : '#16181a'} textAnchor="middle">{i + 1}</text>
                )}
              </g>
            );
          })}
        </svg>
        <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #c9c9c2', padding: '7px 10px' }}>
          <Check size={13} color="var(--ok)" />
          <span style={{ fontSize: 11, fontWeight: 600 }}>Works with no signal</span>
        </div>
      </div>

      <div style={{ padding: '14px 16px 10px', background: 'var(--card)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Today's route</div>
          <div className="num" style={{ fontSize: 12, color: 'var(--muted)' }}>
            {doneCount} of {stops.length} done · {totalKm.toFixed(1)} km left
          </div>
        </div>
      </div>

      <div className="scroll">
        <div className="rows">
          {stops.map((s, i) => {
            const done = s.status === 'delivered';
            const next = !done && s.orderId === pending[0]?.orderId;
            return (
              <div key={s.orderId} className="row" style={{ background: done ? 'var(--paper)' : 'var(--card)' }}>
                <div className="num" style={{
                  width: 30, height: 30, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 600, color: '#fff',
                  background: done ? '#c9c9c2' : next ? 'var(--bad)' : 'var(--ink)',
                }}>{i + 1}</div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                  <span style={{
                    fontSize: 14.5, fontWeight: 600, color: done ? 'var(--faint)' : 'var(--ink)',
                    textDecoration: done ? 'line-through' : 'none',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{s.shop}</span>
                  <span className="num" style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {money(s.amount)} · {s.paid ? 'paid' : 'credit'} · {s.pinned ? `${km(DEPOT, s).toFixed(1)} km` : 'no pin'}
                  </span>
                  {!done && s.deliverBy && (() => {
                    const due = dueLabel(s.deliverBy);
                    const c = due.tone === 'bad' ? 'var(--bad)' : due.tone === 'warn' ? 'var(--warn)' : 'var(--muted)';
                    return <span className="num" style={{ fontSize: 11, color: c, fontWeight: due.tone === 'muted' ? 400 : 600 }}>deliver {due.text}</span>;
                  })()}
                </div>
                <button
                  onClick={() => markOrderStatus(s.orderId, done ? 'out_for_delivery' : 'delivered')}
                  style={{
                    width: 48, height: 48, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1.5px solid ${done ? 'var(--ok)' : '#c9c9c2'}`, background: done ? 'var(--ok)' : 'var(--card)',
                  }}
                  aria-label={done ? 'Undo delivered' : 'Mark delivered'}
                >
                  <Check size={20} color={done ? '#fff' : '#c9c9c2'} />
                </button>
              </div>
            );
          })}
          {!stops.length && <div className="empty" style={{ margin: 16 }}>No billed orders to deliver yet</div>}
        </div>
      </div>
    </>
  );
}
