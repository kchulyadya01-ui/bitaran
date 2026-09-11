type P = { size?: number; color?: string; w?: number };
const base = (size = 21, color = 'currentColor', w = 1.9) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
  stroke: color, strokeWidth: w, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
});

export const Box = ({ size, color, w }: P) => (
  <svg {...base(size, color, w)}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.3 7 12 12 20.7 7" /><line x1="12" y1="22" x2="12" y2="12" /></svg>
);
export const Receipt = ({ size, color, w }: P) => (
  <svg {...base(size, color, w)}><path d="M4 2v20l2.5-1.6L9 22l3-1.6L15 22l2.5-1.6L20 22V2l-2.5 1.6L15 2l-3 1.6L9 2 6.5 3.6z" /><line x1="8" y1="9" x2="16" y2="9" /><line x1="8" y1="14" x2="13" y2="14" /></svg>
);
export const Pin = ({ size, color, w }: P) => (
  <svg {...base(size, color, w)}><path d="M21 10c0 6-9 13-9 13S3 16 3 10a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
);
export const Grid = ({ size, color, w }: P) => (
  <svg {...base(size, color, w)}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
);
export const Bars = ({ size, color, w }: P) => (
  <svg {...base(size, color, w)}><line x1="4" y1="20" x2="4" y2="12" /><line x1="10" y1="20" x2="10" y2="4" /><line x1="16" y1="20" x2="16" y2="9" /><line x1="22" y1="20" x2="22" y2="15" /></svg>
);
export const Back = ({ size, color, w }: P) => (
  <svg {...base(size, color, w ?? 2.2)}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
);
export const Plus = ({ size, color, w }: P) => (
  <svg {...base(size, color, w ?? 2.4)}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
export const Minus = ({ size, color, w }: P) => (
  <svg {...base(size, color, w ?? 2.4)}><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
export const Check = ({ size, color, w }: P) => (
  <svg {...base(size, color, w ?? 2.6)}><polyline points="20 6 9 17 4 12" /></svg>
);
export const Sync = ({ size, color, w }: P) => (
  <svg {...base(size, color, w ?? 2.2)}><path d="M21 12a9 9 0 1 1-3.5-7.1" /><polyline points="21 3 21 9 15 9" /></svg>
);
export const NoWifi = ({ size, color, w }: P) => (
  <svg {...base(size, color, w ?? 2.3)}><line x1="2" y1="2" x2="22" y2="22" /><path d="M5 12.5a10 10 0 0 1 4-2.4" /><path d="M15 10.1a10 10 0 0 1 4 2.4" /><path d="M8.5 16a5 5 0 0 1 7 0" /><line x1="12" y1="20" x2="12" y2="20" /></svg>
);
export const Search = ({ size, color, w }: P) => (
  <svg {...base(size, color, w ?? 2.1)}><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16" y2="16" /></svg>
);
export const Van = ({ size, color, w }: P) => (
  <svg {...base(size, color, w)}><rect x="1" y="6" width="14" height="11" /><path d="M15 9h4l3 3.5V17h-7z" /><circle cx="5.5" cy="18.5" r="2" /><circle cx="17.5" cy="18.5" r="2" /></svg>
);
export const Whats = ({ size, color, w }: P) => (
  <svg {...base(size, color, w ?? 2)}><path d="M21 11.5a8.4 8.4 0 0 1-12.6 7.3L3 20.5l1.8-5.2A8.4 8.4 0 1 1 21 11.5z" /></svg>
);
export const Print = ({ size, color, w }: P) => (
  <svg {...base(size, color, w ?? 2)}><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
);
export const Download = ({ size, color, w }: P) => (
  <svg {...base(size, color, w ?? 2)}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
);
export const Cash = ({ size, color, w }: P) => (
  <svg {...base(size, color, w ?? 2.1)}><rect x="2" y="6" width="20" height="13" /><circle cx="12" cy="12.5" r="2.6" /></svg>
);
export const Alert = ({ size, color, w }: P) => (
  <svg {...base(size, color, w ?? 2.2)}><circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="13" /><line x1="12" y1="16.5" x2="12" y2="16.5" /></svg>
);
export const Info = ({ size, color, w }: P) => (
  <svg {...base(size, color, w ?? 2.2)}><circle cx="12" cy="12" r="9" /><line x1="12" y1="11" x2="12" y2="16" /><line x1="12" y1="8" x2="12" y2="8" /></svg>
);
export const Note = ({ size, color, w }: P) => (
  <svg {...base(size, color, w)}><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 20.5l1.5-4.2A8.4 8.4 0 0 1 3.6 12a8.4 8.4 0 0 1 8.4-8.5h.5a8.4 8.4 0 0 1 8.5 8z" /></svg>
);
export const Menu = ({ size, color, w }: P) => (
  <svg {...base(size, color, w)}><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></svg>
);
export const Chevron = ({ size, color, w }: P) => (
  <svg {...base(size, color, w ?? 2.4)}><polyline points="9 5 16 12 9 19" /></svg>
);
export const Shop = ({ size, color, w }: P) => (
  <svg {...base(size, color, w)}><path d="M3 21V9l9-6 9 6v12" /><path d="M9 21v-7h6v7" /></svg>
);
export const Clock = ({ size, color, w }: P) => (
  <svg {...base(size, color, w ?? 2)}><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15.5 14" /></svg>
);
export const Person = ({ size, color, w }: P) => (
  <svg {...base(size, color, w)}><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></svg>
);
