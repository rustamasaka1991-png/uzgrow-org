import { useState, type FormEvent } from 'react'
import { SINOV_BOLIM } from '../data/seed'
import { useOrg } from '../data/store'
import type { Employee } from '../data/types'
import { daysSince } from '../lib/util'

/** Sinov muddatidagi xodim: necha kun o'tdi, doimiy bo'limga o'tkazish yoki arxiv */
export function SinovPanel({ e }: { e: Employee }) {
  const { data, managers, updateEmployee, archiveEmployee, headOf } = useOrg()
  const doimiy = data.bolimlar.filter((b) => b.id !== SINOV_BOLIM)
  const [bolim, setBolim] = useState(doimiy[0]?.id ?? '')
  const [rahbar, setRahbar] = useState(() => (doimiy[0] ? headOf(doimiy[0].id)?.id : '') || e.rahbar || data.ceoId)
  const [lavozim, setLavozim] = useState(e.lavozim)
  const kun = daysSince(e.sinov_boshlandi)
  const otdi = kun !== null && kun > 90

  function pickDept(id: string) {
    setBolim(id)
    const h = headOf(id)
    if (h && h.id !== e.id) setRahbar(h.id)
  }
  function move(ev: FormEvent) {
    ev.preventDefault()
    if (!bolim) return
    const nomi = data.bolimlar.find((b) => b.id === bolim)?.nomi ?? bolim
    if (!confirm(`${e.ism} "${nomi}" bo'limiga doimiy xodim sifatida o'tkazilsinmi?`)) return
    updateEmployee(e.id, (x) => { const { sinov_boshlandi: _s, ...rest } = x; return { ...rest, bolim, rahbar, lavozim: lavozim.trim() || x.lavozim, shaxsiy: { ...x.shaxsiy, lavozim: lavozim.trim() || x.shaxsiy.lavozim } } as Employee })
  }
  function fail() {
    if (!confirm(`${e.ism} sinovdan o'tmadi deb arxivga o'tkazilsinmi?`)) return
    archiveEmployee(e.id, "Sinov muddatidan o'tmadi")
  }

  return (
    <form className={`accept sinov${otdi ? ' warn' : ''}`} onSubmit={move}>
      <h3>⏳ Sinov muddatida{kun !== null ? ` — ${kun} kun` : ''}{otdi ? ' · 90 kun o’tdi, qaror qabul qiling' : ''}{e.sinov_boshlandi ? ` (boshlangan: ${e.sinov_boshlandi})` : ''}</h3>
      <div className="row2">
        <label className="field"><span>Doimiy bo'lim</span>
          <select value={bolim} onChange={(ev) => pickDept(ev.target.value)}>
            {doimiy.map((b) => <option key={b.id} value={b.id}>{b.nomi}</option>)}
          </select>
        </label>
        <label className="field"><span>Lavozim</span><input value={lavozim} onChange={(ev) => setLavozim(ev.target.value)} /></label>
      </div>
      <label className="field"><span>Bevosita rahbari</span>
        <select value={rahbar} onChange={(ev) => setRahbar(ev.target.value)}>
          <option value="">— Yo'q —</option>
          {managers.filter((m) => m.id !== e.id).map((x) => <option key={x.id} value={x.id}>{x.ism} — {x.lavozim}</option>)}
        </select>
      </label>
      <div className="actions">
        <button type="button" className="btn danger ghost" onClick={fail}>Sinovdan o'tmadi → arxiv</button>
        <button type="submit" className="btn primary" disabled={!bolim}>✓ Doimiy bo'limga o'tkazish</button>
      </div>
    </form>
  )
}
