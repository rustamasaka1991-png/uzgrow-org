import { Link } from 'react-router-dom'
import { useOrg } from '../data/store'
import type { Employee } from '../data/types'
import { Avatar } from './Avatar'

export function TreeNode({ e, top }: { e: Employee; top?: boolean }) {
  const { kids } = useOrg()
  const ch = kids(e.id).filter((c) => c.bolim === e.bolim)
  const solo = ch.filter((c) => !c.guruh)
  const groups: Record<string, Employee[]> = {}
  for (const c of ch) if (c.guruh) (groups[c.guruh] ??= []).push(c)
  return (
    <div className="tn">
      <Link className={`node${top ? ' top' : ''}`} to={`/x/${e.id}`}>
        <Avatar e={e} size="sm" />
        <div><div className="n">{e.ism}</div><div className="r">{e.lavozim}</div></div>
      </Link>
      {solo.length > 0 && (
        <div className={`kids${solo.length > 1 ? ' many' : ''}`}>
          {solo.map((c) => <TreeNode key={c.id} e={c} />)}
        </div>
      )}
      {Object.entries(groups).map(([g, arr]) => (
        <div key={g} className="group-wrap">
          <div className="stem" />
          <div className="kids grid">
            <div className="glabel">{g} ({arr.length} ta)</div>
            {arr.map((c) => <TreeNode key={c.id} e={c} />)}
          </div>
        </div>
      ))}
    </div>
  )
}
