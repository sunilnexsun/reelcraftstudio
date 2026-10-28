import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface RevealProps {
  children: ReactNode
  className?: string
  delay?: number
  /** Vertical offset in px before reveal. */
  y?: number
  as?: 'div' | 'li' | 'article'
}

/**
 * Subtle fade-up on first view. Content is never hidden from crawlers or
 * delayed meaningfully; with prefers-reduced-motion the global
 * <MotionConfig reducedMotion="user"> drops the movement.
 */
export function Reveal({ children, className, delay = 0, y = 18, as = 'div' }: RevealProps) {
  const Tag = motion[as]
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -60px 0px' }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </Tag>
  )
}
