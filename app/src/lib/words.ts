const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function under100(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const r = n % 10;
  return TENS[t] + (r ? ' ' + ONES[r] : '');
}

function under1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return (h ? ONES[h] + ' hundred' + (r ? ' ' : '') : '') + (r ? under100(r) : '');
}

/** Nepali/Indian scale: crore, lakh, thousand, hundred. */
export function amountInWords(amount: number): string {
  const whole = Math.floor(Math.abs(amount));
  const paisa = Math.round((Math.abs(amount) - whole) * 100);
  if (whole === 0 && paisa === 0) return 'Zero only.';

  const parts: string[] = [];
  let rest = whole;
  const crore = Math.floor(rest / 10_000_000); rest %= 10_000_000;
  const lakh = Math.floor(rest / 100_000); rest %= 100_000;
  const thousand = Math.floor(rest / 1000); rest %= 1000;

  if (crore) parts.push(under1000(crore) + ' crore');
  if (lakh) parts.push(under1000(lakh) + ' lakh');
  if (thousand) parts.push(under1000(thousand) + ' thousand');
  if (rest) parts.push(under1000(rest));

  let out = parts.join(' ').trim();
  if (paisa) out += ` and ${under100(paisa)} paisa`;
  return out.charAt(0).toUpperCase() + out.slice(1) + ' only.';
}
