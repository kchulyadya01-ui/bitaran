/** Placeholder product art, inferred from the item name. Swap for real photos later. */
export function ProductArt({ name }: { name: string }) {
  const n = name.toLowerCase();

  if (n.includes('cone')) {
    return (
      <svg width="46" height="56" viewBox="0 0 46 56" fill="none"><path d="M23 54 L9 24 h28 z" fill="#c98b4b" /><path d="M13 33 h20 M11 28 h24" stroke="#a86f35" strokeWidth="1.3" /><circle cx="16" cy="19" r="8.5" fill="#fff6e8" /><circle cx="30" cy="19" r="8.5" fill="#fff6e8" /><circle cx="23" cy="12" r="9.5" fill="#fffdf8" /><path d="M22 4 q7 -2 9 4" stroke="#6b4226" strokeWidth="2.6" fill="none" strokeLinecap="round" /></svg>
    );
  }
  if (n.includes('bar') || n.includes('kulfi') || n.includes('dolly') || n.includes('stick')) {
    const body = n.includes('choco') ? '#5a3620' : n.includes('mango') || n.includes('dolly') ? '#e0a32c' : '#e8d3a8';
    const top = n.includes('choco') ? '#7a4c2e' : n.includes('mango') || n.includes('dolly') ? '#efc061' : '#f2e5c9';
    return (
      <svg width="34" height="56" viewBox="0 0 34 56" fill="none"><rect x="14" y="38" width="6" height="17" rx="3" fill="#d9bd93" /><rect x="4" y="4" width="26" height="38" rx="5" fill={body} /><rect x="4" y="4" width="26" height="10" rx="5" fill={top} /></svg>
    );
  }
  if (n.includes('family') || n.includes('1l') || n.includes('pack')) {
    return (
      <svg width="52" height="48" viewBox="0 0 52 48" fill="none"><path d="M9 15 h34 l-4 29 h-26 z" fill="#f3e3cb" /><rect x="5" y="7" width="42" height="10" rx="3" fill="#e4cba4" /><rect x="14" y="24" width="24" height="3" rx="1.5" fill="#c9a97c" /><rect x="14" y="31" width="16" height="3" rx="1.5" fill="#c9a97c" /></svg>
    );
  }
  if (n.includes('cup')) {
    return (
      <svg width="44" height="50" viewBox="0 0 44 50" fill="none"><path d="M10 16 h24 l-3 30 h-18 z" fill="#f3e3cb" /><ellipse cx="22" cy="16" rx="12" ry="5" fill="#fffdf8" /><path d="M14 13 q8 -6 16 0" stroke="#e0cfae" strokeWidth="1.6" fill="none" /></svg>
    );
  }
  if (n.includes('noodle')) {
    return (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="7" y="7" width="34" height="34" rx="4" fill="#d4762f" /><circle cx="24" cy="22" r="9.5" fill="#f7e4c8" /><path d="M18 21 q6 -5 12 0 M18 25 q6 -5 12 0" stroke="#d4762f" strokeWidth="1.7" fill="none" /><rect x="13" y="33" width="22" height="3" rx="1.5" fill="#f7e4c8" /></svg>
    );
  }
  return (
    <svg width="40" height="52" viewBox="0 0 40 52" fill="none"><path d="M6 8 h28 v34 l-4 5 h-20 l-4 -5 z" fill="#e2b33c" /><path d="M6 8 q14 6 28 0" stroke="#c99a23" strokeWidth="2.2" fill="none" /><ellipse cx="20" cy="27" rx="9" ry="6.5" fill="#fdf3dc" /></svg>
  );
}

const TINTS = ['#dcf1e4', '#ffe6d2', '#fff2c2', '#ffdada', '#dbeaff'];

/** Stable tint per segment, so each company's shelf reads as its own. */
export function tintFor(segmentId: string) {
  let h = 0;
  for (let i = 0; i < segmentId.length; i += 1) h = (h * 31 + segmentId.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}
