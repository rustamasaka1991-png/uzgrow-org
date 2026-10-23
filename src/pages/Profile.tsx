import { useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Anketa } from '../components/Anketa'
import { Avatar } from '../components/Avatar'
import { EmployeeForm } from '../components/EmployeeForm'
import { copyText } from '../data/invites'
import { useOrg } from '../data/store'
import { linkTo, supabase } from '../data/supabase'
import { completeness, fileToDataUrl, filled } from '../lib/util'

export function Profile() {
  const { id = '' } = useParams()
  const { byId, tokens, deptOf, colorOf, updateEmployee, archiveEmployee, restoreEmployee, regenerateToken, kids, canEdit, sync } = useOrg()
  const nav = useNavigate()
  const [edit, setEdit] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const e = byId[id]
  if (!e && (sync === 'loading' || sync === 'saving')) return <div className="center"><div className="spinner" /> Yuklanmoqda…</div>
  if (!e) return <Navigate to="/" replace />
  const d = deptOf(e.bolim)
  const c = e.bolim === 'rahbariyat' ? 'var(--ceo)' : colorOf(e.bolim)
  const boss = byId[e.rahbar]
  const p = completeness(e)
  const sh = e.shaxsiy
  const C = 2 * Math.PI * 20
  const subs = kids(e.id)
  const token = tokens[e.id]
  const link = token ? linkTo(`/a/${token}`) : ''
  const facts: [string, string | undefined, string?][] = canEdit
    ? [
        ['Lavozimi', sh.lavozim || e.lavozim], ["Tug'ilgan sana", sh.tugilgan], ['Telefon', sh.telefon], ['Manzil', sh.manzil],
        ['Oilaviy holati', sh.oilaviy], ['Bevosita rahbari', boss?.ism, boss ? `/x/${boss.id}` : undefined],
      ]
    : [
        ['Lavozimi', e.lavozim], ["Bo'limi", d?.nomi ?? (e.bolim === 'rahbariyat' ? 'Rahbariyat' : undefined), d ? `/d/${d.id}` : undefined],
        ['Guruh', e.guruh], ['Bevosita rahbari', boss?.ism, boss ? `/x/${boss.id}` : undefined],
      ]

  async function onPhoto(f: File | undefined) {
    if (!f) return
    try { const foto = await fileToDataUrl(f); updateEmployee(e!.id, (x) => ({ ...x, foto })) } catch (err) { alert(String(err)) }
  }
  function remove() {
    const msg = subs.length
      ? `${e!.ism} arxivga (ishdan ketganlar) o'tkazilsinmi? Uning ${subs.length} ta xodimi ${boss ? boss.ism + 'ga' : 'yuqori darajaga'} o'tkaziladi. Anketa saqlanadi, keyin qaytarish mumkin.`
      : `${e!.ism} arxivga (ishdan ketganlar) o'tkazilsinmi? Anketa saqlanadi, keyin qaytarish mumkin.`
    if (!confirm(msg)) return
    const sabab = prompt('Sabab (ixtiyoriy): masalan "o’z xohishi bilan", "sinovdan o’tmadi"', '') ?? ''
    archiveEmployee(e!.id, sabab.trim())
    nav(d ? `/d/${d.id}` : '/')
  }
  async function copy() { setCopied(await copyText(link)); setTimeout(() => setCopied(false), 2000) }
  function regen() {
    if (confirm("Yangi havola yaratilsinmi? Eski havola ishlamay qoladi — xodimga yangisini yuborish kerak.")) regenerateToken(e!.id)
  }

  return (
    <div style={{ ['--c' as string]: c }}>
      <div className="crumbs no-print">
        <Link className="back" to="/">← Umumiy tuzilma</Link>
        {d && <Link className="back" to={`/d/${d.id}`}>{d.nomi}</Link>}
        {canEdit && (
          <>
            <span className="grow" />
            <button type="button" className="btn" onClick={() => window.print()}>Chop etish</button>
            <button type="button" className="btn" onClick={() => setEdit(true)}>Tahrirlash</button>
            {e.arxiv
              ? <button type="button" className="btn" onClick={() => { if (confirm(`${e.ism} tuzilmaga qaytarilsinmi?`)) restoreEmployee(e.id) }}>↩ Arxivdan qaytarish</button>
              : <button type="button" className="btn danger ghost" onClick={remove}>Ishdan ketdi (arxiv)</button>}
          </>
        )}
      </div>
      {e.arxiv && <div className="banner"><b>Arxivda (ishdan ketgan):</b> {e.arxiv.sana}{e.arxiv.sabab ? ` · ${e.arxiv.sabab}` : ''}. Tuzilmada ko'rinmaydi. <Link to="/boshqaruv/arxiv">Arxiv ro'yxati →</Link></div>}
      <div className="hero">
        <div className="band" />
        <div className="in">
          {canEdit ? (
            <>
              <button type="button" className="av-btn" onClick={() => fileRef.current?.click()} title="Rasm yuklash">
                <Avatar e={e} size="lg" /><span className="av-hint">Rasm</span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(ev) => { onPhoto(ev.target.files?.[0]); ev.target.value = '' }} />
            </>
          ) : <Avatar e={e} size="lg" />}
          <div className="who">
            <h2>{(canEdit && sh.fish) || e.ism}</h2>
            <div className="pos">{e.lavozim}{d ? ' · ' + d.nomi : e.bolim === 'rahbariyat' ? ' · Rahbariyat' : ''}{e.guruh ? ` · ${e.guruh}` : ''}</div>
          </div>
          {canEdit && (
            <div className="ring">
              <svg viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="none" stroke="var(--line)" strokeWidth="5" />
                <circle cx="24" cy="24" r="20" fill="none" stroke={c} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(C * p) / 100} ${C}`} transform="rotate(-90 24 24)" />
                <text x="24" y="28" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--fg)">{p}%</text>
              </svg>
              Anketa<br />to'ldirilgan
            </div>
          )}
        </div>
        <div className="facts">
          {facts.map(([k, v, href]) => (
            <div className="fact" key={k}>
              <div className="k">{k}</div>
              <div className="v">{filled(v) ? (href ? <Link to={href}>{v}</Link> : v) : <span style={{ color: 'var(--muted)' }}>—</span>}</div>
            </div>
          ))}
        </div>
        {subs.length > 0 && (
          <div className="subs">
            <span className="k">Qo'l ostidagilar:</span>
            {subs.map((s) => <Link key={s.id} to={`/x/${s.id}`} className="chip">{s.ism}</Link>)}
          </div>
        )}
        {canEdit && supabase && (
          <div className="subs no-print linkrow">
            <span className="k">Xodimning shaxsiy havolasi:</span>
            {token ? (
              <>
                <code className="link-code">{link}</code>
                <button type="button" className="btn" onClick={copy}>{copied ? 'Nusxalandi ✓' : 'Nusxalash'}</button>
                <button type="button" className="btn ghost" onClick={regen}>Yangi havola</button>
              </>
            ) : <span className="note">Havola hali yaratilmagan. <button type="button" className="btn ghost" onClick={() => regenerateToken(e.id)}>Yangi havola</button></span>}
          </div>
        )}
      </div>

      {canEdit ? (
        <Anketa e={e} mode="admin" save={(fn) => updateEmployee(e.id, fn)} />
      ) : (
        <div className="panel empty-box">Anketa ma'lumotlari faqat HR va rahbarga ko'rinadi.</div>
      )}

      {canEdit && edit && <EmployeeForm initial={e} onClose={() => setEdit(false)} />}
    </div>
  )
}
