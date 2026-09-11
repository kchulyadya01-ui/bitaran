import { setMeta } from '../lib/db';
import { useTenant } from '../lib/hooks';
import { Van } from '../ui/icons';

/**
 * First run: the app is two products sharing one database. Pick a side and the
 * whole shell — navigation, skin, permissions — follows from it.
 */
export default function Welcome() {
  const tenant = useTenant();

  // Write the choice only; the shell redirects as soon as it reads it back.
  const choose = (role: 'supplier' | 'customer') => setMeta('appRole', role);

  return (
    <div
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        background: 'radial-gradient(circle at 30% 18%, #2b3138 0%, var(--ink) 55%)',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* No product photography to draw on here — a soft brand wash and a
          watermark of the van mark stand in for the hero image. */}
      <div style={{ position: 'absolute', top: '8%', left: '50%', transform: 'translateX(-50%)' }}>
        <Van size={340} color="rgba(255,255,255,0.05)" w={1} />
      </div>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 15, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Van size={15} color="#fff" />
        </div>
        <span style={{ fontSize: 14.5, fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>Bitaran</span>
      </div>

      <div
        style={{
          position: 'relative', padding: '32px 22px calc(28px + env(safe-area-inset-bottom))',
          display: 'flex', flexDirection: 'column', gap: 20,
          background: 'linear-gradient(180deg, transparent, rgba(22,24,26,0.55) 25%, var(--ink) 62%)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="disp" style={{ fontSize: 30, fontWeight: 600, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.01em' }}>
            One app,<br />all of {tenant?.name.replace(' Pvt. Ltd.', '') ?? 'Bitaran'}
          </span>
          <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
            Choose how you use it. You can switch sides any time from More.
          </span>
        </div>

        <div style={{ display: 'flex', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 999, overflow: 'hidden' }}>
          <button
            onClick={() => choose('supplier')}
            style={{ flex: 1, height: 54, color: '#fff', fontSize: 15, fontWeight: 600, borderRight: '1.5px solid rgba(255,255,255,0.3)' }}
          >
            Supplier
          </button>
          <button
            onClick={() => choose('customer')}
            style={{ flex: 1, height: 54, color: '#fff', fontSize: 15, fontWeight: 600 }}
          >
            Customer
          </button>
        </div>

        <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 1.5 }}>
          Demo build — both sides share one device. On real phones each person signs in to their own.
        </span>
      </div>
    </div>
  );
}
