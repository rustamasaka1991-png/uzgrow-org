import { useEffect, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { Anketa } from '../components/Anketa'
import { Avatar } from '../components/Avatar'
import { copyText } from '../data/invites'
import { emptyEmployee } from '../data/seed'
import { api, linkTo, type MyInfo } from '../data/supabase'
import type { Employee } from '../data/types'
import { completeness, fileToDataUrl } from '../lib/util'

/** Xodim o'z shaxsiy havolasi orqali faqat o'z anketasini ko'radi va to'ldiradi. */
export function MyAnketa() {
  const { token = '' } = useParams()
  const loc = useLocation()
  const yangi = !!(loc.state as { yangi?: boolean } | null)?.yangi
  const [info, setInfo] = useState<MyInfo | null>(null)
  const [e, setE] = useState<Employee | null>(null)
  const [status, setStatus] = useState<'ok' | 'saving' | 'error'>('ok')
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const link = linkTo(`/a/${token}`)

  useEffect(() => {
    let alive = true
    api.me(token).then((r) => { if (!alive) return; setInfo(r); if (r.ok) setE(emptyEmployee(r.xodim)) })
      .catch((ex) => { if (alive) setInfo({ ok: false, xato: String(ex.message ?? ex) }) })
    return () => { alive = false }
  }, [token])

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
  async function copy() { setCopied(await copyText(link)); setTimeout(() => setCopied(false), 2000) }

  return (
    <div style={{ ['--c' as string]: c }}>
      <div className={`banner${yangi ? ' strong' : ''}`}>
        <div>
          <b>{yangi ? 'Anketangiz yaratildi. ' : ''}Bu sizning shaxsiy havolangiz</b> — uni saqlab qo'ying (brauzerga belgilang yoki o'zingizga Telegramda yuboring). Keyin anketani shu havola orqali ochib, o'zgartirasiz.
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
          <div className="fact"><div className="k">Holat</div><div className="v">{status === 'saving' ? 'Saqlanmoqda…' : status === 'error' ? <span className="err">{err}</span> : 'Hammasi saqlangan ✓'}</div></div>
          <div className="fact"><div className="k">Qoida</div><div className="v">Har bo'limda "Tahrirlash" → to'ldiring → "Saqlash". Baholash va rivojlanish rejasini rahbar/HR to'ldiradi.</div></div>
        </div>
      </div>
      <Anketa e={e} mode="self" save={save} />
    </div>
  )
}
