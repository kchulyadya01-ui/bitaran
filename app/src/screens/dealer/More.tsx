import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, setMeta } from '../../lib/db';
import { resetAll } from '../../lib/seed';
import { useActiveUser, useActiveCustomer, useTenant, useTenantId } from '../../lib/hooks';
import { Chevron, Person, Shop, Receipt, Bars, Sync, Grid } from '../../ui/icons';

export default function More() {
  const nav = useNavigate();
  const tenant = useTenant();
  const tenantId = useTenantId();
  const user = useActiveUser();
  const customer = useActiveCustomer();
  const [pick, setPick] = useState<'none' | 'user' | 'shop'>('none');

  const users = useLiveQuery(async () => (tenantId ? db.users.where('tenantId').equals(tenantId).toArray() : []), [tenantId], []);
  const customers = useLiveQuery(async () => (tenantId ? db.customers.where('tenantId').equals(tenantId).toArray() : []), [tenantId], []);

  const links = [
    { to: '/incoming', label: 'Incoming stock', sub: 'what the Main Dealer is sending', Icon: Grid },
    { to: '/reports', label: 'Reports', sub: 'sales, best sellers, dues', Icon: Bars },
    { to: '/sync', label: 'Sync queue', sub: 'what is waiting to go out', Icon: Sync },
    { to: '/setup/business', label: 'Business details', sub: 'name, PAN, address', Icon: Receipt },
    { to: '/setup/team', label: 'Team', sub: 'who can bill, and their series', Icon: Person },
  ];

  return (
    <>
      <header className="topbar" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 5 }}>
        <div className="title">More</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{tenant?.name}</div>
      </header>

      <div className="scroll">
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span className="lbl">Signed in as</span>
            <button onClick={() => setPick('user')} style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
              <div style={{ width: 40, height: 40, background: 'var(--ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600 }}>
                {user?.name.slice(0, 1)}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{user?.name}</span>
                <span className="num" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                  {user?.role}{user?.prefix ? ` · bills as ${user.prefix}` : ' · cannot bill'}
                </span>
              </div>
              <Chevron size={16} color="var(--faint)" />
            </button>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>
              Switching person switches the bill series, so you can see two billers side by side.
            </div>
          </div>

          <div className="rows" style={{ border: '1px solid var(--line)' }}>
            {links.map(({ to, label, sub, Icon }) => (
              <Link key={to} to={to} className="row" style={{ textDecoration: 'none', color: 'inherit' }}>
                <Icon size={19} color="var(--muted)" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{sub}</span>
                </div>
                <Chevron size={16} color="var(--faint)" />
              </Link>
            ))}
          </div>

          <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span className="lbl">Customer side</span>
            <button onClick={() => setPick('shop')} style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
              <Shop size={20} color="var(--muted)" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 14.5, fontWeight: 600 }}>{customer?.shopName ?? 'Pick a shop'}</span>
                <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>view the app as this customer</span>
              </div>
              <Chevron size={16} color="var(--faint)" />
            </button>
            <button className="btn ghost" style={{ height: 48 }} onClick={() => nav('/shop')}>Open customer app</button>
          </div>

          <button
            style={{ fontSize: 12.5, color: 'var(--bad)', fontWeight: 600, padding: 12 }}
            onClick={() => { if (confirm('Wipe all local data and reload with fresh demo data?')) resetAll(); }}
          >
            Reset demo data
          </button>
        </div>
      </div>

      {pick !== 'none' && (
        <div className="sheet-back" onClick={() => setPick('none')}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{pick === 'user' ? 'Switch person' : 'View as shop'}</div>
            <div style={{ maxHeight: '50vh', overflowY: 'auto' }} className="rows">
              {pick === 'user'
                ? users.map((u) => (
                    <button key={u.id} className="row" style={{ textAlign: 'left' }} onClick={async () => { await setMeta('activeUserId', u.id); setPick('none'); }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontSize: 14.5, fontWeight: 600 }}>{u.name}</span>
                        <span className="num" style={{ fontSize: 11, color: 'var(--muted)' }}>{u.role}{u.prefix ? ` · series ${u.prefix}` : ' · no billing'}</span>
                      </div>
                      {u.id === user?.id && <span className="lbl" style={{ color: 'var(--ok)' }}>current</span>}
                    </button>
                  ))
                : customers.map((c) => (
                    <button key={c.id} className="row" style={{ textAlign: 'left' }} onClick={async () => { await setMeta('activeCustomerId', c.id); setPick('none'); nav('/shop'); }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontSize: 14.5, fontWeight: 600 }}>{c.shopName}</span>
                        <span className="num" style={{ fontSize: 11, color: 'var(--muted)' }}>{c.address}</span>
                      </div>
                    </button>
                  ))}
            </div>
            <button className="btn ghost" onClick={() => setPick('none')}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}
