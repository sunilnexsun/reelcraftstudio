/** Gradient placeholder artwork (SVG data URI) — no stock photos are bundled. */
export function placeholderArt(seed: string, label = ''): string {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const hues = [350, 340, 8, 330, 15, 355]
  const a = hues[h % hues.length]
  const b = (a + 25 + (h % 30)) % 360
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${a} 85% 22%)"/><stop offset="1" stop-color="hsl(${b} 70% 8%)"/></linearGradient><radialGradient id="r" cx="${30 + (h % 40)}%" cy="35%" r="60%"><stop offset="0" stop-color="hsl(${a} 100% 60%)" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs><rect width="320" height="180" fill="url(#g)"/><rect width="320" height="180" fill="url(#r)"/><g fill="none" stroke="#fff" stroke-opacity=".08"><path d="M0 140 Q80 ${90 + (h % 40)} 160 130 T320 ${100 + (h % 50)}"/><path d="M0 160 Q90 ${110 + (h % 30)} 170 150 T320 ${130 + (h % 30)}"/></g>${label ? `<text x="16" y="164" font-family="Inter,Arial" font-size="13" font-weight="600" fill="#fff" fill-opacity=".85">${label.replace(/[<&>]/g, '')}</text>` : ''}</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
