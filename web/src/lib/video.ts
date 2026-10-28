export type ParsedVideo =
  | { kind: 'youtube'; embed: string }
  | { kind: 'vimeo'; embed: string }
  | { kind: 'file'; src: string }
  | null

/** Turns a YouTube/Vimeo/file URL into something the modal can play. */
export function parseVideoUrl(url?: string): ParsedVideo {
  if (!url) return null
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
  if (yt) return { kind: 'youtube', embed: `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&rel=0` }
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeo) return { kind: 'vimeo', embed: `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1` }
  if (/\.(mp4|webm|mov)(\?.*)?$/i.test(url)) return { kind: 'file', src: url }
  return null
}
