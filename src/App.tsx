import { useEffect, useRef, useState, type ReactNode } from 'react'
import { HashRouter, Link, Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './data/auth'
import { OrgProvider, useOrg } from './data/store'
import { download } from './lib/util'
import { DeptView } from './pages/DeptView'
import { InviteFill } from './pages/InviteFill'
import { Login } from './pages/Login'
import { MyAnketa } from './pages/MyAnketa'
import { Overview } from './pages/Overview'
import { Profile } from './pages/Profile'
import { SearchView } from './pages/SearchView'

type Theme = 'auto' | 'light' | 'dark'
const THEME_KEY = 'uzgrow-org:theme'

function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => { try { return (localStorage.getItem(THEME_KEY) as Theme) || 'auto' } catch { return 'auto' } })
  useEffect(() => {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem(THEME_KEY, theme) } catch { /* ignore */ }
  }, [theme])
  return [theme, setTheme] as const
}

/** Xodim sahifalari (havola orqali) — qidiruv va menyusiz sarlavha. */
function MiniHeader() {
  return (
    <header className="no-print">
      <div className="wrap">
        <span className="logo">UZ-GROW<small>GREENHOUSE SOLUTIONS</small></span>
        <span className="grow" />
        <span className="note">Xodim anketasi</span>
      </div>
    </header>
  )
}

function Header() {
  const nav = useNavigate()
  const loc = useLocation()
  const [sp] = useSearchParams()
  const [q, setQ] = useState('')
  const [menu, setMenu] = useState(false)
  const [theme, setTheme] = useTheme()
  const { data, replaceAll, reset, saveError, sync, syncError, pending, retrySync } = useOrg()
  const { enabled, email, signOut } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const prev = useRef('')
  const syncLabel: Record<typeof sync, string> = {
    local: 'Faqat shu kompyuter', loading: 'Yuklanmoqda…', online: 'Supabase: ulangan', saving: 'Saqlanmoqda…',
    offline: `Oflayn — ${pending} ta o'zgarish kutmoqda`, error: 'Sinxron xatosi',
  }

  useEffect(() => { if (!loc.pathname.startsWith('/search')) setQ(''); else setQ(sp.get('q') ?? '') }, [loc.pathname, sp])
  useEffect(() => {
    if (!menu) return
    const on = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false) }
    document.addEventListener('mousedown', on)
    return () => document.removeEventListener('mousedown', on)
  }, [menu])

  function onSearch(v: string) {
    setQ(v)
    const t = v.trim()
    if (t) { nav(`/search?q=${encodeURIComponent(t)}`, { replace: loc.pathname.startsWith('/search') }); if (!loc.pathname.startsWith('/search')) prev.current = loc.pathname }
    else if (loc.pathname.startsWith('/search')) nav(prev.current || '/')
  }
  function exportJson() {
    const d = new Date().toISOString().slice(0, 10)
    download(`uzgrow-org-${d}.json`, JSON.stringify(data, null, 2))
    setMenu(false)
  }
  async function importJson(f: File | undefined) {
    if (!f) return
    try {
      const raw = JSON.parse(await f.text())
      if (!raw || !Array.isArray(raw.xodimlar)) throw new Error("Fayl formati noto'g'ri")
      if (confirm(`Import: ${raw.xodimlar.length} xodim, ${raw.bolimlar?.length ?? 0} bo'lim. Hozirgi ma'lumotlar almashtiriladi. Davom etilsinmi?`)) { replaceAll(raw); nav('/') }
    } catch (e) { alert('Import xatosi: ' + String(e)) }
    setMenu(false)
  }
  function doReset() {
    if (confirm("Barcha o'zgarishlar o'chib, boshlang'ich ma'lumotlar qaytariladi. Davom etilsinmi?")) { reset(); nav('/') }
    setMenu(false)
  }
  const saved = new Date(data.updatedAt)
  const savedTxt = saved.getTime() > 86400000 ? `Saqlangan: ${saved.toLocaleDateString('uz')} ${saved.toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' })}` : "Boshlang'ich ma'lumotlar"

  return (
    <header className="no-print">
      <div className="wrap">
        <Link className="logo" to="/">UZ-GROW<small>GREENHOUSE SOLUTIONS</small></Link>
        <div className="search">
          <input type="search" value={q} placeholder="Xodimni qidirish…" aria-label="Xodimni qidirish" onChange={(e) => onSearch(e.target.value)} />
        </div>
        <button type="button" className={`sync ${sync}`} title={syncError ?? syncLabel[sync]} onClick={() => (sync === 'offline' || sync === 'error') && retrySync()}>
          <i /> {syncLabel[sync]}
        </button>
        <div className="menu" ref={menuRef}>
          <button type="button" className="btn" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu}>☰ Menyu</button>
          {menu && (
            <div className="dropdown" role="menu">
              {enabled && <div className="dd-note">HR: <b>{email}</b></div>}
              <div className="dd-note">{saveError ? <span className="err">{saveError}</span> : savedTxt}</div>
              <button type="button" role="menuitem" onClick={exportJson}>⬇ JSON eksport (zaxira)</button>
              <button type="button" role="menuitem" onClick={() => fileRef.current?.click()}>⬆ JSON import</button>
              <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { importJson(e.target.files?.[0]); e.target.value = '' }} />
              <div className="dd-sep" />
              <div className="dd-note">Mavzu</div>
              <div className="seg">
                {(['auto', 'light', 'dark'] as Theme[]).map((t) => (
                  <button type="button" key={t} className={theme === t ? 'on' : ''} onClick={() => setTheme(t)}>{t === 'auto' ? 'Avto' : t === 'light' ? 'Yorug’' : 'Qorong’i'}</button>
                ))}
              </div>
              <div className="dd-sep" />
              <button type="button" role="menuitem" className="danger" onClick={doReset}>↺ Boshlang'ich holatga qaytarish</button>
              {enabled && <button type="button" role="menuitem" onClick={() => { setMenu(false); void signOut() }}>⎋ Chiqish</button>}
            </div>
          )}
        </div>
      </div>
      {saveError && <div className="save-err wrap">{saveError}</div>}
    </header>
  )
}

