import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'outline' | 'outlineDark' | 'whatsapp' | 'ghost'
type Size = 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-[10px] font-display font-bold tracking-wide ' +
  'transition-[background-color,color,border-color,transform,box-shadow] duration-200 ' +
  'active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 select-none'

const sizes: Record<Size, string> = {
  md: 'min-h-11 px-5 text-[0.82rem]',
  lg: 'min-h-13 px-7 text-[0.9rem]',
}

const variants: Record<Variant, string> = {
  primary:
    'bg-brand text-white hover:bg-brand-deep shadow-[0_10px_28px_-12px_rgb(255_23_68/0.7)]',
  outline: 'border-2 border-white/85 text-white hover:bg-white hover:text-ink',
  outlineDark: 'border-2 border-brand text-brand hover:bg-brand hover:text-white',
  whatsapp: 'bg-[#1FAF54] text-white hover:bg-[#178f44]',
  ghost: 'text-white/80 hover:text-white',
}

interface Common {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  iconRight?: ReactNode
  children: ReactNode
  className?: string
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra = '') {
  return `${base} ${sizes[size]} ${variants[variant]} ${extra}`
}

export function ButtonLink({
  variant, size, icon, iconRight, children, className = '', ...rest
}: Common & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      <span>{children}</span>
      {iconRight}
    </a>
  )
}

export function Button({
  variant, size, icon, iconRight, children, className = '', type = 'button', ...rest
}: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      <span>{children}</span>
      {iconRight}
    </button>
  )
}
