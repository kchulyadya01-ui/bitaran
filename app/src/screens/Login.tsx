import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../lib/domain';
import { Back, Van } from '../ui/icons';

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!email.trim() || !password || busy) return;
    setBusy(true);
    setError('');
    try {
      await login(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not log in.');
      setBusy(false);
    }
  };

  return (
    <>
      <header className="topbar" style={{ background: 'var(--ink)', borderBottom: 'none', color: '#fff', gap: 12 }}>
        <button onClick={() => nav('/welcome')} aria-label="Back"><Back size={20} color="#fff" /></button>
        <div style={{ width: 30, height: 30, borderRadius: 15, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Van size={15} color="#fff" />
        </div>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Log in</span>
      </header>

      <div className="scroll">
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
            Log back in to the supplier or shop account you already made on this phone.
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <span className="lbl" style={{ fontSize: 11 }}>Gmail (or any email)</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoCapitalize="none" autoCorrect="off" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <span className="lbl" style={{ fontSize: 11 }}>Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
          </div>

          {error && (
            <div style={{ padding: 12, borderRadius: 12, background: 'var(--bad-soft)', color: 'var(--bad)', fontSize: 12.5 }}>
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="footer">
        <button className="btn" disabled={!email.trim() || !password || busy} onClick={submit}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
        <Link to="/welcome" style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--muted)', textDecoration: 'none' }}>
          New here? <span style={{ color: 'var(--ok)', fontWeight: 600 }}>Create an account</span>
        </Link>
      </div>
    </>
  );
}
