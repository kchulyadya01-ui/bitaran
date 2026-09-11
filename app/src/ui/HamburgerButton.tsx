import { Menu } from './icons';

/** The one way into MoreMenu, kept identical on every dock so it's always in the same spot. */
export default function HamburgerButton({ onClick, dark = false }: { onClick: () => void; dark?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label="Menu"
      style={{
        width: 34, height: 34, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: dark ? 'rgba(255,255,255,0.12)' : 'var(--paper)',
        border: dark ? 'none' : '1px solid var(--line)',
        borderRadius: 999,
      }}
    >
      <Menu size={17} color={dark ? '#fff' : 'var(--ink)'} />
    </button>
  );
}
