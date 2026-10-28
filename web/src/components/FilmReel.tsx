import { useId } from 'react'

/** Decorative film-reel graphic (pure SVG, no image request). */
export function FilmReel({ className = '' }: { className?: string }) {
  const gid = `reel-g-${useId().replace(/:/g, '')}`
  const holes = Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI * 2) / 6 - Math.PI / 2
    return { cx: 100 + Math.cos(a) * 52, cy: 100 + Math.sin(a) * 52 }
  })
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden focusable="false">
      <defs>
        <radialGradient id={gid} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#3a3a3a" />
          <stop offset="100%" stopColor="#111" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="96" fill={`url(#${gid})`} stroke="#FF1744" strokeOpacity="0.35" strokeWidth="2" />
      <circle cx="100" cy="100" r="84" fill="none" stroke="#fff" strokeOpacity="0.08" strokeWidth="1.5" />
      {holes.map((h, i) => (
        <circle key={i} cx={h.cx} cy={h.cy} r="20" fill="#0a0a0a" stroke="#fff" strokeOpacity="0.1" />
      ))}
      <circle cx="100" cy="100" r="15" fill="#0a0a0a" stroke="#FF1744" strokeWidth="3" />
      <circle cx="100" cy="100" r="5" fill="#FF1744" />
    </svg>
  )
}
