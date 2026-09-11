import { setMeta } from '../lib/db';
import { useTenant } from '../lib/hooks';
import { Van, Shop, Chevron } from '../ui/icons';

/**
 * First run: the app is two products sharing one database. Pick a side and the
 * whole shell — navigation, skin, permissions — follows from it.
 */
export default function Welcome() {
  const tenant = useTenant();

  // Write the choice only; the shell redirects as soon as it reads it back.
  const choose = (role: 'supplier' | 'customer') => setMeta('appRole', role);

  return (
    <>
      <header className="topbar" style={{ background: 'var(--ink)', borderBottom: 'none', flexDirection: 'column', alignItems: 'stretch', gap: 16, color: '#fff', paddingBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Van size={22} color="#fff" />
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>Bitaran</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 25, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Who are you?
          </span>
          <span style={{ fontSize: 13.5, color: 'var(--faint)', lineHeight: 1.55 }}>
            {tenant?.name.replace(' Pvt. Ltd.', '') ?? 'This distributor'} uses Bitaran for orders, bills and delivery.
            Pick your side — you can change it later.
          </span>
        </div>
      </header>

      <div className="scroll">
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

          <button
            onClick={() => choose('supplier')}
            style={{ background: 'var(--card)', border: '1px solid var(--line)', borderLeft: '4px solid var(--ink)', padding: 18, display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 52, height: 52, background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Van size={26} color="#fff" />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>I supply shops</span>
                <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Owner, partner, staff or rider</span>
              </div>
              <Chevron size={18} color="var(--faint)" />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {['Take orders', 'Make VAT bills', 'Plan the route', 'Track dues', 'Stock'].map((t) => (
                <span key={t} style={{ fontSize: 11.5, fontWeight: 500, padding: '6px 9px', background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--muted)' }}>{t}</span>
              ))}
            </div>
            <span style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>
              Works with no signal. Everything saves on the phone and syncs later.
            </span>
          </button>

          <button
            onClick={() => choose('customer')}
            style={{ background: 'var(--c-card)', border: '1px solid var(--c-line)', borderLeft: '4px solid var(--c-accent)', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left', color: 'var(--c-ink)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: 26, background: 'var(--c-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Shop size={25} color="#fffdf8" />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="disp" style={{ fontSize: 19, fontWeight: 600 }}>I run a shop</span>
                <span style={{ fontSize: 12.5, color: 'var(--c-muted)' }}>Order stock for your store</span>
              </div>
              <Chevron size={18} color="var(--c-faint)" />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {['Browse prices', 'Order in seconds', 'Track delivery', 'See your bills'].map((t) => (
                <span key={t} style={{ fontSize: 11.5, fontWeight: 500, padding: '6px 10px', borderRadius: 20, background: 'var(--c-paper)', border: '1px solid var(--c-line)', color: 'var(--c-muted)' }}>{t}</span>
              ))}
            </div>
            <span style={{ fontSize: 11.5, color: 'var(--c-muted)', lineHeight: 1.5 }}>
              No phone calls. Pick a day and a time window, and the dealer sees it straight away.
            </span>
          </button>

          <div style={{ fontSize: 11.5, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.5, padding: '4px 12px' }}>
            Demo build — both sides share one device. On real phones each person signs in to their own.
          </div>
        </div>
      </div>
    </>
  );
}
