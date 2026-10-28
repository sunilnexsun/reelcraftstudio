import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AppRole, Profile } from '@/types/db'
import { DATA_MODE, demo as demoSource, liveMisconfigured } from '@/lib/data'
import { getSupabase } from '@/lib/data/supabase'
import { friendlyError } from '@/lib/data/errors'
import { resetCache } from '@/hooks/useData'

type Status = 'loading' | 'signed_out' | 'pending' | 'ready'

interface AuthState {
  status: Status
  mode: 'demo' | 'live'
  profile: Profile | null
  role: AppRole | null
  teamMemberId: string | null
  signIn: (email: string, password: string) => Promise<void>
  signInDemo: (role: AppRole) => void
  signOut: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)
const DEMO_ROLE_KEY = 'reelcraft-demo-role'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [teamMemberId, setTeamMemberId] = useState<string | null>(null)

  // ───── demo mode ─────
  const enterDemo = useCallback((role: AppRole | null) => {
    const demo = demoSource
    if (!demo) return
    const p = role ? demo.profiles().find((x) => x.role === role && x.is_active) ?? null : null
    if (!p) {
      demo.setActor({ profileId: '', role: null, teamMemberId: null })
      setProfile(null); setTeamMemberId(null); setStatus('signed_out')
      resetCache()
      return
    }
    demo.setActor({ profileId: p.id, role: p.role, teamMemberId: null })
    void demo.list('team_members').then((tm) => {
      const id = tm.find((t) => t.profile_id === p.id)?.id ?? null
      demo.setActor({ profileId: p.id, role: p.role, teamMemberId: id })
      setTeamMemberId(id)
    })
    setProfile(p)
    setStatus('ready')
    resetCache()
  }, [])

  // ───── live mode ─────
  const loadProfile = useCallback(async (userId: string | null) => {
    if (!userId) { setProfile(null); setTeamMemberId(null); setStatus('signed_out'); resetCache(); return }
    const sb = getSupabase()
    const { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (error || !data) { setProfile(null); setStatus('pending'); return }
    const p = data as Profile
    setProfile(p)
    if (!p.is_active || !p.role) { setStatus('pending'); return }
    const tm = await sb.from('team_members').select('id').eq('profile_id', userId).maybeSingle()
    setTeamMemberId((tm.data as { id: string } | null)?.id ?? null)
    setStatus('ready')
    resetCache()
  }, [])

  useEffect(() => {
    if (DATA_MODE === 'demo') {
      let saved: AppRole | null = null
      try { saved = sessionStorage.getItem(DEMO_ROLE_KEY) as AppRole | null } catch { /* storage blocked */ }
      enterDemo(saved)
      return
    }
    if (liveMisconfigured) { setStatus('signed_out'); return }
    const sb = getSupabase()
    let active = true
    sb.auth.getSession().then(({ data }) => { if (active) void loadProfile(data.session?.user.id ?? null) })
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        // defer: supabase-js warns against awaiting other calls inside this callback
        setTimeout(() => { if (active) void loadProfile(session?.user.id ?? null) }, 0)
      }
    })
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [enterDemo, loadProfile])

  const value = useMemo<AuthState>(() => ({
    status,
    mode: DATA_MODE,
    profile,
    role: profile?.is_active ? profile.role : null,
    teamMemberId,
    async signIn(email, password) {
      const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw friendlyError({ message: /invalid/i.test(error.message) ? 'Incorrect email or password.' : error.message })
    },
    signInDemo(role) {
      try { sessionStorage.setItem(DEMO_ROLE_KEY, role) } catch { /* ignore */ }
      enterDemo(role)
    },
    async signOut() {
      if (DATA_MODE === 'demo') {
        try { sessionStorage.removeItem(DEMO_ROLE_KEY) } catch { /* ignore */ }
        enterDemo(null)
        return
      }
      await getSupabase().auth.signOut()
    },
    async requestPasswordReset(email) {
      const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/update-password` })
      if (error) throw friendlyError(error)
    },
    async updatePassword(password) {
      const { error } = await getSupabase().auth.updateUser({ password })
      if (error) throw friendlyError(error)
    },
    async refreshProfile() {
      if (DATA_MODE === 'demo') { enterDemo(profile?.role ?? null); return }
      const { data } = await getSupabase().auth.getUser()
      await loadProfile(data.user?.id ?? null)
    },
  }), [status, profile, teamMemberId, enterDemo, loadProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
