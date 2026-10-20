// Inline stroke icons (2px), per DESIGN.md. Decorative unless given a label by the parent.
import type { SVGProps } from 'react';
import { AFRICA_24, AFRICA_400 } from './africa';

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = ({ size = 18, ...rest }: P) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, ...rest,
});

// The original 4-point star, centred at (cx, cy) with radius r.
function starPath(cx: number, cy: number, r: number) {
  const k = r / 11;
  const pts = [[0, -11], [2.2, -2.2], [11, 0], [2.2, 2.2], [0, 11], [-2.2, 2.2], [-11, 0], [-2.2, -2.2]];
  return 'M' + pts.map(([x, y]) => `${(cx + x * k).toFixed(2)} ${(cy + y * k).toFixed(2)}`).join('L') + 'Z';
}
const NYOTA_STAR = starPath(18.9, 7, 2.3);

/**
 * Nyota mark (badge E1): orange Africa and a white star in a Deep Green circle.
 * Africa is scaled 0.82 and centred at (10.6, 13.1); the star sits in the empty space above the Horn.
 * `onDark` adds an off-white ring so the badge stays visible on Deep Green backgrounds.
 */
export const NyotaMark = ({ size = 28, onDark = false, ...rest }: P & { onDark?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...rest}>
    <circle cx="12" cy="12" r={onDark ? 11.4 : 12} fill="#053129" stroke={onDark ? '#F8F7F2' : 'none'} strokeWidth={onDark ? 1.2 : 0} />
    <g transform="translate(0.76 3.26) scale(0.82)">
      <path d={AFRICA_24} fill="#FD790C" />
    </g>
    <path d={NYOTA_STAR} fill="#FFFFFF" />
  </svg>
);
/** Large single-line Africa outline (brand book G2): Deep Green stroke, never filled. */
export const AfricaOutline = ({ size = 320, stroke = '#053129', strokeWidth = 7, ...rest }: P) => (
  <svg width={size} height={size} viewBox="0 0 400 400" aria-hidden="true" {...rest}>
    <path d={AFRICA_400} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />
  </svg>
);
export const Check = (p: P) => <svg {...base({ strokeWidth: 3, ...p })}><path d="M5 12l5 5L20 7" /></svg>;
export const Lock = (p: P) => <svg {...base(p)}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>;
export const Star = (p: P) => <svg {...base(p)}><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z" /></svg>;
export const Filter = (p: P) => <svg {...base(p)}><path d="M3 5h18M6 12h12M10 19h4" /></svg>;
export const Calendar = (p: P) => <svg {...base(p)}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;
export const Search = (p: P) => <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>;
export const ChevronLeft = (p: P) => <svg {...base({ strokeWidth: 2.2, ...p })}><path d="M15 18l-6-6 6-6" /></svg>;
export const FileIcon = (p: P) => <svg {...base({ strokeWidth: 1.8, ...p })}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /></svg>;
export const Menu = (p: P) => <svg {...base(p)}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
export const Close = (p: P) => <svg {...base(p)}><path d="M6 6l12 12M18 6L6 18" /></svg>;
