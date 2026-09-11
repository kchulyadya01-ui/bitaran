import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db, getMeta } from './db';

export function useMeta<T>(key: string): T | undefined {
  return useLiveQuery(async () => (await db.meta.get(key))?.value as T | undefined, [key]);
}

export type AppRole = 'supplier' | 'customer';

/** 'loading' until Dexie answers, then 'none' if the user has not chosen a side yet. */
export function useAppRole(): AppRole | 'none' | 'loading' {
  return useLiveQuery(
    async () => ((await db.meta.get('appRole'))?.value as AppRole | undefined) ?? 'none',
    [],
    'loading' as const,
  );
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

/** Which supplier the shop is currently ordering from. Independent of the dealer side. */
export function useCustomerTenant() {
  return useLiveQuery(async () => {
    const id = await getMeta<string>('customerTenantId');
    return id ? await db.tenants.get(id) : undefined;
  }, []);
}

export function useCustomerTenantId() {
  return useMeta<string>('customerTenantId');
}

export function useSuppliers() {
  return useLiveQuery(() => db.tenants.toArray(), [], []);
}

/** Every customer row belonging to this shop, one per supplier it buys from. */
export function useShopRows() {
  return useLiveQuery(async () => {
    const phone = await getMeta<string>('shopPhone');
    if (!phone) return [];
    return (await db.customers.toArray()).filter((c) => c.phone === phone);
  }, [], []);
}

/** The shop's customer row with the currently chosen supplier. */
export function useShopRow() {
  return useLiveQuery(async () => {
    const tenantId = await getMeta<string>('customerTenantId');
    const phone = await getMeta<string>('shopPhone');
    if (!tenantId || !phone) return undefined;
    const rows = await db.customers.where('tenantId').equals(tenantId).toArray();
    return rows.find((c) => c.phone === phone);
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