/** Admin (HR) sahifalari: Supabase bo'lsa faqat ruxsat ro'yxatidagi kirgan foydalanuvchi. */
function AdminGate({ children }: { children: ReactNode }) {
  const { enabled, loading, session, isAdmin } = useAuth()
  if (!enabled) return <>{children}</>
  if (loading) return <div className="center"><div className="spinner" /> Yuklanmoqda…</div>
  if (!session || !isAdmin) return <Navigate to="/login" replace />
  return <>{children}</>
}

function ScrollTop() {
  const loc = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [loc.pathname])
  return null
}

function Shell() {
  const loc = useLocation()
  const { enabled, session, isAdmin } = useAuth()
  const publicPage = loc.pathname.startsWith('/a/') || loc.pathname.startsWith('/h/') || loc.pathname === '/login'
  const showAdminHeader = !publicPage && (!enabled || (session && isAdmin))
  return (
    <>
      <ScrollTop />
      {showAdminHeader ? <Header /> : <MiniHeader />}
      <main className="wrap">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/h/:token" element={<InviteFill />} />
          <Route path="/a/:token" element={<MyAnketa />} />
          <Route path="/" element={<AdminGate><Overview /></AdminGate>} />
          <Route path="/d/:id" element={<AdminGate><DeptView /></AdminGate>} />
          <Route path="/x/:id" element={<AdminGate><Profile /></AdminGate>} />
          <Route path="/search" element={<AdminGate><SearchView /></AdminGate>} />
          <Route path="*" element={<AdminGate><Overview /></AdminGate>} />
        </Routes>
      </main>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <OrgProvider>
        <HashRouter>
          <Shell />
        </HashRouter>
      </OrgProvider>
    </AuthProvider>
  )
}
