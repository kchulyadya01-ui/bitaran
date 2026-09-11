import { useEffect, useState } from 'react';

const KEY = 'bitaran.cart';
const EVENT = 'bitaran-cart';

function read(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

function write(next: Record<string, number>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* private mode */ }
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** The customer's draft order. Survives a reload, which is the point when signal drops. */
export function useCart() {
  const [cart, setCart] = useState<Record<string, number>>(read);

  useEffect(() => {
    const sync = () => setCart(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return {
    cart,
    bump(id: string, d: number) {
      const next = { ...read() };
      const q = Math.max(0, (next[id] ?? 0) + d);
      if (q === 0) delete next[id];
      else next[id] = q;
      write(next);
    },
    clear() { write({}); },
  };
}
