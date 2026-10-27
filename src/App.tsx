import { useEffect, useRef, useState } from 'react'
import { HashRouter, Link, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useYangiArizalar } from './data/arizalar'
import { AuthProvider, useAuth } from './data/auth'
import { OrgProvider, clearLocalData, useOrg } from './data/store'
import { usePwaInstall } from './lib/pwa'
import { download } from './lib/util'

/** "Ilovani o'rnatish" — Chrome/Edge o'rnatishga tayyor bo'lganda chiqadi; iPhone'da yo'riqnoma. */
function InstallButton({ className = 'btn' }: { className?: string }) {
  const { canInstall, installed, isIos, install } = usePwaInstall()
  if (installed) return null
  if (canInstall) return <button type="button" className={className} onClick={() => { void install() }} title="Kompyuter yoki telefonga ilova sifatida o'rnatish">⬇ Ilovani o'rnatish</button>
  if (isIos) return <button type="button" className={className} onClick={() => alert("iPhone: Safari'da pastdagi “Ulashish” tugmasi → “Uy ekraniga qo’shish”.")}>⬇ Ilovani o'rnatish</button>
  return null
}
import { AnketaForm } from './pages/AnketaForm'
import { ArizaView, Arizalar } from './pages/Arizalar'
import { Boshqaruv } from './pages/Boshqaruv'
import { DeptView } from './pages/DeptView'
import { Hisobot } from './pages/Hisobot'
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

/** Xodim sahifalari (anketa formasi, shaxsiy havola, kirish) — qidiruv va menyusiz sarlavha. */
function MiniHeader({ label }: { label: string }) {
  return (
    <header className="no-print">
      <div className="wrap">
        <Link className="logo" to="/">UZ-GROW<small>GREENHOUSE SOLUTIONS</small></Link>
        <span className="grow" />
        <span className="note">{label}</span>
        <InstallButton />
      </div>
    </header>
  )
}

function useSearchBox() {
  const nav = useNavigate()
  const loc = useLocation()
  const [sp] = useSearchParams()
  const [q, setQ] = useState('')
  const prev = useRef('')
  useEffect(() => { if (!loc.pathname.startsWith('/search')) setQ(''); else setQ(sp.get('q') ?? '') }, [loc.pathname, sp])
  function onSearch(v: string) {
    setQ(v)
    const t = v.trim()
    if (t) { nav(`/search?q=${encodeURIComponent(t)}`, { replace: loc.pathname.startsWith('/search') }); if (!loc.pathname.startsWith('/search')) prev.current = loc.pathname }
    else if (loc.pathname.startsWith('/search')) nav(prev.current || '/')
  }
  return { q, onSearch }
}

/** Ochiq ko'rish rejimi: faqat qidiruv, kirish tugmasi yo'q (kirish faqat /login manzilidan). */
function PublicHeader() {
  const { q, onSearch } = useSearchBox()
  const { sync, syncError } = useOrg()
  return (
    <header className="no-print">
      <div className="wrap">
        <Link className="logo" to="/">UZ-GROW<small>GREENHOUSE SOLUTIONS</small></Link>
        <div className="search">
          <input type="search" value={q} placeholder="Xodimni qidirish…" aria-label="Xodimni qidirish" onChange={(e) => onSearch(e.target.value)} />
        </div>
        <span className={`sync ${sync === 'public' ? 'online' : sync}`} title={syncError ?? ''}><i /> {sync === 'public' ? "Ko'rish rejimi" : sync === 'loading' ? 'Yuklanmoqda…' : 'Ulanish yo’q'}</span>
        <InstallButton />
      </div>
    </header>
  )
}

