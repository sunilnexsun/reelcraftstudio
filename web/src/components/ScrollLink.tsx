import type { AnchorHTMLAttributes } from 'react'
import { scrollToAnchor } from '../lib/router'

/** Jump to a section on the current page without changing the route. */
export function ScrollLink({ to, onClick, ...rest }: { to: string } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      href={`#${to}`}
      onClick={(e) => {
        onClick?.(e)
        e.preventDefault()
        scrollToAnchor(to)
      }}
      {...rest}
    />
  )
}
