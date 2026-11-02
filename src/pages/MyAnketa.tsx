import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Anketa } from '../components/Anketa'
import { Avatar } from '../components/Avatar'
import { FilesPanel } from '../components/FilesPanel'
import { copyText } from '../data/invites'
import { emptyEmployee } from '../data/seed'
import { api, linkTo, type Fayl, type FaylTuri, type MyInfo } from '../data/supabase'
import type { Employee } from '../data/types'
import { completeness, fileToDataUrl } from '../lib/util'

/** Xodim o'z shaxsiy havolasi orqali faqat o'z anketasini ko'radi va to'ldiradi. */
export function MyAnketa() {
  const { token = '' } = useParams()
  const loc = useLocation()
  const nav = useNavigate()
  const yangi = !!(loc.state as { yangi?: boolean } | null)?.yangi
  const [info, setInfo] = useState<MyInfo | null>(null)
  const [e, setE] = useState<Employee | null>(null)
  const [files, setFiles] = useState<Fayl[]>([])
  const [status, setStatus] = useState<'ok' | 'saving' | 'error'>('ok')
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const link = linkTo(`/a/${token}`)

  const loadFiles = useCallback(() => api.myFiles(token).then(setFiles).catch(() => setFiles([])), [token])
  useEffect(() => {
    let alive = true
    api.me(token).then((r) => { if (!alive) return; setInfo(r); if (r.ok) { setE(emptyEmployee(r.xodim)); void loadFiles() } })
      .catch((ex) => { if (alive) setInfo({ ok: false, xato: String(ex.message ?? ex) }) })
    return () => { alive = false }
  }, [token, loadFiles])

  if (!info) return <div className="center"><div className="spinner" /> Anketa yuklanmoqda…</div>
  if (!info.ok || !e) return <div className="login"><h1>Havola ishlamaydi</h1><p className="sub">{info.ok ? '' : info.xato}</p></div>
  const c = info.bolim_rang
  const p = completeness(e)

  const save = (fn: (x: Employee) => Employee) => {
    const prev = e
    const next = fn(prev)
    setE(next); setStatus('saving'); setErr('')
    api.save(token, next).then((r) => {
      if (!r.ok) { setE(prev); setStatus('error'); setErr(r.xato); return }
      setE(emptyEmployee(r.xodim)); setStatus('ok')
    }).catch((ex) => { setE(prev); setStatus('error'); setErr(String(ex.message ?? ex)) })
  }
  async function onPhoto(f: File | undefined) {
    if (!f) return
    try { const foto = await fileToDataUrl(f); save((x) => ({ ...x, foto })) } catch (ex) { alert(String(ex)) }
  }
  async function upload(turi: FaylTuri, idx: number, data: string) {
    const r = await api.myFileSave(token, turi, idx, data)
    if (!r.ok) throw new Error(r.xato)
    await loadFiles()
  }
  async function del(f: Fayl) {
    const r = await api.myFileDelete(token, f.id)
    if (!r.ok) throw new Error(r.xato)
    await loadFiles()
  }
  async function copy() { setCopied(await copyText(link)); setTimeout(() => setCopied(false), 2000) }
  const back = () => { if (window.history.length > 1) nav(-1); else nav('/') }

  return (
    <div style={{ ['--c' as string]: c }}>
      <div className="crumbs no-print">
        <button type="button" className="back" onClick={back}>← Orqaga</button>
        <span className="grow" />
        <span className="note">{status === 'saving' ? 'Saqlanmoqda…' : status === 'error' ? <span className="err">{err}</span> : 'Hammasi saqlangan ✓'}</span>
      </div>
      <div className={`banner${yangi ? ' strong' : ''}`}>
        <div>
          <b>Bu sizning shaxsiy havolangiz</b> — uni saqlab qo'ying (brauzerga belgilang yoki o'zingizga Telegramda yuboring). Keyin anketani shu havola orqali ochib, o'zgartirasiz.
          <div className="link-box"><code>{link}</code><button type="button" className="btn" onClick={copy}>{copied ? 'Nusxalandi ✓' : 'Nusxalash'}</button></div>
        </div>
      </div>
      <div className="hero">
        <div className="band" />
        <div className="in">
          <button type="button" className="av-btn" onClick={() => fileRef.current?.click()} title="Rasm yuklash">
            <Avatar e={e} size="lg" /><span className="av-hint">Rasm</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(ev) => { onPhoto(ev.target.files?.[0]); ev.target.value = '' }} />
          <div className="who">
            <h2>{e.shaxsiy.fish || e.ism}</h2>
            <div className="pos">{e.lavozim}{info.bolim_nomi ? ' · ' + info.bolim_nomi : ''}{info.rahbar_ism ? ` · Rahbar: ${info.rahbar_ism}` : ''}</div>
          </div>
          <div className="ring">
            <svg viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="var(--line)" strokeWidth="5" />
              <circle cx="24" cy="24" r="20" fill="none" stroke={c} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(2 * Math.PI * 20 * p) / 100} ${2 * Math.PI * 20}`} transform="rotate(-90 24 24)" />
              <text x="24" y="28" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--fg)">{p}%</text>
            </svg>
            Anketa<br />to'ldirilgan
          </div>
        </div>
        <div className="facts">
          <div className="fact"><div className="k">Qoida</div><div className="v">Har bo'limda "Tahrirlash" → to'ldiring → "Saqlash". Faqat 08 "Baholash" bo'limini rahbar/HR to'ldiradi.</div></div>
        </div>
      </div>

      <details className="sec" open>
        <summary><span className="num">📎</span><span className="tt">Pasport va qo'shimcha rasmlar</span><span className="cnt">{files.length} ta fayl</span></summary>
        <div className="qa"><FilesPanel files={files} canEdit onUpload={upload} onDelete={del} /></div>
      </details>

      <Anketa e={e} mode="self" save={save} />
    </div>
  )
}
