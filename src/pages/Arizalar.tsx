import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Anketa } from '../components/Anketa'
import { Avatar } from '../components/Avatar'
import { GroupSelect } from '../components/GroupSelect'
import { useAuth } from '../data/auth'
import { useArizalar } from '../data/arizalar'
import { copyText } from '../data/invites'
import { SINOV_BOLIM, emptyEmployee } from '../data/seed'
import { useOrg } from '../data/store'
import { linkTo, supabase, type Ariza } from '../data/supabase'
import type { Employee } from '../data/types'
import { fileToDataUrl, norm, slug, uniqueId } from '../lib/util'

const HOLAT: Record<Ariza['holat'], string> = { yangi: 'Yangi', qabul: 'Qabul qilindi', rad: 'Rad etildi' }
const fmt = (s: string) => new Date(s).toLocaleString('uz', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/** HR: to'ldirilgan anketalar ro'yxati */
export function Arizalar() {
  const { enabled, session, isAdmin } = useAuth()
  const { list, error, loading } = useArizalar()
  const { data } = useOrg()
  const [filter, setFilter] = useState<'yangi' | 'hammasi'>('yangi')
  const [copied, setCopied] = useState(false)
  if (enabled && (!session || !isAdmin)) return <Navigate to="/" replace />
  const link = linkTo('/anketa')
  const shown = filter === 'yangi' ? list.filter((a) => a.holat === 'yangi') : list
  const tel = (s?: string) => (s ?? '').replace(/\D/g, '')
  const isDup = (a: Ariza) => {
    const t = tel(a.data.shaxsiy?.telefon), n = norm(a.data.ism ?? '')
    const other = list.some((b) => b.id !== a.id && ((t && tel(b.data.shaxsiy?.telefon) === t) || (n && norm(b.data.ism ?? '') === n)))
    const emp = data.xodimlar.some((e) => (t && tel(e.shaxsiy.telefon) === t) || (n && norm(e.ism) === n))
    return other || (emp && a.holat !== 'qabul')
  }
  async function copy() { setCopied(await copyText(link)); setTimeout(() => setCopied(false), 2000) }
  return (
    <>
      <div className="crumbs"><Link className="back" to="/">← Umumiy tuzilma</Link></div>
      <div className="titlebar">
        <div><h1>To'ldirilgan anketalar</h1><p className="sub">Xodimlar ochiq havola orqali anketa to'ldiradi — shu yerga tushadi. Ochib, tekshirib, bo'lim va lavozimni belgilab qabul qilasiz.</p></div>
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
              <div className="n">{a.data.ism}{isDup(a) && <span className="dup" title="Bir xil telefon yoki ism bilan boshqa anketa yoki xodim bor">takror?</span>}</div>
              <div className="r">{fmt(a.created_at)}{a.data.shaxsiy?.telefon ? ` · ${a.data.shaxsiy.telefon}` : ''}{a.data.shaxsiy?.lavozim ? ` · ${a.data.shaxsiy.lavozim}` : ''}</div>
            </div>
            <span className={`st ${a.holat}`}>{HOLAT[a.holat]}</span>
          </Link>
        ))}
      </div>
    </>
  )
}

