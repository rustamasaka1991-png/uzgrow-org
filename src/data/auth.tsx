import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

type AuthCtx = {
  /** null — Supabase yo'q (lokal rejim, hamma narsa ochiq) */
  enabled: boolean
  loading: boolean
  session: Session | null
  isAdmin: boolean
  /** 'hr' | 'rahbar' — adminlar jadvalidagi rol */
  rol: string | null
  rolNomi: string
  email: string | null
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  changePassword: (password: string) => Promise<string | null>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [rol, setRol] = useState<{ rol: string | null; nomi: string }>({ rol: null, nomi: '' })
  const [loading, setLoading] = useState(!!supabase)

  useEffect(() => {
    if (!supabase) return
    const sb = supabase
    let alive = true
    const check = async (s: Session | null) => {
      setSession(s)
      if (!s) { setIsAdmin(false); setRol({ rol: null, nomi: '' }); setLoading(false); return }
      const { data, error } = await sb.rpc('mening_rolim')
      if (!alive) return
      const r = (!error && data && typeof data === 'object' ? data : { rol: null }) as { rol: string | null; nomi?: string }
      setIsAdmin(!!r.rol)
      setRol({ rol: r.rol, nomi: r.nomi ?? '' })
      setLoading(false)
    }
    sb.auth.getSession().then(({ data }) => { void check(data.session) })
    const { data: sub } = sb.auth.onAuthStateChange((_ev, s) => { void check(s) })
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [])

  // 4 soat harakatsizlikdan keyin avtomatik chiqish (umumiy kompyuterlar uchun)
  useEffect(() => {
    if (!supabase || !session) return
    const sb = supabase
    const IDLE = 4 * 60 * 60 * 1000
    let last = Date.now()
    const touch = () => { last = Date.now() }
    const evs: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll']
    evs.forEach((ev) => window.addEventListener(ev, touch, { passive: true }))
    const timer = window.setInterval(() => { if (Date.now() - last > IDLE) { void sb.auth.signOut(); try { localStorage.removeItem('uzgrow-org:v1'); localStorage.removeItem('uzgrow-org:queue') } catch { /* ignore */ } } }, 60000)
    return () => { evs.forEach((ev) => window.removeEventListener(ev, touch)); window.clearInterval(timer) }
  }, [session])

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
  const changePassword = useCallback(async (password: string) => {
    if (!supabase) return 'Supabase sozlanmagan'
    if (password.length < 8) return 'Parol kamida 8 ta belgi bo’lsin'
    const { error } = await supabase.auth.updateUser({ password })
    return error ? xato(error.message) : null
  }, [])

  const value = useMemo<AuthCtx>(() => ({
    enabled: !!supabase, loading, session, isAdmin: supabase ? isAdmin : true,
    rol: supabase ? rol.rol : 'hr', rolNomi: supabase ? (rol.nomi || (rol.rol === 'rahbar' ? 'Rahbar' : rol.rol === 'hr' ? 'HR' : '')) : 'Lokal',
    email: session?.user.email ?? null, signIn, signUp, signOut, changePassword,
  }), [loading, session, isAdmin, rol, signIn, signUp, signOut, changePassword])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

function xato(m: string) {
  if (/Invalid login credentials/i.test(m)) return 'Email yoki parol noto’g’ri'
  if (/Database error saving new user|admin ro.yxatida yo.q/i.test(m)) return 'Ro’yxatdan o’tish yopiq: bu email admin ro’yxatida yo’q'
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
