import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db, getMeta } from './db';

export function useMeta<T>(key: string): T | undefined {
  return useLiveQuery(async () => (await db.meta.get(key))?.value as T | undefined, [key]);
}

export function useTenantId() {
  return useMeta<string>('activeTenantId');
}

export function useActiveUser() {
  return useLiveQuery(async () => {
    const id = await getMeta<string>('activeUserId');
    return id ? await db.users.get(id) : undefined;
  }, []);
}

export function useActiveCustomer() {
  return useLiveQuery(async () => {
    const id = await getMeta<string>('activeCustomerId');
    return id ? await db.customers.get(id) : undefined;
  }, []);
}

export function useTenant() {
  return useLiveQuery(async () => {
    const id = await getMeta<string>('activeTenantId');
    return id ? await db.tenants.get(id) : undefined;
  }, []);
}

export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}

export function usePending() {
  return useLiveQuery(() => db.outbox.count(), [], 0);
}

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2600);
    return () => clearTimeout(t);
  }, [msg]);
  return [msg, setMsg] as const;
}
