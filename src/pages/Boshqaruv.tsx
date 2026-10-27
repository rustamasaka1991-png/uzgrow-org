import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { useAuth } from '../data/auth'
import { useOrg } from '../data/store'
import { supabase } from '../data/supabase'
import { download } from '../lib/util'

type Tab = 'tarix' | 'zaxira' | 'arxiv'
const fmt = (s: string) => new Date(s).toLocaleString('uz', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/** HR: o'zgarishlar tarixi, zaxiralar, arxiv (ishdan ketganlar) */
export function Boshqaruv() {
  const { tab = 'tarix' } = useParams<{ tab: Tab }>()
  const { enabled, session, isAdmin, loading } = useAuth()
  if (enabled && loading) return <div className="center"><div className="spinner" /> Yuklanmoqda…</div>
  if (enabled && (!session || !isAdmin)) return <Navigate to="/" replace />
  return (
    <>
      <div className="crumbs"><Link className="back" to="/">← Umumiy tuzilma</Link></div>
      <h1>Boshqaruv</h1>
      <p className="sub">O'zgarishlar tarixi, zaxira nusxalar va ishdan ketgan xodimlar arxivi.</p>
      <div className="tabs">
        <Link className="tab" to="/boshqaruv/tarix" aria-current={tab === 'tarix' ? 'true' : undefined}>O'zgarishlar tarixi</Link>
        <Link className="tab" to="/boshqaruv/zaxira" aria-current={tab === 'zaxira' ? 'true' : undefined}>Zaxiralar</Link>
        <Link className="tab" to="/boshqaruv/arxiv" aria-current={tab === 'arxiv' ? 'true' : undefined}>Arxiv (ishdan ketganlar)</Link>
      </div>
      {tab === 'tarix' && <Tarix />}
      {tab === 'zaxira' && <Zaxiralar />}
      {tab === 'arxiv' && <Arxiv />}
    </>
  )
}

/* ---------- O'zgarishlar tarixi ---------- */
type TarixRow = { id: number; vaqt: string; kim: string; jadval: string; amal: string; yozuv_id: string | null; eski: Record<string, unknown> | null; yangi: Record<string, unknown> | null }
const JADVAL: Record<string, string> = { xodimlar: 'Xodim', bolimlar: "Bo'lim", arizalar: 'Anketa', sozlamalar: 'Sozlama' }
const AMAL: Record<string, string> = { INSERT: "qo'shildi", UPDATE: "o'zgartirildi", DELETE: "o'chirildi" }
const MAYDON: Record<string, string> = {
  ism: 'ism', lavozim: 'lavozim', bolim: "bo'lim", rahbar: 'rahbar', guruh: 'guruh', shaxsiy: "shaxsiy ma'lumotlar", talim: "ta'lim", mehnat: 'mehnat faoliyati',
  oila: 'oila', shaxsiyat: 'shaxsiyat', hobbi: 'hobbi', maqsad: 'maqsadlar', baholash: 'baholash', baholash_tarixi: 'baholash tarixi', rivojlanish: 'rivojlanish rejasi',
  takliflar: 'takliflar', arxiv: 'arxiv holati', sinov_boshlandi: 'sinov sanasi', rahbar_belgisi: 'rahbar belgisi', nomi: 'nomi', rang: 'rang', vazifalar: 'vazifalar', holat: 'holat', xodim_id: 'xodim',
}
const SKIP = new Set(['updated_at', 'created_at', 'tartib', 'data', 'token', 'ip', 'foto', 'id'])
function changed(r: TarixRow): string {
  if (r.amal !== 'UPDATE') return ''
  const eo = (r.eski ?? {}) as Record<string, unknown>, yo = (r.yangi ?? {}) as Record<string, unknown>
  const e = (eo.data ?? {}) as Record<string, unknown>, y = (yo.data ?? {}) as Record<string, unknown>
  const keys = new Set([...Object.keys(e), ...Object.keys(y), ...Object.keys(eo), ...Object.keys(yo)])
  const diff = [...keys].filter((k) => !SKIP.has(k)).filter((k) => {
    const inData = k in e || k in y
    return inData ? JSON.stringify(e[k]) !== JSON.stringify(y[k]) : JSON.stringify(eo[k]) !== JSON.stringify(yo[k])
  }).map((k) => MAYDON[k] ?? k)
  if (!diff.length) return r.jadval === 'xodimlar' ? 'rasm yoki havola' : r.jadval === 'bolimlar' ? 'tartib' : ''
  return diff.join(', ')
}
function nameOf(r: TarixRow) {
  const d = (r.yangi?.data ?? r.eski?.data ?? {}) as Record<string, unknown>
  return String(d.ism ?? d.nomi ?? r.yozuv_id ?? '')
}
function Tarix() {
  const [rows, setRows] = useState<TarixRow[]>([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!supabase) return
    supabase.from('tarix').select('*').order('id', { ascending: false }).limit(300).then(({ data, error }) => {
      if (error) setErr(error.message); else setRows((data ?? []) as TarixRow[])
      setLoading(false)
    })
  }, [])
  if (!supabase) return <div className="panel empty-box">Faqat Supabase rejimida ishlaydi</div>
  return (
    <div className="panel">
      <h3>Oxirgi 300 ta o'zgarish (180 kun saqlanadi)</h3>
      {err && <div className="err">{err}</div>}
      {loading ? <div className="empty-box">Yuklanmoqda…</div> : !rows.length ? <div className="empty-box">Hali yozuv yo'q</div> : (
        <div className="tbl"><table className="hist-t full">
          <thead><tr><th>Vaqt</th><th>Kim</th><th>Nima</th><th>Amal</th><th>O'zgargan maydonlar</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="nowrap">{fmt(r.vaqt)}</td>
                <td>{r.kim}</td>
                <td>{JADVAL[r.jadval] ?? r.jadval}: <b>{nameOf(r)}</b></td>
                <td>{AMAL[r.amal] ?? r.amal}</td>
                <td className="note">{changed(r)}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
  )
}

/* ---------- Zaxiralar ---------- */
type ZaxiraRow = { id: number; vaqt: string; manba: string; data?: unknown }
function Zaxiralar() {
  const [rows, setRows] = useState<ZaxiraRow[]>([])
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const { replaceAll } = useOrg()
  const nav = useNavigate()
  const load = async () => {
    if (!supabase) return
    const { data, error } = await supabase.from('zaxiralar').select('id,vaqt,manba').order('id', { ascending: false })
    if (error) setErr(error.message); else setRows((data ?? []) as ZaxiraRow[])
  }
  useEffect(() => { void load() }, [])
  async function create() {
    if (!supabase) return
    setBusy(true)
    const { error } = await supabase.rpc('zaxira_ol')
    if (error) setErr(error.message)
    await load(); setBusy(false)
  }
  async function fetchOne(id: number) {
    if (!supabase) return null
    const { data, error } = await supabase.from('zaxiralar').select('data').eq('id', id).single()
    if (error) { setErr(error.message); return null }
    return data?.data
  }
  async function dl(r: ZaxiraRow) {
    const d = await fetchOne(r.id)
    if (d) download(`uzgrow-zaxira-${r.vaqt.slice(0, 10)}-${r.id}.json`, JSON.stringify(d, null, 2))
  }
  async function restore(r: ZaxiraRow) {
    if (!confirm(`${fmt(r.vaqt)} holatidagi zaxira tiklansinmi? Hozirgi barcha ma'lumotlar shu zaxira bilan almashtiriladi (bu amal ham tarixga yoziladi).`)) return
    const d = await fetchOne(r.id)
    if (d) { replaceAll(d); nav('/') }
  }
  if (!supabase) return <div className="panel empty-box">Faqat Supabase rejimida ishlaydi</div>
  return (
    <div className="panel">
      <div className="titlebar"><h3>Zaxira nusxalar</h3><button type="button" className="btn primary" onClick={create} disabled={busy}>{busy ? '…' : '+ Hozir zaxira olish'}</button></div>
      <p className="note">Har kuni soat 06:00 (Toshkent) da avtomatik olinadi, 30 kun saqlanadi. Yuklab olib Google Drive'ga ham qo'yib qo'ying.</p>
      {err && <div className="err">{err}</div>}
      <div className="list">
        {!rows.length && <div className="empty-box">Hali zaxira yo'q</div>}
        {rows.map((r) => (
          <div className="invite" key={r.id}>
            <div className="grow"><div className="n">{fmt(r.vaqt)}</div><div className="r">{r.manba === 'cron' ? 'Avtomatik' : r.manba === 'qolda' ? "Qo'lda" : r.manba} · #{r.id}</div></div>
            <button type="button" className="btn" onClick={() => dl(r)}>⬇ Yuklab olish</button>
            <button type="button" className="btn ghost danger" onClick={() => restore(r)}>↺ Tiklash</button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- Arxiv ---------- */
function Arxiv() {
  const { archived, restoreEmployee, deleteEmployee, deptOf } = useOrg()
  return (
    <div className="panel">
      <h3>Ishdan ketganlar ({archived.length})</h3>
      <p className="note">Arxivdagi xodim tuzilmada ko'rinmaydi, lekin anketasi saqlanadi. "Qaytarish" — yana tuzilmaga qo'shadi. "Butunlay o'chirish" qaytarib bo'lmaydi.</p>
      <div className="list">
        {!archived.length && <div className="empty-box">Arxiv bo'sh</div>}
        {archived.map((e) => (
          <div className="invite used" key={e.id}>
            <Avatar e={e} />
            <div className="grow">
              <div className="n">{e.ism}</div>
              <div className="r">{e.lavozim}{deptOf(e.bolim) ? ` · ${deptOf(e.bolim)!.nomi}` : ''} · ketgan: {e.arxiv?.sana}{e.arxiv?.sabab ? ` · ${e.arxiv.sabab}` : ''}</div>
            </div>
            <Link className="btn ghost" to={`/x/${e.id}`}>Anketa</Link>
            <button type="button" className="btn" onClick={() => { if (confirm(`${e.ism} tuzilmaga qaytarilsinmi?`)) restoreEmployee(e.id) }}>↩ Qaytarish</button>
            <button type="button" className="btn ghost danger" onClick={() => { if (confirm(`${e.ism} butunlay o'chirilsinmi? Qaytarib bo'lmaydi.`)) deleteEmployee(e.id) }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}
