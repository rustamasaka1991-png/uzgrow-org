import { useState, type FormEvent } from 'react'
import { useOrg } from '../data/store'
import { PALETTE } from '../data/seed'
import type { Department } from '../data/types'
import { slug, uniqueId } from '../lib/util'
import { Modal } from './Modal'

export function DeptForm({ initial, onClose, onSaved }: { initial?: Department; onClose: () => void; onSaved?: (id: string) => void }) {
  const { data, addDepartment, updateDepartment } = useOrg()
  const [nomi, setNomi] = useState(initial?.nomi ?? '')
  const [rang, setRang] = useState(initial?.rang ?? PALETTE[data.bolimlar.length % PALETTE.length])
  const [vazifalar, setVazifalar] = useState((initial?.vazifalar ?? []).join('\n'))
  const [err, setErr] = useState('')

  function submit(ev: FormEvent) {
    ev.preventDefault()
    if (!nomi.trim()) { setErr("Bo'lim nomi kiritilmagan"); return }
    const list = vazifalar.split('\n').map((s) => s.trim()).filter(Boolean)
    if (initial) {
      updateDepartment(initial.id, (d) => ({ ...d, nomi: nomi.trim(), rang, vazifalar: list }))
      onSaved?.(initial.id)
    } else {
      const id = uniqueId(slug(nomi.replace(/bo'limi/i, '')), new Set([...data.bolimlar.map((b) => b.id), 'rahbariyat']))
      addDepartment({ id, nomi: nomi.trim(), rang, vazifalar: list })
      onSaved?.(id)
    }
    onClose()
  }

  return (
    <Modal title={initial ? "Bo'limni tahrirlash" : "Yangi bo'lim"} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label className="field"><span>Nomi *</span><input value={nomi} onChange={(e) => setNomi(e.target.value)} autoFocus placeholder="Masalan: Logistika bo'limi" /></label>
        <div className="field"><span>Rang</span>
          <div className="swatches">
            {PALETTE.map((c) => <button key={c} type="button" className={`sw${c === rang ? ' on' : ''}`} style={{ background: c }} onClick={() => setRang(c)} aria-label={c} />)}
            <input type="color" value={rang} onChange={(e) => setRang(e.target.value)} aria-label="Boshqa rang" />
          </div>
        </div>
        <label className="field"><span>Asosiy vazifalar (har biri alohida qatorda)</span>
          <textarea rows={6} value={vazifalar} onChange={(e) => setVazifalar(e.target.value)} placeholder={'Vazifa 1\nVazifa 2'} />
        </label>
        {err && <div className="err">{err}</div>}
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>Bekor qilish</button>
          <button type="submit" className="btn primary">Saqlash</button>
        </div>
      </form>
    </Modal>
  )
}
