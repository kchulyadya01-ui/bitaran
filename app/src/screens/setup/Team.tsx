import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { fiscalYearOf } from '../../lib/domain';
import { useTenantId } from '../../lib/hooks';
import { Back, Plus, Info, Chevron } from '../../ui/icons';

export default function Team() {
  const nav = useNavigate();
  const tenantId = useTenantId();
  const users = useLiveQuery(async () => (tenantId ? db.users.where('tenantId').equals(tenantId).toArray() : []), [tenantId], []);
  const pendingByUser = useLiveQuery(async () => {
    const out = await db.outbox.toArray();
    return out.length;
  }, [], 0);

  // Billing and delivering are separate jobs; in a small firm one person does both.
  const billers = users.filter((u) => u.prefix);
  const drivers = users.filter((u) => u.delivers);
  const nextLetter = String.fromCharCode(65 + billers.length);
  const fy = fiscalYearOf();

  return (
    <>
      <header className="topbar">
        <button onClick={() => nav(-1)} aria-label="Back"><Back size={22} /></button>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="title">Your team</span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Add as many people as you need · {users.length} now</span>
        </div>
      </header>

      <div className="scroll">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 16 }}>
          <div className="rows">
            <div style={{ background: 'var(--paper)', padding: '8px 16px' }}><span className="lbl">Can issue bills</span></div>
            {billers.map((u) => (
              <div key={u.id} className="row">
                <div style={{ width: 38, height: 38, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, background: u.role === 'owner' || u.role === 'partner' ? 'var(--ink)' : '#e4e2da', color: u.role === 'owner' || u.role === 'partner' ? '#fff' : 'var(--ink)' }}>
                  {u.name.slice(0, 1)}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600 }}>{u.name}</span>
                  <span className="num" style={{ fontSize: 11.5, color: 'var(--muted)', textTransform: 'capitalize' }}>
                    {u.role} · {u.phone.slice(0, 5)}…{u.phone.slice(-2)}
                  </span>
                </div>
                <div style={{ border: '1px solid var(--ink)', padding: '6px 9px' }}>
                  <span className="num" style={{ fontSize: 12, fontWeight: 600 }}>{u.prefix}</span>
                </div>
              </div>
            ))}
            <div style={{ background: 'var(--paper)', padding: '8px 16px' }}><span className="lbl">Delivers</span></div>
            {drivers.map((u) => (
              <div key={u.id} className="row">
                <div style={{ width: 38, height: 38, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, background: u.prefix ? 'var(--ink)' : '#e4e2da', color: u.prefix ? '#fff' : 'var(--ink)' }}>
                  {u.name.slice(0, 1)}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600 }}>{u.name}</span>
                  <span className="num" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                    <span style={{ textTransform: 'capitalize' }}>{u.role}</span>
                    {u.prefix ? ` · also bills as ${u.prefix}` : ' · route and delivery only'}
                  </span>
                </div>
                <Chevron size={17} color="var(--faint)" />
              </div>
            ))}
          </div>

          <div style={{ padding: '0 16px' }}>
            <div style={{ border: '1.5px dashed #b9b9b2', padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Plus size={19} color="#fff" />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 14.5, fontWeight: 600 }}>Invite someone</span>
                <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>They get a link by SMS · next letter is {nextLetter}</span>
              </div>
            </div>
          </div>

          <div style={{ padding: '0 16px' }}>
            <div className="card" style={{ borderLeft: '3px solid var(--ok)', padding: 15, display: 'flex', flexDirection: 'column', gap: 9 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Info size={15} color="var(--ok)" />
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>Why the letters</span>
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                Every biller gets their own bill series — <span className="num" style={{ fontWeight: 600 }}>A-{fy}-0119</span>,{' '}
                <span className="num" style={{ fontWeight: 600 }}>B-{fy}-0044</span>. Three people can bill in three villages
                with no signal and no two bills ever share a number.
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                Tell your tax office you use parallel series before the first bill. {pendingByUser} change{pendingByUser === 1 ? '' : 's'} waiting to sync.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="footer">
        <button className="btn" onClick={() => nav(-1)}>Done</button>
      </div>
    </>
  );
}
