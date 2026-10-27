import { useMemo, useState } from 'react'
import { useOrg } from '../data/store'

const YANGI = '__yangi__'

/** Guruh: mavjud guruhlardan tanlash yoki yangisini yozish. */
export function GroupSelect({ value, onChange, bolim, label = 'Guruh (ixtiyoriy)' }: { value: string; onChange: (v: string) => void; bolim?: string; label?: string }) {
  const { data, archived } = useOrg()
  const groups = useMemo(() => {
    const all = [...data.xodimlar, ...archived]
    const inDept = bolim ? all.filter((x) => x.bolim === bolim) : all
    const list = Array.from(new Set(inDept.map((x) => x.guruh).filter(Boolean)))
    // boshqa bo'limlardagi guruhlar oxirida
    for (const g of Array.from(new Set(all.map((x) => x.guruh).filter(Boolean)))) if (!list.includes(g)) list.push(g)
    return list
  }, [data.xodimlar, archived, bolim])
  const [custom, setCustom] = useState(() => !!value && !groups.includes(value))
  const selectValue = custom ? YANGI : value
  return (
    <label className="field"><span>{label}</span>
      <select value={selectValue} onChange={(e) => { const v = e.target.value; if (v === YANGI) { setCustom(true); onChange('') } else { setCustom(false); onChange(v) } }}>
        <option value="">— Guruhsiz —</option>
        {groups.map((g) => <option key={g} value={g}>{g}</option>)}
        <option value={YANGI}>+ Yangi guruh…</option>
      </select>
      {custom && <input autoFocus value={value} onChange={(e) => onChange(e.target.value)} placeholder="Yangi guruh nomi, masalan: Call operatorlar" style={{ marginTop: 6 }} />}
    </label>
  )
}
