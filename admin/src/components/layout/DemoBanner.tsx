import { Link } from 'react-router-dom'
import { FlaskConical } from 'lucide-react'
import { useAuth } from '@/lib/auth'

export function DemoBanner() {
  const { mode } = useAuth()
  if (mode !== 'demo') return null
  return (
    <div role="note" className="no-print flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-amber-400/20 bg-amber-400/[0.07] px-4 py-2 text-xs text-amber-200 sm:px-6 lg:px-8">
      <FlaskConical className="size-4 shrink-0" aria-hidden />
      <span><strong className="font-semibold">Demo mode</strong> — all figures and people are sample data stored only in this browser.</span>
      <Link to="/settings?tab=data" className="font-semibold underline underline-offset-2 hover:text-white">Connect Supabase to go live</Link>
    </div>
  )
}
