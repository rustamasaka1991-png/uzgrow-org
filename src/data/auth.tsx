import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

type AuthCtx = {
  /** null — Supabase yo'q (lokal rejim, hamma narsa ochiq) */
  enabled: boolean
  loading: boolean
  session: Session | null
  isAdmin: boolean
  email: string | null
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(!!supabase)

  useEffect(() => {
    if (!supabase) return
    const sb = supabase
    let alive = true
    const check = async (s: Session | null) => {
      setSession(s)
      if (!s) { setIsAdmin(false); setLoading(false); return }
      const { data, error } = await sb.rpc('is_admin')
      if (!alive) return
      setIsAdmin(!error && data === true)
      setLoading(false)
    }
    sb.auth.getSession().then(({ data }) => { void check(data.session) })
    const { data: sub } = sb.auth.onAuthStateChange((_ev, s) => { void check(s) })
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return 'Supabase sozlanmagan'
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    return error ? xato(error.message) : null
  }, [])
  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return 'Supabase sozlanmagan'
    const { data, error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password })
    if (error) return xato(error.message)
    if (data.user && !data.session) return 'Ro’yxatdan o’tdingiz. Emailingizga tasdiqlash xati yuborildi — xatdagi havolani bosib, keyin kiring.'
    return null
  }, [])
  const signOut = useCallback(async () => { await supabase?.auth.signOut() }, [])

  const value = useMemo<AuthCtx>(() => ({
    enabled: !!supabase, loading, session, isAdmin: supabase ? isAdmin : true, email: session?.user.email ?? null, signIn, signUp, signOut,
  }), [loading, session, isAdmin, signIn, signUp, signOut])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

function xato(m: string) {
  if (/Invalid login credentials/i.test(m)) return 'Email yoki parol noto’g’ri'
  if (/Email not confirmed/i.test(m)) return 'Email hali tasdiqlanmagan — pochtangizdagi havolani bosing'
  if (/already registered/i.test(m)) return 'Bu email allaqachon ro’yxatdan o’tgan'
  if (/Password should be/i.test(m)) return 'Parol kamida 6 ta belgi bo’lsin'
  if (/rate limit/i.test(m)) return 'Juda ko’p urinish — biroz kuting'
  return m
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('AuthProvider yo’q')
  return c
}
