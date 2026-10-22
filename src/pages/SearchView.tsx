import { Link, useSearchParams } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { useOrg } from '../data/store'
import { escapeRe } from '../lib/util'

function Mark({ text, re }: { text: string; re: RegExp }) {
  const parts = text.split(re)
  return <>{parts.map((p, i) => (i % 2 === 1 ? <mark key={i}>{p}</mark> : p))}</>
}

export function SearchView() {
  const [sp] = useSearchParams()
  const q = (sp.get('q') ?? '').trim()
  const { data, deptOf, colorOf } = useOrg()
  const re = new RegExp('(' + escapeRe(q) + ')', 'gi')
  const hits = q ? data.xodimlar.filter((e) => re.test([e.ism, e.lavozim, e.shaxsiy.fish, e.shaxsiy.telefon, e.guruh, deptOf(e.bolim)?.nomi ?? ''].join(' '))) : []
  return (
    <>
      <div className="crumbs"><Link className="back" to="/">← Umumiy tuzilma</Link></div>
      <h1>Qidiruv: “{q}”</h1>
      <p className="sub">{hits.length} ta natija</p>
      <div className="panel">
        <div className="list">
          {hits.length ? hits.map((e) => (
            <Link key={e.id} className="person" style={{ ['--c' as string]: colorOf(e.bolim) }} to={`/x/${e.id}`}>
              <Avatar e={e} />
              <div><div className="n"><Mark text={e.ism} re={re} /></div><div className="r"><Mark text={e.lavozim} re={re} /></div></div>
              <span className="fill">{deptOf(e.bolim)?.nomi || 'Rahbariyat'}</span>
            </Link>
          )) : <div className="empty-box">Hech kim topilmadi. Ism yoki lavozimni boshqacha yozib ko'ring.</div>}
        </div>
      </div>
    </>
  )
}
