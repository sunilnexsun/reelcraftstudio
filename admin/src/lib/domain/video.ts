export type VideoInfo = { provider: 'youtube' | 'vimeo' | 'other'; id: string | null; embedUrl: string | null; thumbnailUrl: string | null }

export function parseVideoUrl(raw: string | null | undefined): VideoInfo | null {
  if (!raw) return null
  let u: URL
  try { u = new URL(raw.trim()) } catch { return null }
  if (u.protocol !== 'https:') return null
  const host = u.hostname.replace(/^www\.|^m\./, '')
  if (host === 'youtu.be' || host.endsWith('youtube.com') || host === 'youtube-nocookie.com') {
    let id: string | null = null
    if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0]
    else if (u.pathname === '/watch') id = u.searchParams.get('v')
    else {
      const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{6,})/)
      id = m?.[1] ?? null
    }
    if (id && /^[\w-]{6,20}$/.test(id)) {
      return { provider: 'youtube', id, embedUrl: `https://www.youtube-nocookie.com/embed/${id}`, thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` }
    }
    return null
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const m = u.pathname.match(/(?:\/video)?\/(\d{6,12})/)
    if (m) return { provider: 'vimeo', id: m[1], embedUrl: `https://player.vimeo.com/video/${m[1]}`, thumbnailUrl: null }
    return null
  }
  return { provider: 'other', id: null, embedUrl: null, thumbnailUrl: null }
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function parseDuration(input: string): number | null {
  const t = input.trim()
  if (!t) return null
  if (/^\d+$/.test(t)) return Number(t)
  const m = t.match(/^(\d+):([0-5]\d)$/)
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN
}
