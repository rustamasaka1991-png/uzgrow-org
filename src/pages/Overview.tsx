import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { DeptForm } from '../components/DeptForm'
import { EmployeeForm } from '../components/EmployeeForm'
import { DeptIcon } from '../components/Icons'
import { OverviewSkeleton } from '../components/Skeleton'
import { useOrg } from '../data/store'
import { ESLATMA_KUN, oxirgiToliqZaxira } from '../lib/toliqZaxira'
import { completeness } from '../lib/util'

/** HR/rahbar: to'liq zaxira 7 kundan beri yuklab olinmagan bo'lsa eslatma */
function ZaxiraEslatma() {
  const [kun, setKun] = useState<number | null | undefined>(undefined)
  useEffect(() => { void oxirgiToliqZaxira().then((v) => setKun(v ? Math.floor((Date.now() - Date.parse(v)) / 86400000) : null)) }, [])
  if (kun === undefined || (kun !== null && kun < ESLATMA_KUN)) return null
  return (
    <div className="eslatma">
      <div className="grow"><b>To'liq zaxira {kun === null ? 'hali yuklab olinmagan' : `${kun} kundan beri yuklab olinmagan`}.</b> Rasmlar va anketalarni bazadan tashqarida ham saqlab qo'ying.</div>
      <Link className="btn" to="/boshqaruv/zaxira">Zaxiraga o'tish</Link>
    </div>
  )
}

export function Overview() {
  const { data, byId, headOf, ofDept, canEdit, sync } = useOrg()
  const nav = useNavigate()
  const [addDept, setAddDept] = useState(false)
  const [addEmp, setAddEmp] = useState(false)
  const ceo = data.xodimlar.find((e) => e.id === data.ceoId) ?? data.xodimlar.find((e) => !e.rahbar) ?? (byId[data.ceoId] && !byId[data.ceoId].arxiv ? byId[data.ceoId] : undefined)
  const E = data.xodimlar
  const avg = E.length ? Math.round(E.reduce((a, e) => a + completeness(e), 0) / E.length) : 0
  const cols = Math.min(6, Math.max(1, data.bolimlar.length))

  return (
    <>
      <div className="titlebar">
        <div>
          <h1>Tashkiliy tuzilma</h1>
          <p className="sub">Bo'limni bosing — ichiga kirasiz. Xodimni bosing — uning anketasi ochiladi.</p>
        </div>
        {canEdit && (
          <div className="title-actions">
            <button type="button" className="btn" onClick={() => setAddDept(true)}>+ Bo'lim</button>
            <button type="button" className="btn primary" onClick={() => setAddEmp(true)}>+ Xodim</button>
          </div>
        )}
      </div>
      {canEdit && <ZaxiraEslatma />}
      {sync === 'loading' && !data.bolimlar.length ? <OverviewSkeleton /> : <>
      <div className="stats">
        <span className="chip"><b>{data.bolimlar.length}</b> bo'lim</span>
        <span className="chip"><b>{E.length}</b> xodim</span>
        {canEdit && <span className="chip">Anketa to'ldirilgan: <b>{avg}%</b></span>}
      </div>

      {ceo ? (
        <div className="lead">
          <Link className="boss" to={`/x/${ceo.id}`} style={{ ['--c' as string]: 'var(--brand)' }}>
            <Avatar e={ceo} /><div><div className="role">Ta'sischi (Uchreditel)</div><div className="name">{ceo.ism}</div></div>
          </Link>
          <div className="vline" />
          <Link className="boss ceo" to={`/x/${ceo.id}`} style={{ ['--c' as string]: 'var(--ceo)' }}>
            <Avatar e={ceo} /><div><div className="role">CEO / Bosh direktor</div><div className="name">{ceo.ism}</div></div>
          </Link>
          <div className="vline" />
        </div>
      ) : (
        <div className="panel empty-box">Rahbar belgilanmagan. "+ Xodim" orqali rahbarsiz xodim qo'shing — u eng yuqorida turadi.</div>
      )}

      {data.bolimlar.length === 0 ? (
        <div className="panel empty-box">Hali bo'lim yo'q. "+ Bo'lim" tugmasini bosing.</div>
      ) : (
        <div className="depts" style={{ ['--cols' as string]: cols }}>
          {data.bolimlar.map((d) => {
            const h = headOf(d.id)
            const n = ofDept(d.id).length
            return (
              <Link key={d.id} className="dept" style={{ ['--c' as string]: d.rang }} to={`/d/${d.id}`}>
                <div className="bar"><DeptIcon id={d.id} />{d.nomi.toUpperCase()}</div>
                <div className="body">
                  <div className="head">
                    {h && <Avatar e={h} />}
                    <div><div className="hn">{h?.ism || '—'}</div><div className="hr">{h?.lavozim || "Rahbar yo'q"}</div></div>
                  </div>
                  <div className="foot"><span><b>{n}</b> kishi</span><span>Kirish →</span></div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
      </>}

      {addDept && <DeptForm onClose={() => setAddDept(false)} onSaved={(id) => nav(`/d/${id}`)} />}
      {addEmp && <EmployeeForm onClose={() => setAddEmp(false)} onSaved={(id) => nav(`/x/${id}`)} />}
    </>
  )
}
