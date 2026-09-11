import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { signupSupplier, signupCustomer, currentPosition } from '../lib/domain';
import { Back, Pin, Van } from '../ui/icons';

/**
 * Right after choosing Supplier or Customer, a short form: who they are and
 * where. No server exists yet, so this is stored on the device only — the
 * caveat at the bottom says so plainly.
 */
export default function Signup() {
  const nav = useNavigate();
  const { role } = useParams<{ role: 'supplier' | 'customer' }>();
  const isSupplier = role === 'supplier';

  const [shopName, setShopName] = useState('');
  const [pan, setPan] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [pinned, setPinned] = useState<{ lat: number; lng: number } | undefined>();
  const [locating, setLocating] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const ready = shopName.trim() && pan.trim() && contactName.trim() && phone.trim()
    && address.trim() && email.trim().includes('@') && password.length >= 4;

  const pinLocation = async () => {
    setLocating(true);
    const pos = await currentPosition();
    setPinned(pos);
    setLocating(false);
  };

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError('');
    try {
      const details = { shopName, pan, contactName, phone, address, lat: pinned?.lat, lng: pinned?.lng, email, password };
      if (isSupplier) await signupSupplier(details);
      else await signupCustomer(details);
      // The route redirect follows once appRole is set — nothing else to do.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the account.');
      setBusy(false);
    }
  };

  const input = (label: string, value: string, setter: (v: string) => void, opts?: { type?: string; hint?: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <span className="lbl" style={{ fontSize: 11 }}>{label}</span>
      <input
        type={opts?.type ?? 'text'} value={value} onChange={(e) => setter(e.target.value)}
        autoCapitalize="none" autoCorrect="off"
      />
      {opts?.hint && <span style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4 }}>{opts.hint}</span>}
    </div>
  );

  return (
    <>
      <header className="topbar" style={{ background: 'var(--ink)', borderBottom: 'none', color: '#fff', gap: 12 }}>
        <button onClick={() => nav('/welcome')} aria-label="Back"><Back size={20} color="#fff" /></button>
        <div style={{ width: 30, height: 30, borderRadius: 15, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Van size={15} color="#fff" />
        </div>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{isSupplier ? 'Set up your business' : 'Set up your shop'}</span>
      </header>

      <div className="scroll">
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
            {isSupplier
              ? 'A few details about your business — this is what shows on your bills.'
              : 'A few details about your shop — this is what your supplier sees.'}
          </span>

          {input(isSupplier ? 'Business name' : 'Shop name', shopName, setShopName, { hint: 'Exactly as you want it printed on bills' })}
          {input('PAN / VAT number', pan, setPan)}
          {input('Your name', contactName, setContactName)}
          {input('Phone number', phone, setPhone, { type: 'tel' })}
          {input('Location / address', address, setAddress)}

          <button
            className="chip" onClick={pinLocation} disabled={locating}
            style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 7 }}
          >
            <Pin size={13} color={pinned ? 'var(--ok)' : 'var(--muted)'} />
            {locating ? 'Finding you…' : pinned ? 'Location pinned' : 'Pin my location (optional)'}
          </button>

          <div style={{ height: 1, background: 'var(--hair)' }} />

          {input('Gmail (or any email)', email, setEmail, { type: 'email', hint: 'Used to log back in — not shared or verified anywhere' })}
          {input('Password', password, setPassword, { type: 'password', hint: 'At least 4 characters' })}

          {error && (
            <div style={{ padding: 12, borderRadius: 12, background: 'var(--bad-soft)', color: 'var(--bad)', fontSize: 12.5 }}>
              {error}
            </div>
          )}

          <span style={{ fontSize: 11.5, color: 'var(--faint)', lineHeight: 1.5, textAlign: 'center' }}>
            Demo build — this account lives only on this phone. There is no real server yet, so no one else can verify or see it.
          </span>
        </div>
      </div>

      <div className="footer">
        <button className="btn" disabled={!ready || busy} onClick={submit}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
        <Link to="/login" style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--muted)', textDecoration: 'none' }}>
          Already have an account? <span style={{ color: 'var(--ok)', fontWeight: 600 }}>Log in</span>
        </Link>
      </div>
    </>
  );
}
