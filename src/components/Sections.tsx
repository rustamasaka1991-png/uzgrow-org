import { useState } from 'react'
import { useOrg } from '../data/store'
import { DARAJA, HOLATLAR } from '../data/seed'
import type { Baholash, Employee, QAKey, QASection, ScoreSection, Taklif, TimeKey, Timeline } from '../data/types'
import { filled, today } from '../lib/util'

const NONE = "To'ldirilmagan"

function EditBar({ editing, onEdit, onSave, onCancel }: { editing: boolean; onEdit: () => void; onSave: () => void; onCancel: () => void }) {
  return (
    <div className="editbar">
      {editing ? (
        <>
          <button type="button" className="btn ghost" onClick={onCancel}>Bekor</button>
          <button type="button" className="btn primary" onClick={onSave}>Saqlash</button>
        </>
      ) : (
        <button type="button" className="btn" onClick={onEdit}>✎ Tahrirlash</button>
      )}
    </div>
  )
}

/* ---------- Savol-javob bo'limi ---------- */
export function QABlock({ e, k, s }: { e: Employee; k: QAKey; s: QASection }) {
  const { updateEmployee } = useOrg()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const start = () => { setDraft({ ...e[k] }); setEditing(true) }
  const save = () => { updateEmployee(e.id, (x) => ({ ...x, [k]: { ...x[k], ...draft } })); setEditing(false) }
  return (
    <div className="qa">
      {s.savollar.map(([q, t], i) => (
        <div className="q" key={q}>
          <span className="i">{i + 1}.</span>
          <span className="t">{t}</span>
          {editing ? (
            <textarea className="a-in" rows={q === 'fish' || q === 'tugilgan' || q === 'telefon' || q === 'millat' ? 1 : 2}
              value={draft[q] ?? ''} onChange={(ev) => setDraft({ ...draft, [q]: ev.target.value })} />
          ) : (
            <div className={`a${filled(e[k][q]) ? '' : ' empty'}`}>{filled(e[k][q]) ? e[k][q] : NONE}</div>
          )}
        </div>
      ))}
      <EditBar editing={editing} onEdit={start} onSave={save} onCancel={() => setEditing(false)} />
    </div>
  )
}

/* ---------- Vaqt chizig'i (ta'lim / mehnat) ---------- */
export function TimelineBlock({ e, k }: { e: Employee; k: TimeKey }) {
  const { updateEmployee } = useOrg()
  const [editing, setEditing] = useState(false)
  const [rows, setRows] = useState<Timeline[]>([])
  const start = () => { setRows(e[k].length ? e[k].map((r) => ({ ...r })) : [{ yil: '', joy: '', izoh: '' }]); setEditing(true) }
  const save = () => {
    const clean = rows.map((r) => ({ yil: r.yil.trim(), joy: r.joy.trim(), ...(r.izoh?.trim() ? { izoh: r.izoh.trim() } : {}) })).filter((r) => r.yil || r.joy)
    updateEmployee(e.id, (x) => ({ ...x, [k]: clean })); setEditing(false)
  }
  const set = (i: number, p: Partial<Timeline>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...p } : r)))
  if (editing) {
    return (
      <div className="tl-edit">
        {rows.map((r, i) => (
          <div className="tl-row" key={i}>
            <input placeholder="Yillar (2018–2021)" value={r.yil} onChange={(ev) => set(i, { yil: ev.target.value })} />
            <input placeholder="Joy / muassasa / lavozim" value={r.joy} onChange={(ev) => set(i, { joy: ev.target.value })} />
            <input placeholder="Izoh (ixtiyoriy)" value={r.izoh ?? ''} onChange={(ev) => set(i, { izoh: ev.target.value })} />
            <button type="button" className="icon-btn" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="O'chirish">✕</button>
          </div>
        ))}
        <button type="button" className="btn ghost" onClick={() => setRows([...rows, { yil: '', joy: '', izoh: '' }])}>+ Qator qo'shish</button>
        <EditBar editing onEdit={start} onSave={save} onCancel={() => setEditing(false)} />
      </div>
    )
  }
  return (
    <div className="tl">
      {e[k].length ? e[k].map((r, i) => (
        <div className="row" key={i}>
          <div className="yr">{r.yil}</div><div className="dot" />
          <div className="tx">{r.joy}{r.izoh && <small>{r.izoh}</small>}</div>
        </div>
      )) : <div className="empty-box">{NONE}</div>}
      <EditBar editing={false} onEdit={start} onSave={() => {}} onCancel={() => {}} />
    </div>
  )
}

