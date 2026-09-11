import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { money } from '../../lib/domain';
import { useOnline, useToast } from '../../lib/hooks';
import { Sync, NoWifi, Check, Alert } from '../../ui/icons';

export default function SyncScreen() {
  const online = useOnline();
  const [toast, setToast] = useToast();

  const items = useLiveQuery(async () => {
    const out = await db.outbox.orderBy('createdAt').reverse().toArray();
    return Promise.all(out.map(async (o) => {
      let label = o.entity;
      let detail = '';
      if (o.entity === 'invoice') {
        const p = o.payload as { invoice: { number: string; total: number; customerId: string } };
        const c = await db.customers.get(p.invoice.customerId);
        label = `Bill ${p.invoice.number}`;
        detail = `${c?.shopName ?? ''} · ${money(p.invoice.total)}`;
      } else if (o.entity === 'payment') {
        const p = o.payload as { customerId: string; amount: number; method: string };
        const c = await db.customers.get(p.customerId);
        label = 'Payment received';
        detail = `${c?.shopName ?? ''} · ${money(p.amount)} ${p.method}`;
      } else if (o.entity === 'orderEvent') {
        const p = o.payload as { status: string };
        label = `Order marked ${p.status.replace(/_/g, ' ')}`;
      } else if (o.entity === 'product') {
        const p = o.payload as { productId: string; price: number };
        const prod = await db.products.get(p.productId);
        label = 'Price changed';
        detail = `${prod?.name ?? ''} · Rs ${money(p.price)}`;
      } else if (o.entity === 'incoming') {
        label = 'Stock received';
      } else if (o.entity === 'order') {
        label = 'Customer order';
      }
      return { id: o.id, label, detail, at: o.createdAt, attempts: o.attempts };
    }));
  }, [], []);

  const conflicts = useLiveQuery(
    () => db.fieldHistory.orderBy('changedAt').reverse().limit(3).toArray(),
    [], [],
  );

  return (
    <>
      <header className="topbar" style={{ background: online ? 'var(--ok)' : 'var(--warn)', borderBottom: 'none', flexDirection: 'column', alignItems: 'stretch', gap: 12, color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {online ? <Sync size={20} color="#fff" /> : <NoWifi size={20} color="#fff" />}
          <span style={{ fontSize: 16, fontWeight: 600 }}>{online ? 'Online' : 'Working offline'}</span>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(255,255,255,0.86)' }}>
          Everything below is saved on this phone. It goes out the moment the server exists and you have signal —
          nothing is lost, nothing needs re-typing.
        </div>
      </header>

      <div className="scroll">
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ padding: '15px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <span className="num" style={{ fontSize: 34, fontWeight: 600, lineHeight: 1 }}>{items.length}</span>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>waiting to sync</span>
              <span className="num" style={{ fontSize: 11.5, color: 'var(--muted)' }}>no server connected yet</span>
            </div>
            <button
              style={{ width: 48, height: 48, border: '1.5px solid var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => setToast(online ? 'No server to sync to yet — see what is left' : 'Still offline')}
              aria-label="Sync now"
            >
              <Sync size={20} />
            </button>
          </div>

          <div style={{ border: '1px solid var(--line)' }}>
            <div style={{ background: 'var(--paper)', padding: '9px 14px' }}><span className="lbl">In the queue</span></div>
            <div className="rows">
              {items.slice(0, 12).map((it) => (
                <div key={it.id} style={{ background: 'var(--card)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 11 }}>
                  <div style={{ width: 7, height: 7, background: 'var(--warn)', flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{it.label}</span>
                    <span className="num" style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {it.detail}{it.detail ? ' · ' : ''}{new Date(it.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              {!items.length && <div style={{ background: 'var(--card)', padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>Queue is empty</div>}
            </div>
          </div>

          {!!conflicts.length && (
            <div className="card" style={{ borderLeft: '3px solid var(--bad)', padding: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Alert size={15} color="var(--bad)" />
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>Recent field changes</span>
              </div>
              {conflicts.map((c) => (
                <div key={c.id} className="num" style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                  {c.field} {c.oldValue} → <strong style={{ color: 'var(--ink)' }}>{c.newValue}</strong> · {new Date(c.changedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              ))}
              <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                Superseded values are kept, so a price another phone overwrote can still be seen and restored.
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 9, padding: '12px 14px', background: '#eef2ee', borderLeft: '3px solid var(--ok)' }}>
            <Check size={15} color="var(--ok)" />
            <span style={{ fontSize: 12, color: 'var(--ok)', lineHeight: 1.5 }}>
              Bills can never be deleted, only cancelled with a reason. Every change is logged.
            </span>
          </div>
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
