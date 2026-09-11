import { useNavigate, Link } from 'react-router-dom';
import { Van } from '../ui/icons';

/**
 * First run: Bitaran is one app, two sides — suppliers and the shops they
 * deliver to. G.K Suppliers is just one supplier account on it, not the app
 * itself. Pick a side, then set up an account for it.
 */
export default function Welcome() {
  const nav = useNavigate();
  const choose = (role: 'supplier' | 'customer') => nav(`/signup/${role}`);

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
            One app,<br />suppliers &amp; shops
          </span>
          <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
            Are you delivering stock, or ordering it? Pick a side and set up your account.
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

        <Link to="/login" style={{ textAlign: 'center', fontSize: 12.5, color: 'rgba(255,255,255,0.75)', textDecoration: 'none' }}>
          Already have an account? <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Log in</span>
        </Link>

        <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 1.5 }}>
          Demo build — accounts live only on this phone. There is no real server yet.
        </span>
      </div>
    </div>
  );
}