function AdminHeader() {
  const nav = useNavigate()
  const { q, onSearch } = useSearchBox()
  const [menu, setMenu] = useState(false)
  const [theme, setTheme] = useTheme()
  const { data, replaceAll, reset, saveError, sync, syncError, pending, retrySync } = useOrg()
  const { enabled, email, rolNomi, signOut, changePassword } = useAuth()
  const yangi = useYangiArizalar(enabled)
  const fileRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const syncLabel: Record<string, string> = {
    local: 'Faqat shu kompyuter', loading: 'Yuklanmoqda…', online: 'Supabase: ulangan', saving: 'Saqlanmoqda…',
    offline: `Oflayn — ${pending} ta o'zgarish kutmoqda`, error: 'Sinxron xatosi', public: "Ko'rish rejimi",
  }

  useEffect(() => {
    if (!menu) return
    const on = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false) }
    document.addEventListener('mousedown', on)
    return () => document.removeEventListener('mousedown', on)
  }, [menu])

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
  async function doSignOut() {
    setMenu(false)
    await signOut()
    clearLocalData()
    nav('/')
  }
  async function doChangePassword() {
    setMenu(false)
    const p1 = prompt('Yangi parol (kamida 8 ta belgi):')
    if (p1 === null) return
    const p2 = prompt('Yangi parolni qayta kiriting:')
    if (p2 === null) return
    if (p1 !== p2) { alert('Parollar mos kelmadi'); return }
    const err = await changePassword(p1)
    alert(err ?? "Parol o'zgartirildi. Keyingi kirishda yangi paroldan foydalaning.")
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
        {enabled && <Link className="btn" to="/arizalar">📋 Anketalar{yangi > 0 && <span className="badge-n">{yangi}</span>}</Link>}
        <button type="button" className={`sync ${sync}`} title={syncError ?? syncLabel[sync]} onClick={() => (sync === 'offline' || sync === 'error') && retrySync()}>
          <i /> {syncLabel[sync]}
        </button>
        <div className="menu" ref={menuRef}>
          <button type="button" className="btn" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu}>☰ Menyu</button>
          {menu && (
            <div className="dropdown" role="menu">
              {enabled && <div className="dd-note">{rolNomi}: <b>{email}</b></div>}
              <div className="dd-note">{saveError ? <span className="err">{saveError}</span> : savedTxt}</div>
              <Link role="menuitem" className="dd-link" to="/hisobot" onClick={() => setMenu(false)}>📊 Hisobot</Link>
              <Link role="menuitem" className="dd-link" to="/boshqaruv/tarix" onClick={() => setMenu(false)}>🕘 O'zgarishlar tarixi</Link>
              <Link role="menuitem" className="dd-link" to="/boshqaruv/zaxira" onClick={() => setMenu(false)}>💾 Zaxiralar</Link>
              <Link role="menuitem" className="dd-link" to="/boshqaruv/arxiv" onClick={() => setMenu(false)}>🗄 Arxiv (ishdan ketganlar)</Link>
              <div className="dd-sep" />
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
              <InstallButton className="dd-install" />
              {enabled && <button type="button" role="menuitem" onClick={doChangePassword}>🔑 Parolni o'zgartirish</button>}
              {enabled && <button type="button" role="menuitem" onClick={doSignOut}>⎋ Chiqish</button>}
            </div>
          )}
        </div>
      </div>
      {saveError && <div className="save-err wrap">{saveError}</div>}
    </header>
  )
}

function ScrollTop() {
  const loc = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [loc.pathname])
  return null
}

function Shell() {
  const loc = useLocation()
  const { enabled, session, isAdmin } = useAuth()
  const p = loc.pathname
  const miniLabel = p === '/anketa' ? 'Xodim anketasi' : p.startsWith('/a/') ? 'Mening anketam' : p === '/login' ? 'Kirish' : null
  const admin = !enabled || (!!session && isAdmin)
  return (
    <>
      <ScrollTop />
      {miniLabel ? <MiniHeader label={miniLabel} /> : admin ? <AdminHeader /> : <PublicHeader />}
      <main className="wrap">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/anketa" element={<AnketaForm />} />
          <Route path="/a/:token" element={<MyAnketa />} />
          <Route path="/arizalar" element={<Arizalar />} />
          <Route path="/arizalar/:id" element={<ArizaView />} />
          <Route path="/boshqaruv" element={<Boshqaruv />} />
          <Route path="/boshqaruv/:tab" element={<Boshqaruv />} />
          <Route path="/hisobot" element={<Hisobot />} />
          <Route path="/" element={<Overview />} />
          <Route path="/d/:id" element={<DeptView />} />
          <Route path="/x/:id" element={<Profile />} />
          <Route path="/search" element={<SearchView />} />
          <Route path="*" element={<Overview />} />
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
