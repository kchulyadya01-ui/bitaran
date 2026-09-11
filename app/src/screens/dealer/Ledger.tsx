import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { allBalances, money, recordPayment } from '../../lib/domain';
import { useTenantId, useToast } from '../../lib/hooks';
import { Cash } from '../../ui/icons';

const DAY = 86_400_000;

export default function Ledger() {
  const tenantId = useTenantId();
  const [toast, setToast] = useToast();
  const [collecting, setCollecting] = useState<{ id: string; shop: string; due: number } | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'cash' | 'digital'>('cash');

  const data = useLiveQuery(async () => {
    if (!tenantId) return null;
    const [customers, balances] = await Promise.all([
      db.customers.where('tenantId').equals(tenantId).toArray(),
      allBalances(tenantId),
    ]);
    const rows = customers
      .map((c) => ({ ...c, ...(balances[c.id] ?? { due: 0, bills: 0, oldest: undefined }) }))
      .filter((r) => r.due > 0.5)
      .map((r) => ({ ...r, days: r.oldest ? Math.floor((Date.now() - r.oldest) / DAY) : 0 }))
      .sort((a, b) => b.days - a.days);
    const total = rows.reduce((s, r) => s + r.due, 0);
    const over30 = rows.filter((r) => r.days > 30).reduce((s, r) => s + r.due, 0);
    const band = (lo: number, hi: number) => rows.filter((r) => r.days >= lo && r.days <= hi).reduce((s, r) => s + r.due, 0);
    return { rows, total, over30, bands: [band(0, 15), band(16, 30), band(31, 9999)] };
  }, [tenantId]);

  async function submit() {
    if (!collecting || !tenantId) return;
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return;
    await recordPayment({ tenantId, customerId: collecting.id, amount: n, method });
    setToast(`Rs ${money(n)} recorded — it is an entry, nothing was overwritten`);
    setCollecting(null);
    setAmount('');
  }

  const bandTotal = (data?.bands ?? [1, 0, 0]).reduce((s, b) => s + b, 0) || 1;

  return (
    <>
      <header className="topbar" style={{ background: 'var(--ink)', borderBottom: 'none', flexDirection: 'column', alignItems: 'stretch', gap: 14, color: '#fff' }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Outstanding · बाँकी</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span className="num" style={{ fontSize: 38, fontWeight: 600, lineHeight: 1 }}>{money(data?.total ?? 0)}</span>
            <span style={{ fontSize: 11, color: 'var(--faint)' }}>across {data?.rows.length ?? 0} shops</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
            <span className="num" style={{ fontSize: 17, fontWeight: 600, color: '#f0a8a2' }}>{money(data?.over30 ?? 0)}</span>
            <span style={{ fontSize: 11, color: 'var(--faint)' }}>over 30 days</span>
          </div>
        </div>
        <div style={{ display: 'flex', height: 8, gap: 2 }}>
          <div style={{ flex: (data?.bands[0] ?? 0) / bandTotal || 0.001, background: '#4a9c74' }} />
          <div style={{ flex: (data?.bands[1] ?? 0) / bandTotal || 0.001, background: '#d9a441' }} />
          <div style={{ flex: (data?.bands[2] ?? 0) / bandTotal || 0.001, background: '#b3261e' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {['0-15 d', '16-30 d', '30+ d'].map((t) => (
            <span key={t} className="num" style={{ fontSize: 10, color: 'var(--faint)' }}>{t}</span>
          ))}
        </div>
      </header>

      <div className="scroll">
        <div style={{ padding: '12px 16px 8px' }}><span className="lbl">Oldest first</span></div>
        <div className="rows">
          {(data?.rows ?? []).map((r) => (
            <div key={r.id} className="row">
              <div style={{ width: 4, alignSelf: 'stretch', background: r.days > 30 ? 'var(--bad)' : r.days > 15 ? '#d9a441' : '#4a9c74' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <span style={{ fontSize: 14.5, fontWeight: 600 }}>{r.shopName}</span>
                <span className="num" style={{ fontSize: 11, color: r.days > 30 ? 'var(--bad)' : r.days > 15 ? 'var(--warn)' : 'var(--muted)', fontWeight: r.days > 15 ? 500 : 400 }}>
                  {r.days} days · {r.bills} unpaid bill{r.bills === 1 ? '' : 's'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                <span className="num" style={{ fontSize: 16, fontWeight: 600 }}>{money(r.due)}</span>
                <button
                  style={{ fontSize: 11, fontWeight: 600, color: 'var(--ok)', textDecoration: 'underline' }}
                  onClick={() => { setCollecting({ id: r.id, shop: r.shopName, due: r.due }); setAmount(String(Math.round(r.due))); }}
                >
                  Collect
                </button>
              </div>
            </div>
          ))}
          {!data?.rows.length && <div className="empty" style={{ margin: 16 }}>Nobody owes anything</div>}
        </div>
      </div>

      {collecting && (
        <div className="sheet-back" onClick={() => setCollecting(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Payment from {collecting.shop}</div>
              <div className="num" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>owes {money(collecting.due)}</div>
            </div>
            <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
            <div style={{ display: 'flex', border: '1px solid var(--ink)' }}>
              {(['cash', 'digital'] as const).map((m) => (
                <button key={m} onClick={() => setMethod(m)} style={{ flex: 1, height: 48, fontSize: 14, fontWeight: 600, background: method === m ? 'var(--ink)' : 'var(--card)', color: method === m ? '#fff' : 'var(--muted)' }}>
                  {m === 'cash' ? 'Cash' : 'Digital'}
                </button>
              ))}
            </div>
            <button className="btn" onClick={submit}><Cash size={18} color="#fff" /> Record payment</button>
            <button className="btn ghost" onClick={() => setCollecting(null)}>Cancel</button>
          </div>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
