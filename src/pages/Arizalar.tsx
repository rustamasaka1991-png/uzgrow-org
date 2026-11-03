import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Anketa } from '../components/Anketa'
import { Avatar } from '../components/Avatar'
import { FilesPanel } from '../components/FilesPanel'
import { useAuth } from '../data/auth'
import { useAriza, useArizalar } from '../data/arizalar'
import { copyArizaFilesToXodim, createToldirishLink, useFayllar, useToldirishLinks } from '../data/fayllar'
import { copyText } from '../data/invites'
import { ANKETA, SINOV_BOLIM, emptyEmployee } from '../data/seed'
import { useOrg } from '../data/store'
import { linkTo, supabase, type ArizaHolat, type ArizaLite } from '../data/supabase'
import type { Employee } from '../data/types'
import { RASM_SONI, fotoVaKichik, keyLabel, missingKeys, norm, slug, uniqueId } from '../lib/util'

const HOLAT: Record<ArizaHolat, string> = { yangi: 'Yangi', qabul: 'Qabul qilindi', rad: 'Rad etildi' }
const fmt = (s: string) => new Date(s).toLocaleString('uz', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/** HR: to'ldirilgan anketalar ro'yxati (yengil ko'rinish — tez yuklanadi) */
export function Arizalar() {
  const { enabled, session, isAdmin, loading: authLoading } = useAuth()
  const { list, error, loading } = useArizalar()
  const { data } = useOrg()
  const [filter, setFilter] = useState<'yangi' | 'hammasi'>('yangi')
  const [copied, setCopied] = useState(false)
  if (enabled && authLoading) return <div className="center"><div className="spinner" /> Yuklanmoqda…</div>
  if (enabled && (!session || !isAdmin)) return <Navigate to="/" replace />
  const link = linkTo('/anketa')
  const shown = filter === 'yangi' ? list.filter((a) => a.holat === 'yangi') : list
  const tel = (s?: string | null) => (s ?? '').replace(/\D/g, '')
  const isDup = (a: ArizaLite) => {
    const t = tel(a.telefon), n = norm(a.ism ?? '')
    const other = list.some((b) => b.id !== a.id && ((t && tel(b.telefon) === t) || (n && norm(b.ism ?? '') === n)))
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
            <Avatar e={{ ism: a.ism ?? '?', foto: a.foto ?? '' }} />
            <div>
              <div className="n">{a.ism}{isDup(a) && <span className="dup" title="Bir xil telefon yoki ism bilan boshqa anketa yoki xodim bor">takror?</span>}</div>
              <div className="r">{fmt(a.created_at)}{a.telefon ? ` · ${a.telefon}` : ''}{a.lavozim ? ` · ${a.lavozim}` : ''}</div>
            </div>
            <span className={`st ${a.holat}`}>{HOLAT[a.holat]}</span>
          </Link>
        ))}
      </div>
    </>
  )
}

/** HR: chala anketa uchun bir martalik havola bloki (anketa yoki xodim uchun) */
/** Havolaga kiritish mumkin bo'lgan barcha maydonlar, bo'limlar bo'yicha */
function allKeysGrouped(): { nom: string; keys: string[] }[] {
  const out: { nom: string; keys: string[] }[] = [{ nom: 'Rasmlar va pasport', keys: ['foto', 'pasport_old', 'pasport_orqa', 'rasmlar'] }]
  for (const sec of ['shaxsiy', 'talim', 'mehnat', 'oila', 'shaxsiyat', 'hobbi', 'maqsad', 'rivojlanish'] as const) {
    const s = ANKETA[sec]
    out.push({ nom: s.nom, keys: s.turi === 'qa' ? s.savollar.map(([q]) => `${sec}.${q}`) : [sec] })
  }
  return out
}

