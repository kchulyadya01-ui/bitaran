import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, setMeta } from '../lib/db';
import { resetAll } from '../lib/seed';
import { useActiveUser, useTenantId } from '../lib/hooks';
import { Chevron, Person, Shop, Receipt, Bars, Sync, Grid } from './icons';

const LINKS = [
  { to: '/bills', label: 'Bill book', sub: 'every bill you have issued', Icon: Receipt },
  { to: '/incoming', label: 'Incoming stock', sub: 'what the Main Dealer is sending', Icon: Grid },
  { to: '/reports', label: 'Reports', sub: 'sales, best sellers, dues', Icon: Bars },
  { to: '/sync', label: 'Sync queue', sub: 'what is waiting to go out', Icon: Sync },
  { to: '/setup/business', label: 'Business details', sub: 'name, PAN, address', Icon: Shop },
  { to: '/setup/team', label: 'Team', sub: 'who can bill, and their series', Icon: Person },
];

/** Everything that used to live on its own "More" tab, now a sheet off the hamburger. */
export default function MoreMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const tenantId = useTenantId();
  const user = useActiveUser();
  const [pick, setPick] = useState(false);

  const users = useLiveQuery(async () => (tenantId ? db.users.where('tenantId').equals(tenantId).toArray() : []), [tenantId], []);

  if (!open) return null;

  return (
    <>
      <div className="sheet-back" onClick={onClose}>
        <div className="sheet" onClick={(e) => e.stopPropagation()}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>More</div>

          <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span className="lbl">Signed in as</span>
            <button onClick={() => setPick(true)} style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
              <div style={{ width: 40, height: 40, borderRadius: 20, background: 'var(--ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, flexShrink: 0 }}>
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
          </div>

          <div className="rows" style={{ border: '1px solid var(--line)' }}>
            {LINKS.map(({ to, label, sub, Icon }) => (
              <Link key={to} to={to} className="row" style={{ textDecoration: 'none', color: 'inherit' }} onClick={onClose}>
                <Icon size={19} color="var(--muted)" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{sub}</span>
                </div>
                <Chevron size={16} color="var(--faint)" />
              </Link>
            ))}
          </div>

          <button
            onClick={() => setMeta('appRole', undefined)}
            className="card"
            style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}
          >
            <Shop size={19} color="var(--muted)" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 14.5, fontWeight: 600 }}>Change role</span>
              <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>switch to the shop-owner side</span>
            </div>
            <Chevron size={16} color="var(--faint)" />
          </button>

          <button
            style={{ fontSize: 12.5, color: 'var(--bad)', fontWeight: 600, padding: 12 }}
            onClick={() => { if (confirm('Wipe all local data and reload with fresh demo data?')) resetAll(); }}
          >
            Reset demo data
          </button>

          <button className="btn ghost" onClick={onClose}>Close</button>
        </div>
      </div>

      {pick && (
        <div className="sheet-back" onClick={() => setPick(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Switch person</div>
            <div style={{ maxHeight: '50vh', overflowY: 'auto' }} className="rows">
              {users.map((u) => (
                <button key={u.id} className="row" style={{ textAlign: 'left' }} onClick={async () => { await setMeta('activeUserId', u.id); setPick(false); }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 600 }}>{u.name}</span>
                    <span className="num" style={{ fontSize: 11, color: 'var(--muted)' }}>{u.role}{u.prefix ? ` · series ${u.prefix}` : ' · no billing'}</span>
                  </div>
                  {u.id === user?.id && <span className="lbl" style={{ color: 'var(--ok)' }}>current</span>}
                </button>
              ))}
            </div>
            <button className="btn ghost" onClick={() => setPick(false)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}
