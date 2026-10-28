import { createContext, useContext, useState, type ReactNode } from 'react'

export type QuickKind = 'project' | 'enquiry' | 'booking' | 'client' | 'expense' | null
interface Ctx { open: QuickKind; setOpen: (k: QuickKind) => void }
const QuickCreateContext = createContext<Ctx | null>(null)

export function QuickCreateProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<QuickKind>(null)
  return <QuickCreateContext.Provider value={{ open, setOpen }}>{children}</QuickCreateContext.Provider>
}
export function useQuickCreate() {
  const c = useContext(QuickCreateContext)
  if (!c) throw new Error('useQuickCreate needs QuickCreateProvider')
  return c
}
