import { useMemo, useState, type FormEvent } from 'react'
import { useOrg } from '../data/store'
import { emptyEmployee } from '../data/seed'
import type { Employee } from '../data/types'
import { fileToDataUrl, slug, uniqueId } from '../lib/util'
import { Avatar } from './Avatar'
import { GroupSelect } from './GroupSelect'
import { Modal } from './Modal'

type Props = { initial?: Employee; defaultDept?: string; onClose: () => void; onSaved?: (id: string) => void }

export function EmployeeForm({ initial, defaultDept, onClose, onSaved }: Props) {
  const { data, byId, managers, allIds, addEmployee, updateEmployee } = useOrg()
  const editing = !!initial
  const [ism, setIsm] = useState(initial?.ism ?? '')
  const [lavozim, setLavozim] = useState(initial?.lavozim ?? '')
  const [bolim, setBolim] = useState(initial?.bolim ?? defaultDept ?? data.bolimlar[0]?.id ?? '')
  const [rahbar, setRahbar] = useState(() => {
    if (initial) return initial.rahbar
    const dept = defaultDept ?? data.bolimlar[0]?.id ?? ''
    const head = data.xodimlar.find((x) => x.bolim === dept && (!byId[x.rahbar] || byId[x.rahbar].bolim !== dept))
    return head?.id ?? data.ceoId ?? ''
  })
  const [guruh, setGuruh] = useState(initial?.guruh ?? '')
  const [foto, setFoto] = useState(initial?.foto ?? '')
  const [rahbarBelgisi, setRahbarBelgisi] = useState(!!initial?.rahbar_belgisi)
  const [err, setErr] = useState('')

  // Rahbar sifatida faqat rahbarlar (CEO, bo'lim boshliqlari, qo'l ostida xodimi borlar);
  // o'zi va o'z qo'l ostidagilar chiqmaydi. Hozirgi rahbari ro'yxatda bo'lmasa ham saqlanadi.
  const candidates = useMemo(() => {
    const under = new Set<string>()
    if (initial) {
      const walk = (id: string) => { for (const x of data.xodimlar) if (x.rahbar === id && !under.has(x.id)) { under.add(x.id); walk(x.id) } }
      walk(initial.id)
    }
    const list = managers.filter((x) => x.id !== initial?.id && !under.has(x.id))
    const cur = initial && byId[initial.rahbar]
    if (cur && !list.some((x) => x.id === cur.id)) list.push(cur)
    return list
  }, [data.xodimlar, managers, byId, initial])

  // Bo'lim o'zgarganda rahbarni avtomatik taklif qilish
  const suggestBoss = (dept: string) => {
    const head = data.xodimlar.find((x) => x.bolim === dept && x.id !== initial?.id && (!byId[x.rahbar] || byId[x.rahbar].bolim !== dept))
    if (head) setRahbar(head.id)
    else if (data.ceoId && data.ceoId !== initial?.id) setRahbar(data.ceoId)
  }

  async function onFile(f: File | undefined) {
    if (!f) return
    try { setFoto(await fileToDataUrl(f)) } catch (e) { setErr(String(e)) }
  }

  function submit(ev: FormEvent) {
    ev.preventDefault()
    if (!ism.trim()) { setErr('Ism-sharif kiritilmagan'); return }
    if (!lavozim.trim()) { setErr('Lavozim kiritilmagan'); return }
    if (!bolim) { setErr("Bo'lim tanlanmagan"); return }
    const sinovSana = (old?: string) => (bolim === 'sinov' ? (old || new Date().toISOString().slice(0, 10)) : old)
    if (editing && initial) {
      updateEmployee(initial.id, (e) => ({ ...e, ism: ism.trim(), lavozim: lavozim.trim(), bolim, rahbar, guruh: guruh.trim(), foto,
        rahbar_belgisi: rahbarBelgisi || undefined, sinov_boshlandi: sinovSana(e.bolim === 'sinov' ? e.sinov_boshlandi : undefined),
        shaxsiy: { ...e.shaxsiy, lavozim: e.shaxsiy.lavozim === e.lavozim || !e.shaxsiy.lavozim ? lavozim.trim() : e.shaxsiy.lavozim } }))
      onSaved?.(initial.id)
    } else {
      const id = uniqueId(slug(ism), new Set(allIds))
      const e = emptyEmployee({ id, ism: ism.trim(), lavozim: lavozim.trim(), bolim, rahbar, guruh: guruh.trim(), foto, rahbar_belgisi: rahbarBelgisi || undefined, sinov_boshlandi: sinovSana() })
      e.shaxsiy.lavozim = lavozim.trim()
      addEmployee(e)
      onSaved?.(id)
    }
    onClose()
  }

  return (
    <Modal title={editing ? 'Xodimni tahrirlash' : "Yangi xodim qo'shish"} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <div className="photo-row">
          <Avatar e={{ ism: ism || '?', foto }} size="lg" />
          <div className="photo-actions">
            <label className="btn">
              Rasm yuklash
              <input type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
            {foto && <button type="button" className="btn ghost" onClick={() => setFoto('')}>Rasmni olib tashlash</button>}
          </div>
        </div>
        <label className="field"><span>Ism-sharif *</span><input value={ism} onChange={(e) => setIsm(e.target.value)} autoFocus placeholder="Masalan: Karimov Jasur" /></label>
        <label className="field"><span>Lavozim *</span><input value={lavozim} onChange={(e) => setLavozim(e.target.value)} placeholder="Masalan: Buxgalter" /></label>
        <div className="row2">
          <label className="field"><span>Bo'lim *</span>
            <select value={bolim} onChange={(e) => { setBolim(e.target.value); suggestBoss(e.target.value) }}>
              <option value="rahbariyat">Rahbariyat</option>
              {data.bolimlar.map((b) => <option key={b.id} value={b.id}>{b.nomi}</option>)}
            </select>
          </label>
          <label className="field"><span>Bevosita rahbari</span>
            <select value={rahbar} onChange={(e) => setRahbar(e.target.value)}>
              <option value="">— Yo'q (eng yuqori) —</option>
              {candidates.map((x) => <option key={x.id} value={x.id}>{x.ism} — {x.lavozim}</option>)}
            </select>
          </label>
        </div>
        <GroupSelect value={guruh} onChange={setGuruh} bolim={bolim} label="Guruh (ixtiyoriy — bir xil guruhdagilar daraxtda birga ko'rsatiladi)" />
        <label className="check"><input type="checkbox" checked={rahbarBelgisi} onChange={(e) => setRahbarBelgisi(e.target.checked)} /> Rahbar (boshqalarga "bevosita rahbar" sifatida tanlanadi)</label>
        {err && <div className="err">{err}</div>}
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>Bekor qilish</button>
          <button type="submit" className="btn primary">{editing ? 'Saqlash' : "Qo'shish"}</button>
        </div>
      </form>
    </Modal>
  )
}
