import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Dialog } from './dialog'
import { Button } from './button'

interface ConfirmOptions { title: string; description?: ReactNode; confirmLabel?: string; danger?: boolean }
type ConfirmFn = (o: ConfirmOptions) => Promise<boolean>
const Ctx = createContext<ConfirmFn | null>(null)

/** `const confirm = useConfirm(); if (await confirm({ title: 'Delete?' })) …` */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<(v: boolean) => void>(undefined)
  const confirm = useCallback<ConfirmFn>((o) => new Promise((res) => { resolver.current = res; setOpts(o) }), [])
  const done = (v: boolean) => { resolver.current?.(v); resolver.current = undefined; setOpts(null) }
  return (
    <Ctx.Provider value={confirm}>
      {children}
      <Dialog
        open={!!opts}
        onClose={() => done(false)}
        size="sm"
        title={<span className="flex items-center gap-2">{opts?.danger !== false && <AlertTriangle className="size-5 text-danger" />}{opts?.title}</span>}
        footer={<>
          <Button variant="ghost" onClick={() => done(false)}>Cancel</Button>
          <Button variant={opts?.danger === false ? 'primary' : 'danger'} onClick={() => done(true)} autoFocus>{opts?.confirmLabel ?? 'Delete'}</Button>
        </>}
      >
        <div className="text-sm text-muted">{opts?.description ?? 'This cannot be undone.'}</div>
      </Dialog>
    </Ctx.Provider>
  )
}
export function useConfirm() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useConfirm needs ConfirmProvider')
  return c
}
