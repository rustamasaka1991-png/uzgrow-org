import type { Employee } from '../data/types'
import { initials } from '../lib/util'

/** Ro'yxatlarda 96px kichik nusxa (tez), katta avatarda to'liq rasm (bo'lsa). */
export function Avatar({ e, size = '' }: { e: Pick<Employee, 'ism' | 'foto'> & { foto_kichik?: string }; size?: '' | 'sm' | 'lg' }) {
  const src = size === 'lg' ? (e.foto || e.foto_kichik) : (e.foto_kichik || e.foto)
  return (
    <span className={`av ${size}`}>
      {src ? <img src={src} alt="" /> : initials(e.ism || '?')}
    </span>
  )
}