/** HR: bitta anketani ko'rish, tahrirlash va qabul qilish */
export function ArizaView() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const { enabled, session, isAdmin } = useAuth()
  const { list, loading, setHolat, updateData, remove } = useArizalar()
  const { data, managers, byId, allIds, addEmployee, deptOf } = useOrg()
  const [bolim, setBolim] = useState(data.bolimlar.some((b) => b.id === SINOV_BOLIM) ? SINOV_BOLIM : (data.bolimlar[0]?.id ?? ''))
  const [lavozim, setLavozim] = useState('')
  const [rahbar, setRahbar] = useState(() => byId[data.ceoId] ? data.ceoId : '')
  const [guruh, setGuruh] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [saveMsg, setSaveMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!bolim && data.bolimlar.length) setBolim(data.bolimlar.some((b) => b.id === SINOV_BOLIM) ? SINOV_BOLIM : data.bolimlar[0].id)
    if (!rahbar && data.ceoId && byId[data.ceoId]) setRahbar(data.ceoId)
  }, [data.bolimlar, data.ceoId, byId, bolim, rahbar])
  if (enabled && (!session || !isAdmin)) return <Navigate to="/" replace />
  const a = list.find((x) => x.id === id)
  if (loading && !a) return <div className="center"><div className="spinner" /> Yuklanmoqda…</div>
  if (!a) return <Navigate to="/arizalar" replace />
  const e = emptyEmployee({ ...a.data, id: 'ariza' })
  const xodim = a.xodim_id ? byId[a.xodim_id] : undefined

  /** HR anketa bo'limini o'zgartiradi — bazadagi anketaga yoziladi */
  const save = (fn: (x: Employee) => Employee) => {
    const next = fn(e)
    const { id: _id, ...clean } = next
    setSaveMsg('Saqlanmoqda…')
    updateData(a.id, clean).then(() => { setSaveMsg('Saqlandi ✓'); setTimeout(() => setSaveMsg(''), 2000) }).catch((ex) => setSaveMsg('Xato: ' + String((ex as Error).message ?? ex)))
  }
  async function onPhoto(f: File | undefined) {
    if (!f) return
    try { const foto = await fileToDataUrl(f); save((x) => ({ ...x, foto })) } catch (ex) { alert(String(ex)) }
  }
  async function accept(ev: FormEvent) {
    ev.preventDefault()
    if (!a) return
    if (!lavozim.trim()) { setErr('Lavozimni kiriting'); return }
    if (!bolim || !data.bolimlar.some((b) => b.id === bolim)) { setErr("Bo'limni tanlang"); return }
    setBusy(true); setErr('')
    try {
      const xid = uniqueId(slug(a.data.ism ?? 'xodim'), new Set(allIds))
      const emp = emptyEmployee({ ...a.data, id: xid, bolim, rahbar, lavozim: lavozim.trim(), guruh: guruh.trim(),
        sinov_boshlandi: bolim === SINOV_BOLIM ? new Date().toISOString().slice(0, 10) : undefined })
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
        {saveMsg && <span className="note">{saveMsg}</span>}
        {a.holat === 'yangi' && <button type="button" className="btn danger ghost" onClick={reject}>Rad etish</button>}
        <button type="button" className="btn ghost" onClick={del}>O'chirish</button>
      </div>
      <div className="hero">
        <div className="band" />
        <div className="in">
          <button type="button" className="av-btn" onClick={() => fileRef.current?.click()} title="Rasm yuklash / almashtirish">
            <Avatar e={e} size="lg" /><span className="av-hint">Rasm</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(ev) => { onPhoto(ev.target.files?.[0]); ev.target.value = '' }} />
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
        {!e.foto && <div className="subs"><span className="note">Rasm yo'q — avatarni bosib yuklashingiz mumkin.</span></div>}
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
            <GroupSelect value={guruh} onChange={setGuruh} bolim={bolim} />
          </div>
          {err && <div className="err">{err}</div>}
          <div className="actions">
            <button type="button" className="btn ghost" onClick={() => setLavozim(e.shaxsiy.lavozim)} disabled={!e.shaxsiy.lavozim}>Xohlagan lavozimini olish</button>
            <button type="submit" className="btn primary" disabled={busy}>{busy ? '…' : '✓ Qabul qilish va tuzilmaga qo’shish'}</button>
          </div>
        </form>
      )}

      <p className="note no-print">Anketadagi har bir bo'limni "Tahrirlash" orqali to'g'rilashingiz mumkin — o'zgarishlar anketaga yoziladi{a.holat === 'qabul' ? ' (tuzilmadagi xodim anketasini uning sahifasida o’zgartiring)' : ', qabul qilinganda xodimga ko’chadi'}.</p>
      <Anketa e={e} mode="admin" save={save} />
    </div>
  )
}
