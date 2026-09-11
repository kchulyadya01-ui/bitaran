import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { bs, clock, money } from '../../lib/domain';
import { amountInWords } from '../../lib/words';
import { useTenant, useToast } from '../../lib/hooks';
import { Back, Whats, Print, Download } from '../../ui/icons';

export default function InvoiceView() {
  const { id } = useParams();
  const nav = useNavigate();
  const tenant = useTenant();
  const [toast, setToast] = useToast();
  const [counted, setCounted] = useState(false);

  const data = useLiveQuery(async () => {
    if (!id) return null;
    const invoice = await db.invoices.get(id);
    if (!invoice) return null;
    const [lines, customer, issuer] = await Promise.all([
      db.invoiceLines.where('invoiceId').equals(id).toArray(),
      db.customers.get(invoice.customerId),
      db.users.get(invoice.issuedBy),
    ]);
    return { invoice, lines, customer, issuer };
  }, [id]);

  // Procedure 2072: reprints are counted and stamped. First open is the original.
  useEffect(() => {
    if (!data?.invoice || counted) return;
    setCounted(true);
    db.invoices.update(data.invoice.id, { printCount: data.invoice.printCount + 1 });
  }, [data?.invoice?.id, counted]);

  if (!data) return <div className="scroll" style={{ padding: 24 }}><span className="lbl">loading</span></div>;
  const { invoice, lines, customer, issuer } = data;
  const isReprint = invoice.printCount > 1;

  const asText = () =>
    [
      tenant?.name,
      `PAN ${tenant?.pan}`,
      `TAX INVOICE ${invoice.number}`,
      `Date ${bs(invoice.issuedAt).ymd} BS · ${clock(invoice.issuedAt)}`,
      `Buyer: ${customer?.shopName} (PAN ${invoice.buyerPan})`,
      '',
      ...lines.map((l) => `${l.nameSnapshot} x${l.qty} @ ${money(l.rateSnapshot, true)} = ${money(l.lineTotal, true)}`),
      '',
      `Taxable ${money(invoice.subtotal, true)}`,
      `VAT 13% ${money(invoice.vat, true)}`,
      `TOTAL Rs ${money(invoice.total, true)}`,
      invoice.paymentType === 'cash' ? 'Paid: CASH' : 'CREDIT — pay later',
    ].join('\n');

  async function share() {
    const text = asText();
    if (navigator.share) {
      try {
        await navigator.share({ title: `Bill ${invoice.number}`, text });
        return;
      } catch { /* user dismissed */ }
    }
    const phone = customer?.phone?.replace(/\D/g, '');
    window.open(`https://wa.me/${phone ? '977' + phone : ''}?text=${encodeURIComponent(text)}`, '_blank');
  }

  return (
    <>
      <header className="topbar" style={{ background: 'var(--ink)', borderBottom: 'none' }}>
        <button onClick={() => nav('/')} aria-label="Back"><Back size={20} color="#fff" /></button>
        <div style={{ flex: 1, fontSize: 15, fontWeight: 600, color: '#fff' }}>Bill issued</div>
        <span className="num" style={{ fontSize: 12, color: 'var(--faint)' }}>queued to sync</span>
      </header>

      <div className="scroll" style={{ padding: 14 }}>
        <div style={{ background: '#fff', border: '1px solid #c9c9c2', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px 12px', borderBottom: '2px solid var(--ink)', display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{tenant?.name}</div>
            <div style={{ fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.4 }}>{tenant?.address} · {tenant?.phone}</div>
            <div className="num" style={{ fontSize: 11, fontWeight: 600 }}>PAN {tenant?.pan}</div>
            <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em' }}>TAX INVOICE · कर बीजक</div>
          </div>

          <div style={{ display: 'flex', borderBottom: '1px solid var(--line)' }}>
            <div style={{ flex: 1, padding: '10px 12px', borderRight: '1px solid var(--line)' }}>
              <div className="lbl" style={{ fontSize: 9 }}>Invoice no.</div>
              <div className="num" style={{ fontSize: 13, fontWeight: 600, marginTop: 3 }}>{invoice.number}</div>
            </div>
            <div style={{ flex: 1, padding: '10px 12px' }}>
              <div className="lbl" style={{ fontSize: 9 }}>Date &amp; time (B.S.)</div>
              <div className="num" style={{ fontSize: 13, fontWeight: 600, marginTop: 3 }}>
                {bs(invoice.issuedAt).ymd} · {clock(invoice.issuedAt)}
              </div>
              <div className="num" style={{ fontSize: 10, color: 'var(--muted)' }}>
                {new Date(invoice.issuedAt).toLocaleDateString('en-CA')} A.D.
              </div>
            </div>
          </div>

          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="lbl" style={{ fontSize: 9 }}>Buyer</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{customer?.shopName}</div>
            <div className="num" style={{ fontSize: 11 }}>PAN {invoice.buyerPan} · {customer?.address}</div>
          </div>

          <div style={{ display: 'flex', padding: '8px 12px', background: 'var(--paper)', borderBottom: '1px solid var(--line)' }}>
            <div className="lbl" style={{ flex: 1, fontSize: 9 }}>Particulars</div>
            <div className="lbl" style={{ width: 34, textAlign: 'right', fontSize: 9 }}>Qty</div>
            <div className="lbl" style={{ width: 56, textAlign: 'right', fontSize: 9 }}>Rate</div>
            <div className="lbl" style={{ width: 66, textAlign: 'right', fontSize: 9 }}>Amount</div>
          </div>

          {lines.map((l) => (
            <div key={l.id} style={{ display: 'flex', padding: '9px 12px', borderBottom: '1px solid var(--hair)', alignItems: 'baseline' }}>
              <div style={{ flex: 1, fontSize: 12 }}>{l.nameSnapshot}</div>
              <div className="num" style={{ width: 34, textAlign: 'right', fontSize: 12 }}>{l.qty}</div>
              <div className="num" style={{ width: 56, textAlign: 'right', fontSize: 12 }}>{money(l.rateSnapshot, true)}</div>
              <div className="num" style={{ width: 66, textAlign: 'right', fontSize: 12, fontWeight: 600 }}>{money(l.lineTotal, true)}</div>
            </div>
          ))}

          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--muted)' }}>Taxable amount</span><span className="num">{money(invoice.subtotal, true)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--muted)' }}>VAT @ 13%</span><span className="num">{money(invoice.vat, true)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 7, borderTop: '2px solid var(--ink)' }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Total</span>
              <span className="num" style={{ fontSize: 19, fontWeight: 700 }}>Rs {money(invoice.total, true)}</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.45, paddingTop: 3 }}>
              {amountInWords(invoice.total)} Payment: {invoice.paymentType === 'cash' ? 'CASH' : 'CREDIT'}.
            </div>
          </div>

          <div style={{ padding: '9px 12px', background: 'var(--paper)', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div className="num" style={{ fontSize: 9.5, color: 'var(--muted)', lineHeight: 1.4 }}>
              Issued by {issuer?.name.split(' ')[0]} · device {invoice.prefix}<br />
              Printed {invoice.printCount} time{invoice.printCount === 1 ? '' : 's'}
            </div>
            <div style={{ border: `1px solid ${isReprint ? 'var(--bad)' : '#c9c9c2'}`, borderRadius: 999, padding: '4px 9px', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: isReprint ? 'var(--bad)' : 'var(--muted)' }}>
              {isReprint ? 'COPY OF ORIGINAL' : 'ORIGINAL'}
            </div>
          </div>
        </div>
      </div>

      <div className="footer">
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" style={{ flex: 1, height: 52, background: 'var(--ok)' }} onClick={share}>
            <Whats size={17} color="#fff" /> Share
          </button>
          <button className="btn ghost" style={{ width: 64, height: 52 }} onClick={() => window.print()} aria-label="Print"><Print size={19} /></button>
          <button className="btn ghost" style={{ width: 64, height: 52 }} onClick={() => { navigator.clipboard?.writeText(asText()); setToast('Bill copied'); }} aria-label="Copy"><Download size={19} /></button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.45 }}>
          Reprints are stamped <strong style={{ color: 'var(--ink)' }}>copy of original</strong> and counted
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
