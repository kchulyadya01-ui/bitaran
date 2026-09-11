import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { fiscalYearOf } from '../../lib/domain';
import { useActiveUser, useTenant, useTenantId } from '../../lib/hooks';
import { Back, Van } from '../../ui/icons';

export default function Business() {
  const nav = useNavigate();
  const tenant = useTenant();
  const tenantId = useTenantId();
  const user = useActiveUser();
  const billers = useLiveQuery(
    async () => (tenantId ? (await db.users.where('tenantId').equals(tenantId).toArray()).filter((u) => u.prefix) : []),
    [tenantId], [],
  );

  const field = (label: string, value: string, hint?: string, mono = false) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }} key={label}>
      <span className="lbl" style={{ fontSize: 11 }}>{label}</span>
      <div className={mono ? 'num' : ''} style={{ background: 'var(--card)', border: '1px solid var(--ink)', padding: 14, fontSize: 15, fontWeight: 500 }}>{value}</div>
      {hint && <span style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.45 }}>{hint}</span>}
    </div>
  );

  return (
    <>
      <header className="topbar" style={{ background: 'var(--ink)', borderBottom: 'none', flexDirection: 'column', alignItems: 'stretch', gap: 14, color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => nav(-1)} aria-label="Back"><Back size={20} color="#fff" /></button>
          <Van size={22} color="#fff" />
          <span style={{ fontSize: 15, fontWeight: 600 }}>Bitaran</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.25 }}>Your business</span>
          <span style={{ fontSize: 13, color: 'var(--faint)', lineHeight: 1.5 }}>
            This prints on every bill you issue. Each business on Bitaran keeps its own.
          </span>
        </div>
      </header>

      <div className="scroll">
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {field('Business name', tenant?.name ?? '', 'Exactly as registered — this prints on every bill')}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1.2 }}>{field('PAN / VAT no.', tenant?.pan ?? '', undefined, true)}</div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
              <span className="lbl" style={{ fontSize: 11 }}>Registered</span>
              <div style={{ display: 'flex', border: '1px solid var(--ink)', height: 51 }}>
                <div style={{ flex: 1, background: tenant?.vatRegistered ? 'var(--ink)' : 'var(--card)', color: tenant?.vatRegistered ? '#fff' : 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>VAT</div>
                <div style={{ flex: 1, background: tenant?.vatRegistered ? 'var(--card)' : 'var(--ink)', color: tenant?.vatRegistered ? 'var(--muted)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>PAN</div>
              </div>
            </div>
          </div>
          {field('Address', tenant?.address ?? '')}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <span className="lbl" style={{ fontSize: 11 }}>What you distribute</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {(tenant?.categories ?? []).map((c) => <span key={c} className="chip on">{c}</span>)}
              <span className="chip">Beverages</span>
              <span className="chip">Dairy</span>
            </div>
          </div>

          <div className="card" style={{ borderLeft: '3px solid var(--ok)', padding: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span className="lbl" style={{ color: 'var(--ok)' }}>Your bill numbers</span>
              <span className="num" style={{ fontSize: 15, fontWeight: 600 }}>
                {user?.prefix ?? 'A'}-{fiscalYearOf()}-0001
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }}>
              {billers.length} {billers.length === 1 ? 'person issues' : 'people issue'} bills, each with their own letter
              ({billers.map((b) => b.prefix).join(', ')}), so two people can bill at the same time with no signal and never
              clash. Series restarts each fiscal year.
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