/* ---------- Baholash ---------- */
export function ScoreBlock({ e, s }: { e: Employee; s: ScoreSection }) {
  const { updateEmployee } = useOrg()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Baholash>(e.baholash)
  const b = editing ? draft : e.baholash
  const any = s.mezonlar.some(([q]) => filled(b[q]))
  const sc = s.mezonlar.reduce((a, [q]) => a + (Number(b[q]) || 0), 0)
  const [lv, c] = DARAJA(sc)
  const start = () => { setDraft({ ...e.baholash }); setEditing(true) }
  const save = () => { updateEmployee(e.id, (x) => ({ ...x, baholash: { ...draft } })); setEditing(false) }
  return (
    <div className="score">
      {editing ? (
        <label className="field"><span>Baholash davri</span><input value={draft.davr} onChange={(ev) => setDraft({ ...draft, davr: ev.target.value })} placeholder="Masalan: 2026 Q3" /></label>
      ) : b.davr ? <div className="note">Baholash davri: <b>{b.davr}</b></div> : null}
      {s.mezonlar.map(([q, t, max]) => (
        <div className="crit" key={q}>
          <span className="lb">{t}</span>
          {editing ? (
            <input className="pt-in" type="number" min={0} max={max} value={draft[q] ?? ''}
              onChange={(ev) => { const v = ev.target.value; setDraft({ ...draft, [q]: v === '' ? null : Math.max(0, Math.min(max, Number(v))) }) }} />
          ) : (
            <span className="pt">{filled(b[q]) ? b[q] : '—'}<small> / {max}</small></span>
          )}
          <span className="tr"><b style={{ width: `${((Number(b[q]) || 0) / max) * 100}%` }} /></span>
        </div>
      ))}
      <div className="total">
        <span className="big">{any ? sc : '—'}<small style={{ fontSize: 14, color: 'var(--muted)' }}> / 100</small></span>
        {any ? <span className="badge" style={{ background: c }}>{lv}</span> : <span className="note">Hali baholanmagan</span>}
      </div>
      {editing ? (
        <label className="field"><span>Izoh</span><textarea rows={2} value={draft.izoh} onChange={(ev) => setDraft({ ...draft, izoh: ev.target.value })} /></label>
      ) : b.izoh ? <div className="note">{b.izoh}</div> : null}
      <div className="note">Darajalar: 90–100 a'lo · 75–89 yaxshi · 60–74 yaxshilash kerak · 0–59 rivojlanish rejasi zarur. Baholovchi — bevosita rahbar; tasdiqlovchi — bo'lim rahbari; HR dalillarni tekshiradi.</div>
      <EditBar editing={editing} onEdit={start} onSave={save} onCancel={() => setEditing(false)} />
    </div>
  )
}

/* ---------- Takliflar ---------- */
const TFIELDS: [keyof Taklif, string][] = [['yechim', 'Yechim'], ['foyda', 'Kutilayotgan foyda'], ['reja', 'Amalga oshirish rejasi'], ['natija', 'Natija va dalil'], ['tasir', "Jamoaga ta'siri"], ['ragbat', "Rag'bat taklifi"]]
const emptyTaklif = (): Taklif => ({ id: `t${Date.now().toString(36)}`, sana: today(), muammo: '', yechim: '', foyda: '', reja: '', natija: '', tasir: '', holat: HOLATLAR[0], ragbat: '' })

export function SuggBlock({ e }: { e: Employee }) {
  const { updateEmployee } = useOrg()
  const [draft, setDraft] = useState<Taklif | null>(null)
  const save = () => {
    if (!draft || !draft.muammo.trim()) return
    updateEmployee(e.id, (x) => {
      const exists = x.takliflar.some((t) => t.id === draft.id)
      return { ...x, takliflar: exists ? x.takliflar.map((t) => (t.id === draft.id ? draft : t)) : [...x.takliflar, draft] }
    })
    setDraft(null)
  }
  const remove = (id: string) => { if (confirm("Taklif o'chirilsinmi?")) updateEmployee(e.id, (x) => ({ ...x, takliflar: x.takliflar.filter((t) => t.id !== id) })) }
  const setStatus = (id: string, holat: string) => updateEmployee(e.id, (x) => ({ ...x, takliflar: x.takliflar.map((t) => (t.id === id ? { ...t, holat } : t)) }))
  return (
    <div className="sugg">
      {e.takliflar.length ? e.takliflar.map((t) => (
        <div className="sg" key={t.id}>
          <div className="sg-head">
            <div><div className="hn">{t.muammo || 'Taklif'}</div>{t.sana && <div className="note">{t.sana}</div>}</div>
            <div className="sg-actions">
              <button type="button" className="icon-btn" onClick={() => setDraft({ ...t })} aria-label="Tahrirlash">✎</button>
              <button type="button" className="icon-btn" onClick={() => remove(t.id)} aria-label="O'chirish">✕</button>
            </div>
          </div>
          {TFIELDS.filter(([q]) => filled(t[q])).map(([q, l]) => <div key={q} style={{ marginTop: 6 }}><span className="note">{l}:</span> {t[q]}</div>)}
          <div className="steps">
            {HOLATLAR.map((hs) => <button type="button" key={hs} className={hs === t.holat ? 'on' : ''} onClick={() => setStatus(t.id, hs)}>{hs}</button>)}
          </div>
        </div>
      )) : <div className="empty-box">Hozircha taklif kiritilmagan</div>}
      {draft ? (
        <div className="sg edit">
          <label className="field"><span>Muammo / taklif nomi *</span><input autoFocus value={draft.muammo} onChange={(ev) => setDraft({ ...draft, muammo: ev.target.value })} /></label>
          <div className="row2">
            <label className="field"><span>Sana</span><input value={draft.sana} onChange={(ev) => setDraft({ ...draft, sana: ev.target.value })} /></label>
            <label className="field"><span>Holat</span>
              <select value={draft.holat} onChange={(ev) => setDraft({ ...draft, holat: ev.target.value })}>{HOLATLAR.map((h) => <option key={h}>{h}</option>)}</select>
            </label>
          </div>
          {TFIELDS.map(([q, l]) => (
            <label className="field" key={q}><span>{l}</span><textarea rows={2} value={draft[q]} onChange={(ev) => setDraft({ ...draft, [q]: ev.target.value })} /></label>
          ))}
          <div className="actions">
            <button type="button" className="btn ghost" onClick={() => setDraft(null)}>Bekor</button>
            <button type="button" className="btn primary" onClick={save} disabled={!draft.muammo.trim()}>Saqlash</button>
          </div>
        </div>
      ) : (
        <div className="editbar"><button type="button" className="btn" onClick={() => setDraft(emptyTaklif())}>+ Taklif qo'shish</button></div>
      )}
    </div>
  )
}
