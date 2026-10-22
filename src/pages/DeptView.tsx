import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { DeptForm } from '../components/DeptForm'
import { EmployeeForm } from '../components/EmployeeForm'
import { DeptIcon } from '../components/Icons'
import { Modal } from '../components/Modal'
import { TreeNode } from '../components/Tree'
import { copyText, useInvites } from '../data/invites'
import { useOrg } from '../data/store'
import { linkTo, supabase, type Invite } from '../data/supabase'
import { completeness } from '../lib/util'

export function DeptView() {
  const { id = '' } = useParams()
  const { data, deptOf, ofDept, headOf, byId, deleteDepartment } = useOrg()
  const nav = useNavigate()
  const [edit, setEdit] = useState(false)
  const [addEmp, setAddEmp] = useState(false)
  const [invite, setInvite] = useState(false)
  const d = deptOf(id)
  if (!d) return <Navigate to="/" replace />
  const ps = ofDept(id)
  const h = headOf(id)
  const boss = h ? byId[h.rahbar] : undefined
  const roots = ps.filter((e) => !byId[e.rahbar] || byId[e.rahbar].bolim !== id)

  function remove() {
    if (ps.length) { alert("Bo'limda xodimlar bor. Avval ularni boshqa bo'limga o'tkazing yoki o'chiring."); return }
    if (confirm(`"${d!.nomi}" bo'limi o'chirilsinmi?`)) { deleteDepartment(id); nav('/') }
  }

  return (
    <div style={{ ['--c' as string]: d.rang }}>
      <div className="crumbs"><Link className="back" to="/">← Umumiy tuzilma</Link></div>
      <div className="tabs">
        {data.bolimlar.map((x) => (
          <Link key={x.id} className="tab" style={{ ['--c' as string]: x.rang }} to={`/d/${x.id}`} aria-current={x.id === id ? 'true' : undefined}>
            {x.nomi.replace(" bo'limi", '')}
          </Link>
        ))}
      </div>
      <div className="dhead">
        <div className="ic"><DeptIcon id={id} /></div>
        <div className="grow">
          <h2>{d.nomi}</h2>
          <p>{ps.length} kishi{boss ? ` · ${boss.ism}ga bo'ysunadi` : ''}</p>
        </div>
        <div className="title-actions">
          <button type="button" className="btn" onClick={() => setEdit(true)}>Tahrirlash</button>
          <button type="button" className="btn danger ghost" onClick={remove}>O'chirish</button>
          {supabase && <button type="button" className="btn primary" onClick={() => setInvite(true)}>🔗 Taklif havolasi</button>}
          <button type="button" className="btn" onClick={() => setAddEmp(true)}>+ Xodim (qo'lda)</button>
        </div>
      </div>
      <div className="grid2">
        <section className="panel">
          <h3>Bo'lim tuzilmasi</h3>
          <div className={`tree${roots.length > 1 ? ' multi' : ''}`}>
            {roots.length ? roots.map((r) => <TreeNode key={r.id} e={r} top />) : <div className="empty-box">Xodim yo'q</div>}
          </div>
        </section>
        <div className="col">
          <section className="panel">
            <h3>Xodimlar va anketalar</h3>
            <div className="list">
              {ps.map((e) => {
                const p = completeness(e)
                return (
                  <Link key={e.id} className="person" to={`/x/${e.id}`}>
                    <Avatar e={e} />
                    <div><div className="n">{e.ism}</div><div className="r">{e.lavozim}</div></div>
                    <span className="fill" title="Anketa to'ldirilganligi"><i><b style={{ width: `${p}%` }} /></i>{p}%</span>
                  </Link>
                )
              })}
              {!ps.length && <div className="empty-box">Hali xodim qo'shilmagan</div>}
            </div>
          </section>
          {supabase && <InvitesPanel bolim={id} />}
          <section className="panel">
            <h3>Asosiy vazifalar</h3>
            {d.vazifalar.length ? <ul className="duties">{d.vazifalar.map((x, i) => <li key={i}>{x}</li>)}</ul> : <div className="empty-box">Vazifalar kiritilmagan — "Tahrirlash" orqali qo'shing</div>}
          </section>
        </div>
      </div>
      {edit && <DeptForm initial={d} onClose={() => setEdit(false)} />}
      {addEmp && <EmployeeForm defaultDept={id} onClose={() => setAddEmp(false)} onSaved={(xid) => nav(`/x/${xid}`)} />}
      {invite && <InviteModal bolim={id} defaultBoss={h?.id ?? data.ceoId} onClose={() => setInvite(false)} />}
    </div>
  )
}

/* ---------- Taklif havolalari ro'yxati ---------- */
function InvitesPanel({ bolim }: { bolim: string }) {
  const { list, error, remove } = useInvites(bolim)
  const { byId } = useOrg()
  const [copied, setCopied] = useState<string | null>(null)
  async function copy(t: string) { if (await copyText(linkTo(`/h/${t}`))) { setCopied(t); setTimeout(() => setCopied(null), 2000) } }
  const open = list.filter((i) => !i.used_by)
  const used = list.filter((i) => i.used_by)
  const fmt = (s: string) => new Date(s).toLocaleDateString('uz')
  return (
    <section className="panel">
      <h3>Taklif havolalari</h3>
      {error && <div className="err">{error}</div>}
      {!list.length && <div className="empty-box">Hali havola yaratilmagan. "🔗 Taklif havolasi" tugmasi bilan yangi xodim uchun havola yarating.</div>}
      <div className="list">
        {open.map((i: Invite) => (
          <div className="invite" key={i.token}>
            <div className="grow">
              <div className="n">{i.lavozim || 'Lavozim ko’rsatilmagan'}</div>
              <div className="r">Kutilmoqda · {fmt(i.created_at)}{i.rahbar && byId[i.rahbar] ? ` · rahbar: ${byId[i.rahbar].ism}` : ''}{i.guruh ? ` · ${i.guruh}` : ''}</div>
            </div>
            <button type="button" className="btn" onClick={() => copy(i.token)}>{copied === i.token ? 'Nusxalandi ✓' : 'Nusxalash'}</button>
            <button type="button" className="icon-btn" title="Bekor qilish" onClick={() => { if (confirm("Havola bekor qilinsinmi?")) remove(i.token).catch((e) => alert(String(e))) }}>✕</button>
          </div>
        ))}
        {used.map((i: Invite) => (
          <div className="invite used" key={i.token}>
            <div className="grow">
              <div className="n">{byId[i.used_by!]?.ism ?? i.used_by}</div>
              <div className="r">To'ldirildi · {i.used_at ? fmt(i.used_at) : ''}{i.lavozim ? ` · ${i.lavozim}` : ''}</div>
            </div>
            {byId[i.used_by!] && <Link className="btn ghost" to={`/x/${i.used_by}`}>Anketa →</Link>}
            <button type="button" className="icon-btn" title="Ro'yxatdan o'chirish" onClick={() => remove(i.token).catch((e) => alert(String(e)))}>✕</button>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ---------- Yangi taklif havolasi ---------- */
function InviteModal({ bolim, defaultBoss, onClose }: { bolim: string; defaultBoss: string; onClose: () => void }) {
  const { data, deptOf } = useOrg()
  const { create } = useInvites(bolim)
  const [lavozim, setLavozim] = useState('')
  const [rahbar, setRahbar] = useState(defaultBoss)
  const [guruh, setGuruh] = useState('')
  const [izoh, setIzoh] = useState('')
  const [link, setLink] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const groups = Array.from(new Set(data.xodimlar.filter((x) => x.bolim === bolim && x.guruh).map((x) => x.guruh)))

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    setBusy(true); setErr('')
    try { const t = await create({ lavozim: lavozim.trim(), rahbar, guruh: guruh.trim(), izoh: izoh.trim() }); setLink(linkTo(`/h/${t}`)) }
    catch (e) { setErr(String((e as Error).message ?? e)) } finally { setBusy(false) }
  }
  async function copy() { setCopied(await copyText(link)); setTimeout(() => setCopied(false), 2000) }

  return (
    <Modal title={`Taklif havolasi — ${deptOf(bolim)?.nomi ?? bolim}`} onClose={onClose}>
      {link ? (
        <div className="form">
          <p className="note">Havolani yangi xodimga yuboring (Telegram, SMS). U havolani ochib, ismini kiritadi va anketasini to'ldiradi — xodim shu bo'limda paydo bo'ladi. Havola bir marta ishlaydi.</p>
          <div className="link-box"><code>{link}</code><button type="button" className="btn primary" onClick={copy}>{copied ? 'Nusxalandi ✓' : 'Nusxalash'}</button></div>
          <div className="actions"><button type="button" className="btn" onClick={onClose}>Yopish</button></div>
        </div>
      ) : (
        <form className="form" onSubmit={submit}>
          <label className="field"><span>Lavozim (xodimga ko'rinadi)</span><input autoFocus value={lavozim} onChange={(e) => setLavozim(e.target.value)} placeholder="Masalan: Buxgalter" /></label>
          <label className="field"><span>Bevosita rahbari</span>
            <select value={rahbar} onChange={(e) => setRahbar(e.target.value)}>
              <option value="">— Yo'q —</option>
              {data.xodimlar.map((x) => <option key={x.id} value={x.id}>{x.ism} — {x.lavozim}</option>)}
            </select>
          </label>
          <label className="field"><span>Guruh (ixtiyoriy)</span>
            <input value={guruh} onChange={(e) => setGuruh(e.target.value)} list="inv-groups" placeholder="Masalan: Call operatorlar" />
            <datalist id="inv-groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>
          </label>
          <label className="field"><span>Xodimga xabar (ixtiyoriy)</span><textarea rows={2} value={izoh} onChange={(e) => setIzoh(e.target.value)} placeholder="Masalan: Anketani 3 kun ichida to'ldiring" /></label>
          {err && <div className="err">{err}</div>}
          <div className="actions">
            <button type="button" className="btn ghost" onClick={onClose}>Bekor qilish</button>
            <button type="submit" className="btn primary" disabled={busy}>{busy ? '…' : 'Havola yaratish'}</button>
          </div>
        </form>
      )}
    </Modal>
  )
}
