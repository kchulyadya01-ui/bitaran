import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, setMeta } from '../../lib/db';
import { useCustomerTenant, useShopRow, useSuppliers } from '../../lib/hooks';
import { resolveCustomerForTenant } from '../../lib/domain';
import { Chevron, Shop, Whats, Van } from '../../ui/icons';

export default function Account() {
  const tenant = useCustomerTenant();
  const customer = useShopRow();
  const suppliers = useSuppliers();
  const [picking, setPicking] = useState<'none' | 'shop' | 'supplier'>('none');

  const customers = useLiveQuery(() => db.customers.toArray(), [], []);
  const shops = customers.filter((c, i, all) => all.findIndex((x) => x.phone === c.phone) === i);

  return (
    <>
      <div style={{ padding: '20px 18px 14px' }}>
        <span className="disp" style={{ fontSize: 22, fontWeight: 500 }}>Your shop</span>
      </div>

      <div className="scroll" style={{ padding: '0 18px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <button onClick={() => setPicking('shop')} className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left' }}>
            <div style={{ width: 46, height: 46, borderRadius: 23, background: '#f1e5d3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Shop size={21} color="#8e7358" />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              <span style={{ fontSize: 15.5, fontWeight: 600 }}>{customer?.shopName}</span>
              <span style={{ fontSize: 12, color: 'var(--c-muted)' }}>{customer?.address} · PAN {customer?.pan}</span>
            </div>
            <Chevron size={17} color="var(--c-faint)" />
          </button>

          <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Your supplier</span>
              <button onClick={() => setPicking('supplier')} style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--c-accent)', textDecoration: 'underline' }}>Change</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--c-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Van size={20} color="#fffdf8" />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 14.5, fontWeight: 600 }}>{tenant?.name}</span>
                <span style={{ fontSize: 11.5, color: 'var(--c-muted)' }}>{tenant?.address}</span>
                <span className="num" style={{ fontSize: 11.5, color: 'var(--c-muted)' }}>PAN {tenant?.pan}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 9 }}>
              <a className="btn warm ghost" style={{ flex: 1, height: 48, textDecoration: 'none', fontSize: 13.5 }} href={`tel:${tenant?.phone ?? ''}`}>Call</a>
              <a
                className="btn warm ghost" style={{ flex: 1, height: 48, textDecoration: 'none', fontSize: 13.5 }}
                href={`https://wa.me/977${(tenant?.phone ?? '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
              >
                <Whats size={16} color="var(--c-ink)" /> WhatsApp
              </a>
            </div>
          </div>

          <button
            className="card"
            style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 13, textAlign: 'left' }}
            onClick={() => setMeta('appRole', undefined)}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 14.5, fontWeight: 600 }}>I'm not a shop</span>
              <span style={{ fontSize: 11.5, color: 'var(--c-muted)' }}>switch to the supplier side</span>
            </div>
            <Chevron size={17} color="var(--c-faint)" />
          </button>
        </div>
      </div>

      {picking !== 'none' && (
        <div className="sheet-back" onClick={() => setPicking('none')}>
          <div className="sheet" style={{ background: 'var(--c-card)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {picking === 'shop' ? 'Which shop is this?' : 'Which supplier?'}
            </div>
            <div style={{ maxHeight: '50vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {picking === 'shop'
                ? shops.map((c) => (
                    <button
                      key={c.id} className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 3, textAlign: 'left' }}
                      onClick={async () => {
                        await setMeta('shopPhone', c.phone);
                        const row = await resolveCustomerForTenant(tenant?.id ?? c.tenantId, c.phone);
                        if (row) await setMeta('activeCustomerId', row.id);
                        setPicking('none');
                      }}
                    >
                      <span style={{ fontSize: 14.5, fontWeight: 600 }}>{c.shopName}</span>
                      <span style={{ fontSize: 11.5, color: 'var(--c-muted)' }}>{c.address}</span>
                    </button>
                  ))
                : suppliers.map((sp) => {
                    const on = sp.id === tenant?.id;
                    return (
                      <button
                        key={sp.id} className="card"
                        style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left', borderColor: on ? 'var(--c-accent)' : 'var(--c-line)' }}
                        onClick={async () => {
                          await setMeta('customerTenantId', sp.id);
                          if (customer?.phone) {
                            const row = await resolveCustomerForTenant(sp.id, customer.phone);
                            if (row) await setMeta('activeCustomerId', row.id);
                          }
                          setPicking('none');
                        }}
                      >
                        <span style={{ fontSize: 14.5, fontWeight: 600 }}>{sp.name}</span>
                        <span style={{ fontSize: 11.5, color: 'var(--c-muted)' }}>{sp.address}</span>
                        <span className="num" style={{ fontSize: 11.5, color: on ? 'var(--c-accent)' : 'var(--c-muted)', fontWeight: on ? 600 : 400 }}>
                          PAN {sp.pan}{on ? ' · current' : ''}
                        </span>
                      </button>
                    );
                  })}
            </div>
            <button className="btn warm ghost" onClick={() => setPicking('none')}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}