export function ToldirishBlock({ e, target, files = [] }: { e: Employee; target: { xodim_id?: string; ariza_id?: string }; files?: { turi: string; idx: number }[] }) {
  const miss = missingKeys(e, files)
  const missSet = new Set(miss)
  const { list, reload, remove } = useToldirishLinks(target)
  const [link, setLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sel, setSel] = useState<Set<string>>(() => new Set(miss))
  const [showAll, setShowAll] = useState(false)
  const [open2, setOpen2] = useState(false)
  if (!supabase) return null
  const open = list.filter((l) => !l.used_at)
  const rasmSoni = files.filter((f) => f.turi === 'rasm').length
  const itemLabel = (k: string) => k === 'rasmlar' ? `Qo'shimcha rasmlar (${rasmSoni}/${RASM_SONI})` : k.includes('.') ? keyLabel(k).split(': ').slice(1).join(': ') : (k === 'talim' || k === 'mehnat') ? `${ANKETA[k].nom} — kamida bitta qator` : keyLabel(k)
  const toggle = (k: string) => setSel((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n })
  const toggleGroup = (keys: string[], on: boolean) => setSel((s) => { const n = new Set(s); keys.forEach((k) => (on ? n.add(k) : n.delete(k))); return n })
  const groups = allKeysGrouped().map((g) => ({ ...g, keys: showAll ? g.keys : g.keys.filter((k) => missSet.has(k)) })).filter((g) => g.keys.length)
  async function create() {
    if (!sel.size) return
    setBusy(true)
    try { const t = await createToldirishLink(target, [...sel]); setLink(linkTo(`/t/${t}`)); await reload() } catch (ex) { alert(String((ex as Error).message ?? ex)) } finally { setBusy(false) }
  }
  async function copy(l: string) { setCopied(await copyText(l)); setTimeout(() => setCopied(false), 2000) }
  const visible = miss.length > 0 || open2 || showAll
  return (
    <div className={`panel toldirish${miss.length ? '' : ' ok'}`}>
      <div className="titlebar" style={{ alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Chala joylar{miss.length ? ` — ${miss.length} ta to'ldirilmagan` : ' — hammasi to’ldirilgan ✓'}</h3>
        {!miss.length && !open2 && <button type="button" className="btn ghost" onClick={() => { setOpen2(true); setShowAll(true) }}>Qayta to'ldirish uchun havola…</button>}
      </div>
      {visible && (
        <>
          <p className="note">Xodim to'ldirishi kerak bo'lgan joylarni belgilang (bo'shlari oldindan belgilangan). Havolada faqat belgilanganlar ko'rinadi.</p>
          <div className="miss-groups">
            {groups.map((g) => {
              const allOn = g.keys.every((k) => sel.has(k))
              return (
                <div className="miss-group" key={g.nom}>
                  <label className="miss-sec check"><input type="checkbox" checked={allOn} onChange={(ev) => toggleGroup(g.keys, ev.target.checked)} /> {g.nom} <span className="note">({g.keys.filter((k) => sel.has(k)).length}/{g.keys.length})</span></label>
                  <div className="miss-items">
                    {g.keys.map((k) => (
                      <label className={`check miss-item${missSet.has(k) ? ' empty' : ''}`} key={k}>
                        <input type="checkbox" checked={sel.has(k)} onChange={() => toggle(k)} /> {itemLabel(k)}{missSet.has(k) ? <span className="tag-empty">bo'sh</span> : <span className="note"> (to'ldirilgan)</span>}
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="actions" style={{ justifyContent: 'flex-start', gap: 12 }}>
            <label className="check"><input type="checkbox" checked={showAll} onChange={(ev) => setShowAll(ev.target.checked)} /> Barcha savollarni ko'rsatish (to'ldirilganlarni ham qayta so'rash uchun)</label>
            <span className="note">Tanlangan: <b>{sel.size}</b></span>
          </div>
          <p className="note">Xodimga bir martalik havola yuboring: unda faqat belgilangan joylar (savollar, pasport, rasmlar) ko'rinadi, to'ldirgach havola yopiladi va javoblar anketaga tushadi.</p>
          {link ? (
            <div className="link-box"><code>{link}</code><button type="button" className="btn primary" onClick={() => copy(link)}>{copied ? 'Nusxalandi ✓' : 'Nusxalash'}</button></div>
          ) : (
            <button type="button" className="btn primary" onClick={create} disabled={busy || !sel.size} title={sel.size ? '' : 'Avval kamida bitta joyni belgilang'}>{busy ? '…' : `🔗 Havola yaratish (${sel.size} ta joy)`}</button>
          )}
          {open.length > 0 && !link && (
            <div className="list" style={{ marginTop: 8 }}>
              {open.map((l) => (
                <div className="invite" key={l.token}>
                  <div className="grow"><div className="n">Ochiq havola · {l.maydonlar.length} ta maydon</div><div className="r">{fmt(l.created_at)}</div></div>
                  <button type="button" className="btn" onClick={() => copy(linkTo(`/t/${l.token}`))}>Nusxalash</button>
                  <button type="button" className="icon-btn" title="Bekor qilish" onClick={() => remove(l.token)}>✕</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

/** HR: bitta anketani ko'rish, tahrirlash va qabul qilish */
export function ArizaView() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const { enabled, session, isAdmin, loading: authLoading } = useAuth()
  const { ariza: a, loading, error, setHolat, updateData, remove } = useAriza(id)
  const files = useFayllar('ariza_fayllar', id)
  const { data, managers, byId, allIds, addEmployee, deptOf } = useOrg()
  const [bolim, setBolim] = useState(data.bolimlar.some((b) => b.id === SINOV_BOLIM) ? SINOV_BOLIM : (data.bolimlar[0]?.id ?? ''))
  const [lavozim, setLavozim] = useState('')
  const [rahbar, setRahbar] = useState(() => byId[data.ceoId] ? data.ceoId : '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [saveMsg, setSaveMsg] = useState('')
  const [lavozimTouched, setLavozimTouched] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!bolim && data.bolimlar.length) setBolim(data.bolimlar.some((b) => b.id === SINOV_BOLIM) ? SINOV_BOLIM : data.bolimlar[0].id)
    if (!rahbar && data.ceoId && byId[data.ceoId]) setRahbar(data.ceoId)
  }, [data.bolimlar, data.ceoId, byId, bolim, rahbar])
  useEffect(() => {
    const want = a?.data.shaxsiy?.lavozim ?? ''
    if (!lavozimTouched && want && !lavozim) setLavozim(want)
  }, [a, lavozim, lavozimTouched])
  if (enabled && authLoading) return <div className="center"><div className="spinner" /> Yuklanmoqda…</div>
  if (enabled && (!session || !isAdmin)) return <Navigate to="/" replace />
  if (loading) return <div className="center"><div className="spinner" /> Anketa yuklanmoqda…</div>
  if (!a) return <div className="login"><h1>Anketa topilmadi</h1><p className="sub">{error ?? "O'chirilgan bo'lishi mumkin."}</p><Link className="btn" to="/arizalar">← Anketalar</Link></div>
  const e = emptyEmployee({ ...a.data, id: 'ariza' })
  const xodim = a.xodim_id ? byId[a.xodim_id] : undefined

  const save = (fn: (x: Employee) => Employee) => {
    const next = fn(e)
    const { id: _id, ...clean } = next
    setSaveMsg('Saqlanmoqda…')
    updateData(clean).then(() => { setSaveMsg('Saqlandi ✓'); setTimeout(() => setSaveMsg(''), 2000) }).catch((ex) => setSaveMsg('Xato: ' + String((ex as Error).message ?? ex)))
  }
  async function onPhoto(f: File | undefined) {
    if (!f) return
    try { const r = await fotoVaKichik(f); save((x) => ({ ...x, ...r })) } catch (ex) { alert(String(ex)) }
  }
  async function accept(ev: FormEvent) {
    ev.preventDefault()
    if (!a) return
    if (!lavozim.trim()) { setErr('Lavozimni kiriting'); return }
    if (!bolim || !data.bolimlar.some((b) => b.id === bolim)) { setErr("Bo'limni tanlang"); return }
    setBusy(true); setErr('')
    try {
      const xid = uniqueId(slug(a.data.ism ?? 'xodim'), new Set(allIds))
      const emp = emptyEmployee({ ...a.data, id: xid, bolim, rahbar, lavozim: lavozim.trim(), guruh: '',
        sinov_boshlandi: bolim === SINOV_BOLIM ? new Date().toISOString().slice(0, 10) : undefined })
      emp.shaxsiy.lavozim = lavozim.trim()
      addEmployee(emp)
      await copyArizaFilesToXodim(a.id, xid)
      await setHolat('qabul', { xodim_id: xid })
      nav(`/x/${xid}`)
    } catch (ex) { setErr(String((ex as Error).message ?? ex)) } finally { setBusy(false) }
  }
  async function reject() {
    if (!a || !confirm('Anketa rad etilsinmi?')) return
    try { await setHolat('rad') } catch (ex) { alert(String(ex)) }
  }
  async function del() {
    if (!a || !confirm("Anketa butunlay o'chirilsinmi?")) return
    try { await remove(); nav('/arizalar') } catch (ex) { alert(String(ex)) }
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
            <label className="field"><span>Lavozim *</span><input value={lavozim} onChange={(ev) => { setLavozimTouched(true); setLavozim(ev.target.value) }} placeholder="Masalan: Buxgalter" /></label>
          </div>
          <label className="field"><span>Bevosita rahbari</span>
            <select value={rahbar} onChange={(ev) => setRahbar(ev.target.value)}>
              <option value="">— Yo'q —</option>
              {managers.map((x) => <option key={x.id} value={x.id}>{x.ism} — {x.lavozim}</option>)}
            </select>
          </label>
          {err && <div className="err">{err}</div>}
          <div className="actions">
            <button type="submit" className="btn primary" disabled={busy}>{busy ? '…' : '✓ Qabul qilish va tuzilmaga qo’shish'}</button>
          </div>
        </form>
      )}

      {a.holat !== 'qabul' && <ToldirishBlock e={e} target={{ ariza_id: a.id }} files={files.list} />}

      <details className="sec" open>
        <summary><span className="num">📎</span><span className="tt">Pasport va qo'shimcha rasmlar</span><span className="cnt">{files.list.length} ta fayl</span></summary>
        <div className="qa"><FilesPanel files={files.list} loading={files.loading} canEdit onUpload={files.upload} onDelete={(f) => files.remove(f.id)} onOpen={files.open} /></div>
      </details>

      <p className="note no-print">Anketadagi har bir bo'limni "Tahrirlash" orqali to'g'rilashingiz mumkin — o'zgarishlar anketaga yoziladi{a.holat === 'qabul' ? ' (tuzilmadagi xodim anketasini uning sahifasida o’zgartiring)' : ', qabul qilinganda xodimga ko’chadi'}.</p>
      <Anketa e={e} mode="admin" save={save} />
    </div>
  )
}
