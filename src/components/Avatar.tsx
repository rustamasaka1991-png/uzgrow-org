import type { Employee } from '../data/types'
import { initials } from '../lib/util'

export function Avatar({ e, size = '' }: { e: Pick<Employee, 'ism' | 'foto'>; size?: '' | 'sm' | 'lg' }) {
  return (
    <span className={`av ${size}`}>
      {e.foto ? <img src={e.foto} alt="" /> : initials(e.ism || '?')}
    </span>
  )
}
