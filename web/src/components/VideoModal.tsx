import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Film, X } from 'lucide-react'
import { parseVideoUrl } from '../lib/video'

export interface ModalMedia {
  title: string
  subtitle?: string
  description?: string
  videoUrl?: string
  poster?: string
  isSample?: boolean
  /** 'portrait' renders a 9:16 player sized to the screen height. */
  orientation?: 'portrait' | 'landscape'
}

interface VideoModalProps {
  media: ModalMedia | null
  onClose: () => void
}

/**
 * Accessible lightbox: role="dialog", focus moves to the close button,
 * Tab is trapped inside, Escape / backdrop / close button all dismiss,
 * focus returns to the trigger, and the video is only mounted while open.
 */
export function VideoModal({ media, onClose }: VideoModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!media) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), iframe, video, [tabindex]:not([tabindex="-1"])',
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      previouslyFocused?.focus?.()
    }
  }, [media, onClose])

  const video = parseVideoUrl(media?.videoUrl)
  const portrait = media?.orientation === 'portrait'

  return (
    <AnimatePresence>
      {media && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={onClose} aria-hidden />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="video-modal-title"
            className={`relative w-full ${portrait ? 'max-w-[min(440px,calc((100svh-260px)*9/16+2px))]' : 'max-w-4xl'} overflow-hidden rounded-[var(--radius-card)] border border-white/10 bg-charcoal shadow-2xl`}
            initial={{ scale: 0.97, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.97, y: 12 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div className="min-w-0">
                <h2 id="video-modal-title" className="truncate font-display text-lg font-bold text-white">
                  {media.title}
                  {media.isSample && (
                    <span className="ml-2 align-middle rounded bg-white/10 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-widest text-white/70">
                      Sample
                    </span>
                  )}
                </h2>
                {media.subtitle && <p className="text-sm text-brand">{media.subtitle}</p>}
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close video"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-brand"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className={`${portrait ? 'aspect-[9/16]' : 'aspect-video'} w-full bg-black`}>
              {video?.kind === 'youtube' || video?.kind === 'vimeo' ? (
                <iframe
                  src={video.embed}
                  title={media.title}
                  className="h-full w-full"
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              ) : video?.kind === 'file' ? (
                <video src={video.src} poster={media.poster} controls autoPlay playsInline preload="metadata" className="h-full w-full object-contain">
                  Your browser does not support HTML5 video.
                </video>
              ) : (
                <div className="grid h-full w-full place-items-center bg-[radial-gradient(70%_70%_at_50%_40%,rgb(255_23_68/0.22),transparent_70%)] p-6 text-center">
                  <div className="max-w-md">
                    <Film className="mx-auto mb-4 h-12 w-12 text-brand" strokeWidth={1.4} aria-hidden />
                    <p className="font-display text-lg font-bold text-white">Video coming soon</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      This preview will play once the studio adds the final video.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {media.description && (
              <p className="px-5 py-4 text-sm leading-relaxed text-muted">{media.description}</p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
