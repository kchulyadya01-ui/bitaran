import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { bs, clock, receiveIncoming } from '../../lib/domain';
import { useTenantId, useToast } from '../../lib/hooks';
import { Check, Plus } from '../../ui/icons';

const DAY = 86_400_000;

export default function Incoming() {
  const tenantId = useTenantId();
  const [toast, setToast] = useToast();

  const rows = useLiveQuery(async () => {
    if (!tenantId) return [];
    const incoming = await db.incoming.where('tenantId').equals(tenantId).toArray();
    const products = await db.products.where('tenantId').equals(tenantId).toArray();
    const byId = Object.fromEntries(products.map((p) => [p.id, p]));
    return Promise.all(
      incoming
        .sort((a, b) => a.expectedAt - b.expectedAt)
        .map(async (inc) => {
          const lines = await db.incomingLines.where('incomingId').equals(inc.id).toArray();
          const daysAway = Math.floor((inc.expectedAt - Date.now()) / DAY);
          return {
            ...inc,
            daysAway,
            lines: lines.map((l) => ({ ...l, name: byId[l.productId]?.name ?? '?', unit: byId[l.productId]?.unit ?? '' })),
          };
        }),
    );
  }, [tenantId], []);

  const pending = rows.filter((r) => r.status !== 'received');

  return (
    <>
      <header className="topbar" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 5 }}>
        <div className="title">Coming from Main Dealer</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{pending.length} shipments logged · what arrives and when</div>
      </header>

      <div className="scroll">
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pending.map((inc, idx) => {
            const today = inc.daysAway <= 0;
            const soon = inc.daysAway > 0 && inc.daysAway <= 3;
            if (today && idx === 0) {
              return (
                <div key={inc.id} style={{ background: 'var(--ink)', color: '#fff', padding: '15px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, background: '#4a9c74' }} />
                      <span className="lbl" style={{ color: '#4a9c74' }}>Arriving today</span>
                    </div>
                    <span className="num" style={{ fontSize: 12, color: 'var(--faint)' }}>{inc.ref}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
                    <span className="num" style={{ fontSize: 26, fontWeight: 600 }}>
                      {clock(inc.expectedAt)}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--faint)' }}>{bs(inc.expectedAt).dayMonth}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4, borderTop: '1px solid #33363a' }}>
                    {inc.lines.map((l) => (
                      <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span>{l.name}</span><span className="num" style={{ fontWeight: 600 }}>{l.qty} {l.unit}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    className="btn" style={{ background: '#fff', color: 'var(--ink)', height: 52 }}
                    onClick={async () => { await receiveIncoming(inc.id); setToast('Received — stock updated'); }}
                  >
                    <Check size={17} color="var(--ink)" /> Mark received · प्राप्त भयो
                  </button>
                  <div style={{ fontSize: 11, color: 'var(--faint)', textAlign: 'center', lineHeight: 1.4 }}>
                    Receiving adds these to stock automatically
                  </div>
                </div>
              );
            }
            return (
              <div key={inc.id} className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, background: soon ? '#d9a441' : '#c9c9c2' }} />
                    <span className="lbl">{inc.daysAway <= 0 ? 'Arriving today' : `In ${inc.daysAway} day${inc.daysAway === 1 ? '' : 's'}`}</span>
                  </div>
                  <span className="num" style={{ fontSize: 12, color: 'var(--muted)' }}>{inc.ref}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
                  <span className="num" style={{ fontSize: 20, fontWeight: 600 }}>{bs(inc.expectedAt).dayMonth}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {inc.timeConfirmed
                      ? clock(inc.expectedAt)
                      : inc.status === 'ordered' ? 'ordered, not confirmed' : 'time not confirmed'}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                  {inc.note ?? inc.lines.map((l) => `${l.name.split(' ')[0]} ${l.qty}`).join(' · ')}
                </div>
                <button
                  style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ok)', textAlign: 'left' }}
                  onClick={async () => { await receiveIncoming(inc.id); setToast('Received early — stock updated'); }}
                >
                  Mark received now
                </button>
              </div>
            );
          })}
          {!pending.length && <div className="empty">Nothing on the way</div>}
        </div>
      </div>

      <div className="footer">
        <button className="btn ghost" onClick={() => setToast('Logging a new shipment is next on the build list')}>
          <Plus size={18} /> Log new shipment
        </button>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
