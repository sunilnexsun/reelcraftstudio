import type { ReactNode } from 'react'
import { Reveal } from './Reveal'

interface SectionHeadingProps {
  id?: string
  eyebrow: string
  /** First line (inherits text colour). */
  line1: string
  /** Second line, rendered in brand red. */
  line2: string
  tone?: 'light' | 'dark'
  align?: 'left' | 'center'
  children?: ReactNode
}

export function SectionHeading({ id, eyebrow, line1, line2, tone = 'light', align = 'left', children }: SectionHeadingProps) {
  return (
    <Reveal className={align === 'center' ? 'text-center' : ''}>
      <p className="eyebrow mb-3">{eyebrow}</p>
      <h2 id={id} className={`heading-lg ${tone === 'dark' ? 'text-white' : 'text-ink'}`}>
        <span className="block">{line1}</span>
        <span className="block text-brand">{line2}</span>
      </h2>
      {children}
    </Reveal>
  )
}
