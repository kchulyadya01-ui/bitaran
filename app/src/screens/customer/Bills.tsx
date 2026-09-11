import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { bs, money } from '../../lib/domain';
import { useShopRows } from '../../lib/hooks';
import { Receipt, Check, Download } from '../../ui/icons';

const DAY = 86_400_000;

export default function Bills() {
  const shopRows = useShopRows();

  const data = useLiveQuery(async () => {
    if (!shopRows.length) return null;
    const ids = shopRows.map((r) => r.id);
    const [invoices, payments, tenants] = await Promise.all([
      db.invoices.where('customerId').anyOf(ids).toArray(),
      db.payments.where('customerId').anyOf(ids).toArray(),
      db.tenants.toArray(),
    ]);
    const supplierName = Object.fromEntries(tenants.map((t) => [t.id, t.name.replace(' Pvt. Ltd.', '')]));
    const paidByInvoice = new Set(payments.map((p) => p.invoiceId).filter(Boolean) as string[]);
    const issued = invoices.filter((i) => i.status === 'issued').sort((a, b) => b.issuedAt - a.issuedAt);
    const unpaid = issued.filter((i) => i.paymentType === 'credit' && !paidByInvoice.has(i.id));
    const paid = issued.filter((i) => i.paymentType === 'cash' || paidByInvoice.has(i.id));
    const due = unpaid.reduce((s, i) => s + i.total, 0)
      - payments.filter((p) => !p.invoiceId).reduce((s, p) => s + p.amount, 0);
    const oldest = unpaid.length ? Math.min(...unpaid.map((i) => i.issuedAt)) : undefined;
    return {
      unpaid, paid, supplierName,
      due: Math.max(0, due),
      days: oldest ? Math.floor((Date.now() - oldest) / DAY) : 0,
    };
  }, [shopRows.map((r) => r.id).join(',')]);

  return (
    <>
      <div style={{ padding: '20px 18px 14px' }}>
        <span className="disp" style={{ fontSize: 22, fontWeight: 500 }}>Bills &amp; balance</span>
      </div>

      <div style={{ padding: '0 18px 14px' }}>
        <div style={{ background: data?.due ? '#7a3d22' : '#3f6b4a', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span className="np" style={{ fontSize: 12, color: '#e8c8b2' }}>बाँकी रकम · you owe</span>
              <span className="disp" style={{ fontSize: 34, fontWeight: 600, color: '#fffdf8', lineHeight: 1 }}>Rs {money(data?.due ?? 0)}</span>
            </div>
            {!!data?.days && (
              <div style={{ padding: '6px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: '#f3c9a8' }} />
                <span style={{ fontSize: 11, color: '#f7e0ce', fontWeight: 600 }}>{data.days} days</span>
              </div>
            )}
          </div>
          <span style={{ fontSize: 12, color: '#e8c8b2', lineHeight: 1.5 }}>
            {data?.due
              ? `${data.unpaid.length} unpaid bill${data.unpaid.length === 1 ? '' : 's'}. Pay the driver on the next delivery, or transfer and the dealer marks it received.`
              : 'Nothing outstanding. Every bill is settled.'}
          </span>
        </div>
      </div>

      <div className="scroll" style={{ padding: '0 18px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 16 }}>
          {!!data?.unpaid.length && (
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', padding: 2 }}>Unpaid</span>
          )}
          {(data?.unpaid ?? []).map((i) => (
            <div key={i.id} className="card" style={{ borderColor: '#dcb9a2', padding: '15px 16px', display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#f7e7dc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Receipt size={18} color="var(--c-accent)" />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{i.number}</span>
                <span style={{ fontSize: 11.5, color: 'var(--c-muted)' }}>{data!.supplierName[i.tenantId]} · {bs(i.issuedAt).dayMonth}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                <span className="disp" style={{ fontSize: 17, fontWeight: 600 }}>{money(i.total)}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-accent)' }}>Due</span>
              </div>
            </div>
          ))}

          {!!data?.paid.length && (
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', padding: '8px 2px 2px' }}>Paid</span>
          )}
          {(data?.paid ?? []).map((i) => (
            <div key={i.id} className="card" style={{ padding: '15px 16px', display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#eaf0ea', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Check size={18} color="var(--c-ok)" />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{i.number}</span>
                <span style={{ fontSize: 11.5, color: 'var(--c-muted)' }}>{data!.supplierName[i.tenantId]} · {bs(i.issuedAt).dayMonth} · {i.paymentType}</span>
              </div>
              <span className="disp" style={{ fontSize: 17, fontWeight: 600, color: 'var(--c-muted)' }}>{money(i.total)}</span>
            </div>
          ))}

          {!data?.unpaid.length && !data?.paid.length && (
            <div className="card" style={{ padding: 24, textAlign: 'center', fontSize: 13.5, color: 'var(--c-muted)' }}>No bills yet</div>
          )}
        </div>
      </div>

      <div style={{ padding: '14px 18px 18px' }}>
        <button className="btn warm ghost" style={{ height: 54 }} onClick={() => window.print()}>
          <Download size={17} color="var(--c-ink)" /> Save bills
        </button>
      </div>
    </>
  );
}
