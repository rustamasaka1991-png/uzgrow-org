import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { api, type InviteInfo } from '../data/supabase'
import { fileToDataUrl, slug } from '../lib/util'

/** Yangi xodim HR bergan taklif havolasi orqali o'zini ro'yxatdan o'tkazadi. */
export function InviteFill() {
  const { token = '' } = useParams()
  const nav = useNavigate()
  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [ism, setIsm] = useState('')
  const [telefon, setTelefon] = useState('')
  const [foto, setFoto] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    api.inviteInfo(token).then((r) => { if (alive) setInfo(r) }).catch((e) => { if (alive) setInfo({ ok: false, xato: String(e.message ?? e) }) })
    return () => { alive = false }
  }, [token])

  if (!info) return <div className="center"><div className="spinner" /> Havola tekshirilmoqda…</div>
  if (!info.ok) return <div className="login"><h1>Havola ishlamaydi</h1><p className="sub">{info.xato}</p></div>
  if (info.used) {
    return (
      <div className="login">
        <h1>Bu havola allaqachon ishlatilgan</h1>
        <p className="sub">Anketa to'ldirilgan. Davom etish uchun shaxsiy havolangizdan foydalaning.</p>
        {info.xodim_token && <Link className="btn primary" to={`/a/${info.xodim_token}`}>Mening anketam →</Link>}
      </div>
    )
  }

  async function onFile(f: File | undefined) {
    if (!f) return
    try { setFoto(await fileToDataUrl(f)) } catch (e) { setErr(String(e)) }
  }
  async function submit(ev: FormEvent) {
    ev.preventDefault()
    if (!ism.trim()) { setErr('Ism-sharifingizni kiriting'); return }
    setBusy(true); setErr('')
    try {
      const r = await api.inviteFill(token, slug(ism), { ism: ism.trim(), foto, shaxsiy: { fish: ism.trim(), telefon: telefon.trim(), lavozim: info!.ok ? info!.lavozim : '' } })
      if (!r.ok) { setErr(r.xato); return }
      nav(`/a/${r.token}`, { replace: true, state: { yangi: true } })
    } catch (e) { setErr(String((e as Error).message ?? e)) } finally { setBusy(false) }
  }

  return (
    <div className="login" style={{ ['--c' as string]: info.bolim_rang }}>
      <div className="invite-head">
        <div className="pill" style={{ background: info.bolim_rang }}>{info.bolim_nomi}</div>
        <h1>Xush kelibsiz!</h1>
        <p className="sub">
          Siz <b>{info.bolim_nomi}</b>ga{info.lavozim ? <> <b>{info.lavozim}</b> lavozimiga</> : null} taklif qilindingiz
          {info.rahbar_ism ? <>. Bevosita rahbaringiz: <b>{info.rahbar_ism}</b></> : null}.
          {info.izoh ? <><br />{info.izoh}</> : null}
        </p>
      </div>
      <form className="form" onSubmit={submit}>
        <div className="photo-row">
          <Avatar e={{ ism: ism || '?', foto }} size="lg" />
          <div className="photo-actions">
            <label className="btn">Rasm yuklash<input type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} /></label>
            {foto && <button type="button" className="btn ghost" onClick={() => setFoto('')}>Olib tashlash</button>}
          </div>
        </div>
        <label className="field"><span>Ism-sharifingiz *</span><input autoFocus value={ism} onChange={(e) => setIsm(e.target.value)} placeholder="Familiya Ism" /></label>
        <label className="field"><span>Telefon</span><input value={telefon} onChange={(e) => setTelefon(e.target.value)} placeholder="+998 __ ___ __ __" /></label>
        {err && <div className="err">{err}</div>}
        <div className="actions">
          <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Saqlanmoqda…' : "Davom etish → anketani to'ldirish"}</button>
        </div>
      </form>
    </div>
  )
}
