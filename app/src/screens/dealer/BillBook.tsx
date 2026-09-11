import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { bs, clock, fiscalYearOf, money } from '../../lib/domain';
import { useTenantId } from '../../lib/hooks';
import { Back, Search, Receipt } from '../../ui/icons';

export default function BillBook() {
  const nav = useNavigate();
  const tenantId = useTenantId();
  const [q, setQ] = useState('');

  const data = useLiveQuery(async () => {
    if (!tenantId) return null;
    const [invoices, customers] = await Promise.all([
      db.invoices.where('tenantId').equals(tenantId).toArray(),
      db.customers.where('tenantId').equals(tenantId).toArray(),
    ]);
    const byCustomer = Object.fromEntries(customers.map((c) => [c.id, c]));
    const rows = invoices
      .sort((a, b) => b.issuedAt - a.issuedAt)
      .map((i) => ({
        id: i.id,
        number: i.number,
        issuedAt: i.issuedAt,
        total: i.total,
        paymentType: i.paymentType,
        cancelled: i.status === 'cancelled',
        shop: byCustomer[i.customerId]?.shopName ?? 'Unknown shop',
        pan: i.buyerPan,
        fiscalYear: i.fiscalYear,
      }));
    const thisYear = rows.filter((r) => r.fiscalYear === fiscalYearOf() && !r.cancelled);
    return {
      rows,
      yearCount: thisYear.length,
      yearTotal: thisYear.reduce((s, r) => s + r.total, 0),
    };
  }, [tenantId]);

  // Grouped by the day printed on the bill, newest first, because that is how
  // anyone looks for one: "the bill from the day Shyam took two crates".
  const days = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = (data?.rows ?? []).filter(
      (r) => !needle
        || r.number.toLowerCase().includes(needle)
        || r.shop.toLowerCase().includes(needle)
        || r.pan.includes(needle),
    );
    const out: { key: string; label: string; total: number; rows: typeof rows }[] = [];
    for (const r of rows) {
      const key = bs(r.issuedAt).ymd;
      const last = out[out.length - 1];
      if (last && last.key === key) {
        last.rows.push(r);
        last.total += r.cancelled ? 0 : r.total;
      } else {
        out.push({ key, label: bs(r.issuedAt).dayMonth, total: r.cancelled ? 0 : r.total, rows: [r] });
      }
    }
    return out;
  }, [data, q]);

  const today = bs().ymd;

  return (
    <>
      <header className="topbar" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => nav(-1)} aria-label="Back"><Back size={20} /></button>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div className="title">Bill book</div>
            <div className="num" style={{ fontSize: 11, color: 'var(--muted)' }}>
              {data?.yearCount ?? 0} bills · {money(data?.yearTotal ?? 0)} this fiscal year
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'var(--paper)', border: '1px solid var(--line)', padding: '11px 12px' }}>
          <Search size={16} color="var(--muted)" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Bill number, shop or PAN"
            style={{ border: 'none', background: 'transparent', padding: 0 }}
          />
        </div>
      </header>

      <div className="scroll">
        {days.map((d) => (
          <div key={d.key}>
            <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
              <span className="lbl">{d.label}{d.key === today ? ' · today' : ''}</span>
              <span className="num" style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>{money(d.total)}</span>
            </div>
            <div className="rows">
              {d.rows.map((r) => (
                <button key={r.id} className="row" style={{ textAlign: 'left' }} onClick={() => nav(`/invoice/${r.id}`)}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                    <span style={{
                      fontSize: 14.5, fontWeight: 600,
                      textDecoration: r.cancelled ? 'line-through' : 'none',
                      color: r.cancelled ? 'var(--faint)' : 'var(--ink)',
                    }}>{r.shop}</span>
                    <span className="num" style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {r.number} · {clock(r.issuedAt)} · {r.cancelled ? 'cancelled' : r.paymentType}
                    </span>
                  </div>
                  <span className="num" style={{ fontSize: 15, fontWeight: 600, color: r.cancelled ? 'var(--faint)' : 'var(--ink)' }}>
                    {money(r.total)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {!days.length && (
          <div className="empty" style={{ margin: 16 }}>
            {q ? `Nothing matches "${q}"` : 'No bills issued yet'}
          </div>
        )}
        <div style={{ padding: '14px 16px 20px', display: 'flex', gap: 9, alignItems: 'flex-start' }}>
          <Receipt size={15} color="var(--muted)" />
          <span style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>
            Every bill ever issued on this phone is here, including bills made without an order.
            Nothing is ever deleted — a wrong bill gets cancelled and stays in the book, as the
            2072 invoicing procedure requires.
          </span>
        </div>
      </div>
    </>
  );
}
