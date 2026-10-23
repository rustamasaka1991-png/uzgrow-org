import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Anketa } from '../components/Anketa'
import { Avatar } from '../components/Avatar'
import { useAuth } from '../data/auth'
import { useArizalar } from '../data/arizalar'
import { copyText } from '../data/invites'
import { SINOV_BOLIM, emptyEmployee } from '../data/seed'
import { useOrg } from '../data/store'
import { linkTo, supabase, type Ariza } from '../data/supabase'
import { slug, uniqueId } from '../lib/util'

const HOLAT: Record<Ariza['holat'], string> = { yangi: 'Yangi', qabul: 'Qabul qilindi', rad: 'Rad etildi' }
const fmt = (s: string) => new Date(s).toLocaleString('uz', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/** HR: to'ldirilgan anketalar ro'yxati */
export function Arizalar() {
  const { enabled, session, isAdmin } = useAuth()
  const { list, error, loading } = useArizalar()
  const [filter, setFilter] = useState<'yangi' | 'hammasi'>('yangi')
  const [copied, setCopied] = useState(false)
  if (enabled && (!session || !isAdmin)) return <Navigate to="/" replace />
  const link = linkTo('/anketa')
  const shown = filter === 'yangi' ? list.filter((a) => a.holat === 'yangi') : list
  async function copy() { setCopied(await copyText(link)); setTimeout(() => setCopied(false), 2000) }
  return (
    <>
      <div className="crumbs"><Link className="back" to="/">← Umumiy tuzilma</Link></div>
      <div className="titlebar">
        <div><h1>To'ldirilgan anketalar</h1><p className="sub">Xodimlar ochiq havola orqali anketa to'ldiradi — shu yerga tushadi. Ochib, bo'lim va lavozimni belgilab qabul qilasiz.</p></div>
      </div>
      <div className="panel" style={{ marginBottom: 18 }}>
        <h3>Anketa havolasi (hammaga bitta)</h3>
        <div className="link-box"><code>{link}</code><button type="button" className="btn primary" onClick={copy}>{copied ? 'Nusxalandi ✓' : 'Nusxalash'}</button></div>
        <p className="note" style={{ marginTop: 8 }}>Yangi xodimga shu havolani yuboring. U to'ldirib yuboradi, anketa shu ro'yxatda paydo bo'ladi.</p>
      </div>
      <div className="tabs">
        <button type="button" className="tab" aria-current={filter === 'yangi' ? 'true' : undefined} onClick={() => setFilter('yangi')}>Yangi ({list.filter((a) => a.holat === 'yangi').length})</button>
        <button type="button" className="tab" aria-current={filter === 'hammasi' ? 'true' : undefined} onClick={() => setFilter('hammasi')}>Hammasi ({list.length})</button>
      </div>
      {error && <div className="err">{error}</div>}
      <div className="list">
        {loading && <div className="empty-box">Yuklanmoqda…</div>}
        {!loading && !shown.length && <div className="empty-box">{filter === 'yangi' ? 'Yangi anketa yo’q' : 'Hali anketa kelmagan'}</div>}
        {shown.map((a) => (
          <Link key={a.id} className="ariza" to={`/arizalar/${a.id}`}>
            <Avatar e={{ ism: a.data.ism ?? '?', foto: a.data.foto ?? '' }} />
            <div>
              <div className="n">{a.data.ism}</div>
              <div className="r">{fmt(a.created_at)}{a.data.shaxsiy?.telefon ? ` · ${a.data.shaxsiy.telefon}` : ''}{a.data.shaxsiy?.lavozim ? ` · ${a.data.shaxsiy.lavozim}` : ''}</div>
            </div>
            <span className={`st ${a.holat}`}>{HOLAT[a.holat]}</span>
          </Link>
        ))}
      </div>
    </>
  )
}

/** HR: bitta anketani ko'rish va qabul qilish */
export function ArizaView() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const { enabled, session, isAdmin } = useAuth()
  const { list, loading, setHolat, remove } = useArizalar()
  const { data, managers, byId, addEmployee, deptOf } = useOrg()
  const [bolim, setBolim] = useState(data.bolimlar.some((b) => b.id === SINOV_BOLIM) ? SINOV_BOLIM : (data.bolimlar[0]?.id ?? ''))
  const [lavozim, setLavozim] = useState('')
  const [rahbar, setRahbar] = useState(() => byId[data.ceoId] ? data.ceoId : '')
  const [guruh, setGuruh] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  if (enabled && (!session || !isAdmin)) return <Navigate to="/" replace />
  const a = list.find((x) => x.id === id)
  if (loading && !a) return <div className="center"><div className="spinner" /> Yuklanmoqda…</div>
  if (!a) return <Navigate to="/arizalar" replace />
  const e = emptyEmployee({ ...a.data, id: 'ariza' })
  const xodim = a.xodim_id ? byId[a.xodim_id] : undefined

  async function accept(ev: FormEvent) {
    ev.preventDefault()
    if (!a) return
    if (!lavozim.trim()) { setErr('Lavozimni kiriting'); return }
    setBusy(true); setErr('')
    try {
      const xid = uniqueId(slug(a.data.ism ?? 'xodim'), new Set(data.xodimlar.map((x) => x.id)))
      const emp = emptyEmployee({ ...a.data, id: xid, bolim, rahbar, lavozim: lavozim.trim(), guruh: guruh.trim() })
      emp.shaxsiy.lavozim = lavozim.trim()
      addEmployee(emp)
      await setHolat(a.id, 'qabul', { xodim_id: xid })
      nav(`/x/${xid}`)
    } catch (ex) { setErr(String((ex as Error).message ?? ex)) } finally { setBusy(false) }
  }
  async function reject() {
    if (!a || !confirm('Anketa rad etilsinmi?')) return
    try { await setHolat(a.id, 'rad') } catch (ex) { alert(String(ex)) }
  }
  async function del() {
    if (!a || !confirm("Anketa butunlay o'chirilsinmi?")) return
    try { await remove(a.id); nav('/arizalar') } catch (ex) { alert(String(ex)) }
  }

  return (
    <div style={{ ['--c' as string]: deptOf(bolim)?.rang ?? 'var(--brand)' }}>
      <div className="crumbs no-print">
        <Link className="back" to="/arizalar">← Anketalar</Link>
        <span className="grow" />
        {a.holat !== 'rad' && a.holat !== 'qabul' && <button type="button" className="btn danger ghost" onClick={reject}>Rad etish</button>}
        <button type="button" className="btn ghost" onClick={del}>O'chirish</button>
      </div>
      <div className="hero">
        <div className="band" />
        <div className="in">
          <Avatar e={e} size="lg" />
          <div className="who">
            <h2>{e.shaxsiy.fish || e.ism}</h2>
            <div className="pos">Anketa · {fmt(a.created_at)} · <b>{HOLAT[a.holat]}</b>{xodim ? <> · <Link to={`/x/${xodim.id}`}>{xodim.ism} (tuzilmada)</Link></> : null}</div>
          </div>
        </div>
        <div className="facts">
          {([['Telefon', e.shaxsiy.telefon], ["Tug'ilgan sana", e.shaxsiy.tugilgan], ['Manzil', e.shaxsiy.manzil], ['Xohlagan lavozimi', e.shaxsiy.lavozim]] as [string, string][]).map(([k, v]) => (
            <div className="fact" key={k}><div className="k">{k}</div><div className="v">{v || <span style={{ color: 'var(--muted)' }}>—</span>}</div></div>
          ))}
        </div>
      </div>

      {a.holat === 'yangi' && supabase && (
        <form className="accept" onSubmit={accept}>
          <h3>Qabul qilish — bo'lim va lavozimni belgilang</h3>
          <div className="row2">
            <label className="field"><span>Bo'lim *</span>
              <select value={bolim} onChange={(ev) => setBolim(ev.target.value)}>
                {data.bolimlar.map((b) => <option key={b.id} value={b.id}>{b.nomi}</option>)}
              </select>
            </label>
            <label className="field"><span>Lavozim *</span><input value={lavozim} onChange={(ev) => setLavozim(ev.target.value)} placeholder={e.shaxsiy.lavozim || 'Masalan: Buxgalter'} /></label>
          </div>
          <div className="row2">
            <label className="field"><span>Bevosita rahbari</span>
              <select value={rahbar} onChange={(ev) => setRahbar(ev.target.value)}>
                <option value="">— Yo'q —</option>
                {managers.map((x) => <option key={x.id} value={x.id}>{x.ism} — {x.lavozim}</option>)}
              </select>
            </label>
            <label className="field"><span>Guruh (ixtiyoriy)</span><input value={guruh} onChange={(ev) => setGuruh(ev.target.value)} placeholder="Masalan: Call operatorlar" /></label>
          </div>
          {err && <div className="err">{err}</div>}
          <div className="actions">
            <button type="button" className="btn ghost" onClick={() => setLavozim(e.shaxsiy.lavozim)} disabled={!e.shaxsiy.lavozim}>Xohlagan lavozimini olish</button>
            <button type="submit" className="btn primary" disabled={busy}>{busy ? '…' : '✓ Qabul qilish va tuzilmaga qo’shish'}</button>
          </div>
        </form>
      )}

      <Anketa e={e} mode="view" />
    </div>
  )
}
