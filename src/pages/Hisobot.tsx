import { Link, Navigate } from 'react-router-dom'
import { useArizalar } from '../data/arizalar'
import { useAuth } from '../data/auth'
import { useOrg } from '../data/store'
import { supabase } from '../data/supabase'
import { completeness, daysSince, score } from '../lib/util'

/** HR: qisqa hisobot — bo'limlar kesimida va sinov muddati */
export function Hisobot() {
  const { enabled, session, isAdmin } = useAuth()
  const { data, archived, byId } = useOrg()
  const { list } = useArizalar()
  if (enabled && (!session || !isAdmin)) return <Navigate to="/" replace />
  const E = data.xodimlar
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null)
  const rows = data.bolimlar.map((b) => {
    const ps = E.filter((e) => e.bolim === b.id)
    const scored = ps.map((e) => score(e)).filter((s) => s.any).map((s) => s.total)
    return { b, n: ps.length, fill: avg(ps.map(completeness)), ball: avg(scored), scored: scored.length, low: ps.filter((e) => { const s = score(e); return s.any && s.total < 60 }).length }
  })
  const sinov = E.filter((e) => e.bolim === 'sinov').map((e) => ({ e, kun: daysSince(e.sinov_boshlandi) })).sort((a, b) => (b.kun ?? -1) - (a.kun ?? -1))
  const noScore = E.filter((e) => !score(e).any && e.id !== data.ceoId)
  const yangi = list.filter((a) => a.holat === 'yangi').length
  const oy = new Date(); oy.setDate(oy.getDate() - 30)
  const oxirgiOy = list.filter((a) => new Date(a.created_at) > oy).length

  return (
    <>
      <div className="crumbs"><Link className="back" to="/">← Umumiy tuzilma</Link></div>
      <h1>Hisobot</h1>
      <p className="sub">Bugungi holat bo'yicha avtomatik hisoblangan ko'rsatkichlar.</p>
      <div className="stats">
        <span className="chip"><b>{E.length}</b> faol xodim</span>
        <span className="chip"><b>{archived.length}</b> arxivda</span>
        <span className="chip"><b>{sinov.length}</b> sinov muddatida</span>
        <span className="chip">Baholanmagan: <b>{noScore.length}</b></span>
        {supabase && <span className="chip">Anketalar: yangi <b>{yangi}</b>, oxirgi 30 kun <b>{oxirgiOy}</b></span>}
        <span className="chip">Anketa to'ldirilgan: <b>{avg(E.map(completeness)) ?? 0}%</b></span>
      </div>

      <div className="grid2">
        <section className="panel">
          <h3>Bo'limlar kesimida</h3>
          <table className="hist-t full">
            <thead><tr><th>Bo'lim</th><th>Xodim</th><th>Anketa</th><th>Baholangan</th><th>O'rtacha ball</th><th>60 dan past</th></tr></thead>
            <tbody>
              {rows.map(({ b, n, fill, ball, scored, low }) => (
                <tr key={b.id}>
                  <td><Link to={`/d/${b.id}`} style={{ color: b.rang, fontWeight: 600 }}>{b.nomi}</Link></td>
                  <td>{n}</td>
                  <td>{fill ?? '—'}{fill !== null ? '%' : ''}</td>
                  <td>{scored}/{n}</td>
                  <td><b>{ball ?? '—'}</b></td>
                  <td className={low ? 'err' : ''}>{low || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <div className="col">
          <section className="panel">
            <h3>Sinov muddati</h3>
            {!sinov.length ? <div className="empty-box">Sinovda hech kim yo'q</div> : (
              <div className="list">
                {sinov.map(({ e, kun }) => (
                  <Link key={e.id} className="person" to={`/x/${e.id}`}>
                    <div><div className="n">{e.ism}</div><div className="r">{e.lavozim}{byId[e.rahbar] ? ` · rahbar: ${byId[e.rahbar].ism}` : ''}</div></div>
                    <span className={`fill ${kun !== null && kun > 90 ? 'err' : ''}`}>{kun === null ? 'sana yo’q' : `${kun} kun`}{kun !== null && kun > 90 ? ' · muddat o’tdi' : ''}</span>
                  </Link>
                ))}
              </div>
            )}
            <p className="note">Sinov odatda 90 kun. 90 kundan oshganlar qizil bilan belgilanadi — xodim sahifasida "Tahrirlash" orqali doimiy bo'limga o'tkazing.</p>
          </section>
          <section className="panel">
            <h3>Hali baholanmaganlar ({noScore.length})</h3>
            {!noScore.length ? <div className="empty-box">Hamma baholangan</div> : (
              <div className="list">
                {noScore.slice(0, 30).map((e) => (
                  <Link key={e.id} className="person" to={`/x/${e.id}`}><div><div className="n">{e.ism}</div><div className="r">{e.lavozim}</div></div></Link>
                ))}
                {noScore.length > 30 && <div className="note">… va yana {noScore.length - 30} ta</div>}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
