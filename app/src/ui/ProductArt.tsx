/** Placeholder product art. Swap for real photos once the dealer supplies them. */
export function ProductArt({ id, category }: { id: string; category: string }) {
  if (id.includes('cornetto')) {
    return (
      <svg width="46" height="56" viewBox="0 0 46 56" fill="none"><path d="M23 54 L9 24 h28 z" fill="#c98b4b" /><path d="M13 33 h20 M11 28 h24" stroke="#a86f35" strokeWidth="1.3" /><circle cx="16" cy="19" r="8.5" fill="#fff6e8" /><circle cx="30" cy="19" r="8.5" fill="#fff6e8" /><circle cx="23" cy="12" r="9.5" fill="#fffdf8" /><path d="M22 4 q7 -2 9 4" stroke="#6b4226" strokeWidth="2.6" fill="none" strokeLinecap="round" /></svg>
    );
  }
  if (id.includes('chocobar') || id.includes('kulfi')) {
    return (
      <svg width="34" height="56" viewBox="0 0 34 56" fill="none"><rect x="14" y="38" width="6" height="17" rx="3" fill="#d9bd93" /><rect x="4" y="4" width="26" height="38" rx="5" fill={id.includes('kulfi') ? '#e8d3a8' : '#5a3620'} /><rect x="4" y="4" width="26" height="10" rx="5" fill={id.includes('kulfi') ? '#f2e5c9' : '#7a4c2e'} /></svg>
    );
  }
  if (id.includes('family')) {
    return (
      <svg width="52" height="48" viewBox="0 0 52 48" fill="none"><path d="M9 15 h34 l-4 29 h-26 z" fill="#f3e3cb" /><rect x="5" y="7" width="42" height="10" rx="3" fill="#e4cba4" /><rect x="14" y="24" width="24" height="3" rx="1.5" fill="#c9a97c" /><rect x="14" y="31" width="16" height="3" rx="1.5" fill="#c9a97c" /></svg>
    );
  }
  if (category === 'Noodles') {
    return (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="7" y="7" width="34" height="34" rx="4" fill="#d4762f" /><circle cx="24" cy="22" r="9.5" fill="#f7e4c8" /><path d="M18 21 q6 -5 12 0 M18 25 q6 -5 12 0" stroke="#d4762f" strokeWidth="1.7" fill="none" /><rect x="13" y="33" width="22" height="3" rx="1.5" fill="#f7e4c8" /></svg>
    );
  }
  return (
    <svg width="40" height="52" viewBox="0 0 40 52" fill="none"><path d="M6 8 h28 v34 l-4 5 h-20 l-4 -5 z" fill="#e2b33c" /><path d="M6 8 q14 6 28 0" stroke="#c99a23" strokeWidth="2.2" fill="none" /><ellipse cx="20" cy="27" rx="9" ry="6.5" fill="#fdf3dc" /></svg>
  );
}

export const ART_TINT: Record<string, string> = {
  'Ice cream': '#f7ecdc',
  Snacks: '#f6efdc',
  Noodles: '#f8e8d8',
};
