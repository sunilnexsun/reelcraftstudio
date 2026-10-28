import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export interface PageMeta { title?: ReactNode; subtitle?: ReactNode; crumbs?: { label: string; to?: string }[]; showDateRange?: boolean }
const Ctx = createContext<{ meta: PageMeta; setMeta: (m: PageMeta) => void } | null>(null)

export function PageMetaProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<PageMeta>({})
  return <Ctx.Provider value={{ meta, setMeta }}>{children}</Ctx.Provider>
}
export function usePageMetaState() { return useContext(Ctx)!.meta }

/** Pages call this to set the header title, subtitle and breadcrumbs shown in the top bar. */
export function usePageHeader(meta: PageMeta, deps: unknown[] = []) {
  const ctx = useContext(Ctx)!
  useEffect(() => {
    ctx.setMeta(meta)
    return () => ctx.setMeta({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
