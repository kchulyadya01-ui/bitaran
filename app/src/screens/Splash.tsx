import { Van } from '../ui/icons';

/** First thing anyone sees, cold. Brief, then the shell takes over. */
export default function Splash() {
  return (
    <div
      className="frame"
      style={{
        alignItems: 'center', justifyContent: 'center', background: 'var(--ink)',
        backgroundImage: 'radial-gradient(circle at 50% 32%, #262b2f 0%, var(--ink) 65%)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        <div
          style={{
            width: 84, height: 84, borderRadius: 42, background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'splashPop 0.55s cubic-bezier(0.2, 0.8, 0.2, 1)',
            boxShadow: '0 12px 32px -8px rgba(255, 138, 61, 0.55)',
          }}
        >
          <Van size={40} color="#fff" />
        </div>
        <span
          className="disp"
          style={{
            fontSize: 26, fontWeight: 600, color: '#fff', letterSpacing: '-0.01em',
            animation: 'splashFade 0.5s ease 0.25s both',
          }}
        >
          Bitaran
        </span>
      </div>
      <span
        className="np"
        style={{
          position: 'absolute', bottom: 'calc(40px + env(safe-area-inset-bottom))',
          fontSize: 12.5, color: 'var(--faint)', animation: 'splashFade 0.5s ease 0.5s both',
        }}
      >
        वितरण
      </span>
    </div>
  );
}
