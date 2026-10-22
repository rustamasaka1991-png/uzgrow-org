import { useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { EmployeeForm } from '../components/EmployeeForm'
import { QABlock, ScoreBlock, SuggBlock, TimelineBlock } from '../components/Sections'
import { useOrg } from '../data/store'
import { ANKETA, SECTION_ORDER } from '../data/seed'
import type { QAKey, SectionKey, TimeKey } from '../data/types'
import { completeness, fileToDataUrl, filled, score } from '../lib/util'

export function Profile() {
  const { id = '' } = useParams()
  const { byId, deptOf, colorOf, updateEmployee, deleteEmployee, kids } = useOrg()
  const nav = useNavigate()
  const [edit, setEdit] = useState(false)
  const [open, setOpen] = useState<Record<string, boolean>>({ shaxsiy: true, talim: true, mehnat: true, baholash: true })
  const fileRef = useRef<HTMLInputElement>(null)
  const e = byId[id]
  if (!e) return <Navigate to="/" replace />
  const d = deptOf(e.bolim)
  const c = e.bolim === 'rahbariyat' ? 'var(--ceo)' : colorOf(e.bolim)
  const boss = byId[e.rahbar]
  const p = completeness(e)
  const sh = e.shaxsiy
  const C = 2 * Math.PI * 20
  const sc = score(e)
  const facts: [string, string | undefined, string?][] = [
    ['Lavozimi', sh.lavozim || e.lavozim], ["Tug'ilgan sana", sh.tugilgan], ['Telefon', sh.telefon], ['Manzil', sh.manzil],
    ['Oilaviy holati', sh.oilaviy], ['Bevosita rahbari', boss?.ism, boss ? `/x/${boss.id}` : undefined],
  ]
  const subs = kids(e.id)

  async function onPhoto(f: File | undefined) {
    if (!f) return
    try { const foto = await fileToDataUrl(f); updateEmployee(e!.id, (x) => ({ ...x, foto })) } catch (err) { alert(String(err)) }
  }
  function remove() {
    const msg = subs.length
      ? `${e!.ism} o'chirilsinmi? Uning ${subs.length} ta xodimi ${boss ? boss.ism + 'ga' : 'yuqori darajaga'} o'tkaziladi.`
      : `${e!.ism} o'chirilsinmi?`
    if (confirm(msg)) { deleteEmployee(e!.id); nav(d ? `/d/${d.id}` : '/') }
  }
  const secCount = (k: SectionKey) => {
    const s = ANKETA[k]
    if (s.turi === 'qa') return `${s.savollar.filter(([q]) => filled(e[k as QAKey][q])).length}/${s.savollar.length}`
    if (s.turi === 'vaqt') return `${e[k as TimeKey].length} ta yozuv`
    if (s.turi === 'taklif') return `${e.takliflar.length} ta yozuv`
    return sc.any ? `${sc.total}/100 ball` : 'Baholanmagan'
  }
  const jump = (k: string) => {
    setOpen((o) => ({ ...o, [k]: true }))
    requestAnimationFrame(() => document.getElementById(`s-${k}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }))
  }

  return (
    <div style={{ ['--c' as string]: c }}>
      <div className="crumbs no-print">
        <Link className="back" to="/">← Umumiy tuzilma</Link>
        {d && <Link className="back" to={`/d/${d.id}`}>{d.nomi}</Link>}
        <span className="grow" />
        <button type="button" className="btn" onClick={() => window.print()}>Chop etish</button>
        <button type="button" className="btn" onClick={() => setEdit(true)}>Tahrirlash</button>
        <button type="button" className="btn danger ghost" onClick={remove}>O'chirish</button>
      </div>
      <div className="hero">
        <div className="band" />
        <div className="in">
          <button type="button" className="av-btn no-print-btn" onClick={() => fileRef.current?.click()} title="Rasm yuklash">
            <Avatar e={e} size="lg" /><span className="av-hint">Rasm</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(ev) => { onPhoto(ev.target.files?.[0]); ev.target.value = '' }} />
          <div className="who">
            <h2>{sh.fish || e.ism}</h2>
            <div className="pos">{e.lavozim}{d ? ' · ' + d.nomi : e.bolim === 'rahbariyat' ? ' · Rahbariyat' : ''}{e.guruh ? ` · ${e.guruh}` : ''}</div>
          </div>
          <div className="ring">
            <svg viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="var(--line)" strokeWidth="5" />
              <circle cx="24" cy="24" r="20" fill="none" stroke={c} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(C * p) / 100} ${C}`} transform="rotate(-90 24 24)" />
              <text x="24" y="28" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--fg)">{p}%</text>
            </svg>
            Anketa<br />to'ldirilgan
          </div>
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
      </div>

      <nav className="toc no-print">
        {SECTION_ORDER.map((k, i) => (
          <button type="button" key={k} onClick={() => jump(k)}>{String(i + 1).padStart(2, '0')} {ANKETA[k].nom}</button>
        ))}
      </nav>

      {SECTION_ORDER.map((k, i) => {
        const s = ANKETA[k]
        return (
          <details className="sec" id={`s-${k}`} key={k} open={!!open[k]} onToggle={(ev) => setOpen((o) => ({ ...o, [k]: (ev.target as HTMLDetailsElement).open }))}>
            <summary>
              <span className="num">{String(i + 1).padStart(2, '0')}</span>
              <span className="tt">{s.nom}</span>
              <span className="cnt">{secCount(k)}</span>
              <span className="chev">›</span>
            </summary>
            {s.turi === 'qa' && <QABlock e={e} k={k as QAKey} s={s} />}
            {s.turi === 'vaqt' && <TimelineBlock e={e} k={k as TimeKey} />}
            {s.turi === 'ball' && <ScoreBlock e={e} s={s} />}
            {s.turi === 'taklif' && <SuggBlock e={e} />}
          </details>
        )
      })}

      {edit && <EmployeeForm initial={e} onClose={() => setEdit(false)} />}
    </div>
  )
}
