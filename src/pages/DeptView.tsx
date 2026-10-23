import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { DeptForm } from '../components/DeptForm'
import { EmployeeForm } from '../components/EmployeeForm'
import { DeptIcon } from '../components/Icons'
import { TreeNode } from '../components/Tree'
import { useOrg } from '../data/store'
import { completeness } from '../lib/util'

export function DeptView() {
  const { id = '' } = useParams()
  const { data, deptOf, ofDept, headOf, byId, deleteDepartment, canEdit } = useOrg()
  const nav = useNavigate()
  const [edit, setEdit] = useState(false)
  const [addEmp, setAddEmp] = useState(false)
  const d = deptOf(id)
  if (!d) return <Navigate to="/" replace />
  const ps = ofDept(id)
  const h = headOf(id)
  const boss = h ? byId[h.rahbar] : undefined
  const roots = ps.filter((e) => !byId[e.rahbar] || byId[e.rahbar].bolim !== id)

  function remove() {
    if (ps.length) { alert("Bo'limda xodimlar bor. Avval ularni boshqa bo'limga o'tkazing yoki o'chiring."); return }
    if (confirm(`"${d!.nomi}" bo'limi o'chirilsinmi?`)) { deleteDepartment(id); nav('/') }
  }

  return (
    <div style={{ ['--c' as string]: d.rang }}>
      <div className="crumbs"><Link className="back" to="/">← Umumiy tuzilma</Link></div>
      <div className="tabs">
        {data.bolimlar.map((x) => (
          <Link key={x.id} className="tab" style={{ ['--c' as string]: x.rang }} to={`/d/${x.id}`} aria-current={x.id === id ? 'true' : undefined}>
            {x.nomi.replace(" bo'limi", '')}
          </Link>
        ))}
      </div>
      <div className="dhead">
        <div className="ic"><DeptIcon id={id} /></div>
        <div className="grow">
          <h2>{d.nomi}</h2>
          <p>{ps.length} kishi{boss ? ` · ${boss.ism}ga bo'ysunadi` : ''}</p>
        </div>
        {canEdit && (
          <div className="title-actions">
            <button type="button" className="btn" onClick={() => setEdit(true)}>Tahrirlash</button>
            <button type="button" className="btn danger ghost" onClick={remove}>O'chirish</button>
            <Link className="btn" to="/arizalar">📋 Anketalar</Link>
            <button type="button" className="btn primary" onClick={() => setAddEmp(true)}>+ Xodim</button>
          </div>
        )}
      </div>
      <div className="grid2">
        <section className="panel">
          <h3>Bo'lim tuzilmasi</h3>
          <div className={`tree${roots.length > 1 ? ' multi' : ''}`}>
            {roots.length ? roots.map((r) => <TreeNode key={r.id} e={r} top />) : <div className="empty-box">Xodim yo'q</div>}
          </div>
        </section>
        <div className="col">
          <section className="panel">
            <h3>{canEdit ? 'Xodimlar va anketalar' : 'Xodimlar'}</h3>
            <div className="list">
              {ps.map((e) => {
                const p = completeness(e)
                return (
                  <Link key={e.id} className="person" to={`/x/${e.id}`}>
                    <Avatar e={e} />
                    <div><div className="n">{e.ism}</div><div className="r">{e.lavozim}</div></div>
                    {canEdit && <span className="fill" title="Anketa to'ldirilganligi"><i><b style={{ width: `${p}%` }} /></i>{p}%</span>}
                  </Link>
                )
              })}
              {!ps.length && <div className="empty-box">Hali xodim qo'shilmagan</div>}
            </div>
          </section>
          <section className="panel">
            <h3>Asosiy vazifalar</h3>
            {d.vazifalar.length ? <ul className="duties">{d.vazifalar.map((x, i) => <li key={i}>{x}</li>)}</ul> : <div className="empty-box">{canEdit ? 'Vazifalar kiritilmagan — "Tahrirlash" orqali qo’shing' : 'Vazifalar kiritilmagan'}</div>}
          </section>
        </div>
      </div>
      {canEdit && edit && <DeptForm initial={d} onClose={() => setEdit(false)} />}
      {canEdit && addEmp && <EmployeeForm defaultDept={id} onClose={() => setAddEmp(false)} onSaved={(xid) => nav(`/x/${xid}`)} />}
    </div>
  )
}
