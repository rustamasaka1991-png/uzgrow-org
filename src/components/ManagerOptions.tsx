import { useOrg } from '../data/store'
import type { Employee } from '../data/types'

/** "Bevosita rahbari" ro'yxati: xodimlar bo'limlar bo'yicha guruhlangan (CEO birinchi) */
export function ManagerOptions({ list }: { list: Employee[] }) {
  const { data, deptOf } = useOrg()
  const groups = [{ id: 'rahbariyat', nomi: 'Rahbariyat' }, ...data.bolimlar]
  const rest = list.filter((x) => !groups.some((g) => g.id === x.bolim))
  return (
    <>
      {groups.map((g) => {
        const xs = list.filter((x) => x.bolim === g.id)
        return xs.length ? <optgroup key={g.id} label={deptOf(g.id)?.nomi ?? g.nomi}>{xs.map((x) => <option key={x.id} value={x.id}>{x.ism} — {x.lavozim}</option>)}</optgroup> : null
      })}
      {rest.map((x) => <option key={x.id} value={x.id}>{x.ism} — {x.lavozim}</option>)}
    </>
  )
}
