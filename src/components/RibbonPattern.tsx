// Ribbon line pattern (brand book G1): thin looping lines that cross and overlap,
// echoing the ribbon map in the club logo. Always subtle and behind the content.

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

/** One looping line drawn left to right; stepping back on x makes the curve loop over itself. */
function ribbon(seed: number, w: number, h: number) {
  const r = rng(seed);
  let x = -80;
  let y = h * (0.15 + r() * 0.7);
  let d = `M ${x} ${y.toFixed(0)}`;
  while (x < w + 80) {
    const nx = x + 120 + r() * 140;
    const ny = Math.max(20, Math.min(h - 20, y + (r() - 0.5) * h * 0.7));
    const loop = r() > 0.45 ? 1 : 0; // control points behind the end point draw a loop
    const c1x = x + (loop ? 220 : 70);
    const c2x = nx - (loop ? 240 : 70);
    d += ` C ${c1x.toFixed(0)} ${(y + (r() - 0.5) * 220).toFixed(0)}, ${c2x.toFixed(0)} ${(ny + (r() - 0.5) * 220).toFixed(0)}, ${nx.toFixed(0)} ${ny.toFixed(0)}`;
    x = nx;
    y = ny;
  }
  return d;
}

export function RibbonPattern({ className = '', lines = 7, seed = 7 }: { className?: string; lines?: number; seed?: number }) {
  const w = 1440;
  const h = 800;
  return (
    <svg aria-hidden="true" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice">
      {Array.from({ length: lines }, (_, i) => (
        <path key={i} d={ribbon(seed * 31 + i * 97, w, h)} fill="none" stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}
