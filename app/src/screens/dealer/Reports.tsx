import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '../../lib/db';
import { allBalances, bs, money } from '../../lib/domain';
import { useTenantId } from '../../lib/hooks';
import { Chevron, Download } from '../../ui/icons';

const DAY = 86_400_000;

export default function Reports() {
  const tenantId = useTenantId();

  const data = useLiveQuery(async () => {
    if (!tenantId) return null;
    const invoices = await db.invoices.where('tenantId').equals(tenantId).toArray();
    const issued = invoices.filter((i) => i.status === 'issued');
    const start = new Date(); start.setHours(0, 0, 0, 0);

    const days = Array.from({ length: 7 }, (_, i) => {
      const from = start.getTime() - (6 - i) * DAY;
      const to = from + DAY;
      const total = issued.filter((v) => v.issuedAt >= from && v.issuedAt < to).reduce((s, v) => s + v.total, 0);
      return { from, total, label: new Date(from).toLocaleDateString([], { weekday: 'short' }), today: i === 6 };
    });
    const weekTotal = days.reduce((s, d) => s + d.total, 0);
    const prevWeek = issued
      .filter((v) => v.issuedAt >= start.getTime() - 13 * DAY && v.issuedAt < start.getTime() - 6 * DAY)
      .reduce((s, v) => s + v.total, 0);

    const lineRows = await db.invoiceLines.toArray();
    const recent = new Set(issued.filter((i) => i.issuedAt >= start.getTime() - 6 * DAY).map((i) => i.id));
    const best: Record<string, { name: string; qty: number; unit: string }> = {};
    for (const l of lineRows) {
      if (!recent.has(l.invoiceId)) continue;
      const row = (best[l.productId] ??= { name: l.nameSnapshot, qty: 0, unit: l.unitSnapshot });
      row.qty += l.qty;
    }
    const sellers = Object.values(best).sort((a, b) => b.qty - a.qty).slice(0, 4);

    const balances = await allBalances(tenantId);
    const dues = Object.values(balances).filter((b) => b.due > 0.5);
    const over30 = Object.values(balances)
      .filter((b) => b.due > 0.5 && b.oldest && Date.now() - b.oldest > 30 * DAY)
      .reduce((s, b) => s + b.due, 0);

    return {
      days, weekTotal,
      delta: prevWeek ? Math.round(((weekTotal - prevWeek) / prevWeek) * 100) : null,
      sellers,
      duesTotal: dues.reduce((s, b) => s + b.due, 0),
      duesCount: dues.length,
      over30,
    };
  }, [tenantId]);

  const max = Math.max(1, ...(data?.days ?? []).map((d) => d.total));
  const maxQty = Math.max(1, ...(data?.sellers ?? []).map((s) => s.qty));
  const W = 326, BASE = 120, TOP = 100, BAND = W / 7, BW = 38;
  const avg = (data?.days ?? []).reduce((s, d) => s + d.total, 0) / 7;

  return (
    <>
      <header className="topbar" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
        <div className="title">Reports</div>
        <div className="num" style={{ fontSize: 11, color: 'var(--muted)' }}>week to {bs().ymd}</div>
      </header>

      <div className="scroll">
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 19, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="lbl">Sales, last 7 days</span>
                <span className="num" style={{ fontSize: 30, fontWeight: 600, lineHeight: 1 }}>Rs {money(data?.weekTotal ?? 0)}</span>
              </div>
              {data?.delta !== null && data?.delta !== undefined && (
                <span className="num" style={{ fontSize: 13, fontWeight: 600, color: data.delta >= 0 ? 'var(--ok)' : 'var(--bad)', paddingBottom: 3 }}>
                  {data.delta >= 0 ? '+' : ''}{data.delta}%
                </span>
              )}
            </div>

            <svg width="100%" height="152" viewBox={`0 0 ${W} 152`} style={{ display: 'block' }}>
              <line x1="0" y1={BASE} x2={W} y2={BASE} stroke="#e4e2da" strokeWidth="1" />
              {avg > 0 && (
                <>
                  <line x1="0" y1={BASE - (avg / max) * TOP} x2={W - 36} y2={BASE - (avg / max) * TOP} stroke="#c9c9c2" strokeWidth="1" strokeDasharray="3 4" />
                  <text x={W} y={BASE - (avg / max) * TOP + 3} fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="#9aa0a6" textAnchor="end">avg</text>
                </>
              )}
              {(data?.days ?? []).map((d, i) => {
                const h = (d.total / max) * TOP;
                const x = i * BAND + (BAND - BW) / 2;
                const y = BASE - h;
                const isMax = d.total === max && max > 0;
                const fill = d.today ? '#c8ddd2' : isMax ? '#0a5c36' : '#7fb79a';
                if (h < 1) return <text key={i} x={x + BW / 2} y={BASE - 4} fontSize="9" fill="#c9c9c2" textAnchor="middle">·</text>;
                return (
                  <path key={i} d={`M${x} ${BASE} L${x} ${y + 4} Q${x} ${y} ${x + 4} ${y} L${x + BW - 4} ${y} Q${x + BW} ${y} ${x + BW} ${y + 4} L${x + BW} ${BASE} Z`} fill={fill} />
                );
              })}
              {max > 0 && (data?.days ?? []).map((d, i) =>
                d.total === max ? (
                  <text key={'l' + i} x={i * BAND + BAND / 2} y={BASE - (d.total / max) * TOP - 6} fontFamily="IBM Plex Mono, monospace" fontSize="10.5" fontWeight="600" fill="#16181a" textAnchor="middle">
                    {money(d.total)}
                  </text>
                ) : null,
              )}
              {(data?.days ?? []).map((d, i) => (
                <text key={'d' + i} x={i * BAND + BAND / 2} y={136} fontFamily="IBM Plex Sans, sans-serif" fontSize="10" fill={d.today ? '#16181a' : '#6b6f76'} fontWeight={d.today ? 600 : 400} textAnchor="middle">
                  {d.label}
                </text>
              ))}
            </svg>
          </div>

          <div className="card" style={{ padding: 19, display: 'flex', flexDirection: 'column', gap: 13 }}>
            <span className="lbl">Best sellers this week</span>
            {(data?.sellers ?? []).map((s, i) => (
              <div key={s.name} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{s.name}</span>
                  <span className="num" style={{ fontSize: 12.5, color: 'var(--muted)' }}>{s.qty} {s.unit}</span>
                </div>
                <div style={{ height: 6, background: 'var(--hair)' }}>
                  <div style={{ width: `${(s.qty / maxQty) * 100}%`, height: 6, background: i === 0 ? 'var(--ok)' : '#7fb79a' }} />
                </div>
              </div>
            ))}
            {!data?.sellers.length && <div style={{ fontSize: 13, color: 'var(--muted)' }}>No sales in the last 7 days yet</div>}
          </div>

          <Link to="/dues" className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>Outstanding dues</span>
              <span className="num" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                {data?.duesCount ?? 0} shops · {money(data?.over30 ?? 0)} over 30 days
              </span>
            </div>
            <span className="num" style={{ fontSize: 17, fontWeight: 600 }}>{money(data?.duesTotal ?? 0)}</span>
            <Chevron size={16} color="var(--faint)" />
          </Link>
        </div>
      </div>

      <div className="footer">
        <button className="btn ghost" style={{ height: 52 }} onClick={() => exportCsv()}>
          <Download size={17} /> Export for accountant
        </button>
      </div>
    </>
  );
}

async function exportCsv() {
  const invoices = await db.invoices.toArray();
  const lines = await db.invoiceLines.toArray();
  const customers = await db.customers.toArray();
  const byC = Object.fromEntries(customers.map((c) => [c.id, c]));
  const head = 'invoice_no,date_bs,buyer,buyer_pan,item,qty,rate,line_total,invoice_taxable,invoice_vat,invoice_total,payment,status';
  const rows = lines.flatMap((l) => {
    const inv = invoices.find((i) => i.id === l.invoiceId);
    if (!inv) return [];
    return [[
      inv.number, bs(inv.issuedAt).ymd, `"${byC[inv.customerId]?.shopName ?? ''}"`, inv.buyerPan,
      `"${l.nameSnapshot}"`, l.qty, l.rateSnapshot, l.lineTotal,
      inv.subtotal, inv.vat, inv.total, inv.paymentType, inv.status,
    ].join(',')];
  });
  const blob = new Blob([[head, ...rows].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sales-${bs().ymd.replace(/\//g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
