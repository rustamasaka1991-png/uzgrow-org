import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { FilesPanel } from '../components/FilesPanel'
import { ANKETA } from '../data/seed'
import { api, type Fayl, type FaylTuri, type ToldirishInfo } from '../data/supabase'
import type { Timeline } from '../data/types'
import { RASM_SONI, fotoVaKichik, keyLabel } from '../lib/util'

const FILE_KEYS = new Set(['pasport_old', 'pasport_orqa', 'rasmlar'])

/**
 * Bir martalik "chala joylar" havolasi: faqat HR belgilagan to'ldirilmagan maydonlar ko'rinadi
 * (savollar, asosiy rasm, pasport, qo'shimcha rasmlar). Yuborilgach havola yopiladi.
 */
export function Toldirish() {
  const { token = '' } = useParams()
  const [info, setInfo] = useState<ToldirishInfo | null>(null)
  const [vals, setVals] = useState<Record<string, unknown>>({})
  const [files, setFiles] = useState<Fayl[]>([])
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const loadFiles = useCallback(() => api.toldirishFiles(token).then(setFiles).catch(() => setFiles([])), [token])
  useEffect(() => {
    let alive = true
    api.toldirishInfo(token).then((r) => {
      if (!alive) return
      setInfo(r)
      if (r.ok) {
        const v: Record<string, unknown> = {}
        for (const k of r.maydonlar) {
          if (FILE_KEYS.has(k)) continue
          const cur = r.qiymatlar[k]
          v[k] = k === 'talim' || k === 'mehnat' ? (Array.isArray(cur) && cur.length ? cur : [{ yil: '', joy: '' }]) : (cur ?? '')
        }
        setVals(v)
        if (r.maydonlar.some((k) => FILE_KEYS.has(k))) void loadFiles()
      }
    }).catch((e) => { if (alive) setInfo({ ok: false, xato: String(e.message ?? e) }) })
    return () => { alive = false }
  }, [token, loadFiles])

  if (!info) return <div className="center"><div className="spinner" /> Havola tekshirilmoqda…</div>
  if (!info.ok) return <div className="login"><h1>Havola ishlamaydi</h1><p className="sub">{info.xato}</p></div>
  if (done) return <div className="done"><div className="big-ok">✅</div><h1>Rahmat, {info.ism}!</h1><p className="sub">Ma'lumotlar saqlandi. Bu havola endi yopildi.</p></div>

  const textKeys = info.maydonlar.filter((k) => !FILE_KEYS.has(k))
  const fileKeys = info.maydonlar.filter((k) => FILE_KEYS.has(k))
  const needGallery = fileKeys.includes('rasmlar')

  const label = (k: string) => {
    if (k === 'foto') return 'Asosiy rasm'
    const [sec, q] = k.split('.')
    const s = ANKETA[sec as keyof typeof ANKETA]
    if (!s) return k
    if (!q) return s.nom
    return s.turi === 'qa' ? (s.savollar.find(([x]) => x === q)?.[1] ?? q) : k
  }
  const setRow = (k: string, i: number, p: Partial<Timeline>) => setVals((v) => ({ ...v, [k]: (v[k] as Timeline[]).map((r, j) => (j === i ? { ...r, ...p } : r)) }))
  const rows = (k: string) => (vals[k] as Timeline[]) ?? []

  async function upload(turi: FaylTuri, idx: number, data: string) {
    const r = await api.toldirishFileSave(token, turi, idx, data)
    if (!r.ok) throw new Error(r.xato)
    await loadFiles()
  }
  async function del(f: Fayl) {
    const r = await api.toldirishFileDelete(token, f.id)
    if (!r.ok) throw new Error(r.xato)
    await loadFiles()
  }

  function missing(): string[] {
    const m: string[] = []
    for (const k of textKeys) {
      const v = vals[k]
      if (k === 'talim' || k === 'mehnat') { if (!(v as Timeline[]).some((r) => r.yil?.trim() && r.joy?.trim())) m.push(label(k)) }
      else if (!String(v ?? '').trim()) m.push(label(k))
    }
    if (fileKeys.includes('pasport_old') && !files.some((f) => f.turi === 'pasport_old')) m.push('Pasport (old)')
    if (fileKeys.includes('pasport_orqa') && !files.some((f) => f.turi === 'pasport_orqa')) m.push('Pasport (orqa)')
    if (needGallery) { const n = files.filter((f) => f.turi === 'rasm').length; if (n < RASM_SONI) m.push(`Qo'shimcha rasmlar (${n}/${RASM_SONI})`) }
    return m
  }
  async function submit(ev: FormEvent) {
    ev.preventDefault()
    const m = missing()
    if (m.length) { setErr(`${m.length} ta joy hali bo'sh: ${m.join(', ')}`); return }
    setBusy(true); setErr('')
    try {
      const out: Record<string, unknown> = {}
      for (const k of textKeys) {
        const v = vals[k]
        if (k.includes('.')) { const [s, q] = k.split('.'); out[s] = { ...((out[s] as Record<string, unknown>) ?? {}), [q]: String(v ?? '').trim() } }
        else if (k === 'talim' || k === 'mehnat') out[k] = (v as Timeline[]).map((r) => ({ yil: r.yil.trim(), joy: r.joy.trim(), ...(r.izoh?.trim() ? { izoh: r.izoh.trim() } : {}) })).filter((r) => r.yil || r.joy)
        else out[k] = v
      }
      if (vals.foto_kichik) out.foto_kichik = vals.foto_kichik
      const r = await api.toldirishYuborish(token, out)
      if (!r.ok) { setErr(r.xato); return }
      setDone(true); window.scrollTo(0, 0)
    } catch (e) { setErr(String((e as Error).message ?? e)) } finally { setBusy(false) }
  }

  const groups: Record<string, string[]> = {}
  for (const k of textKeys) (groups[k.split('.')[0]] ??= []).push(k)

  return (
    <form className="aform" onSubmit={submit} noValidate>
      <div className="intro">
        <h1>{info.ism}, anketangizni to'ldiring</h1>
        <p className="sub">HR anketangizda {info.maydonlar.length} ta to'ldirilmagan joy topdi. Faqat shular ko'rsatilgan — hammasini to'ldirib "Yuborish" bosing. Havola bir marta ishlaydi.</p>
      </div>
      {Object.entries(groups).map(([sec, keys]) => (
        <section className="sec" key={sec}>
          <summary><span className="tt">{sec === 'foto' ? 'Asosiy rasm' : (ANKETA[sec as keyof typeof ANKETA]?.nom ?? sec)}</span></summary>
          <div className="qgrid">
            {keys.map((k) => {
              if (k === 'foto') return (
                <div className="photo-row" key={k}>
                  <Avatar e={{ ism: info.ok ? info.ism : '?', foto: String(vals.foto ?? '') }} size="lg" />
                  <label className="btn primary">Rasm yuklash *<input type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const r = await fotoVaKichik(f); setVals((v) => ({ ...v, ...r })) } catch (ex) { setErr(String(ex)) } }} /></label>
                </div>
              )
              if (k === 'talim' || k === 'mehnat') return (
                <div className="tl-edit" key={k}>
                  <div className="note">{k === 'talim' ? "Maktab, kollej, universitet — yillari bilan" : "Qayerda, kim bo'lib, qachon ishlagansiz"}</div>
                  {rows(k).map((r, i) => (
                    <div className="tl-row" key={i}>
                      <input placeholder="Yillar" value={r.yil} onChange={(e) => setRow(k, i, { yil: e.target.value })} />
                      <input placeholder={k === 'talim' ? 'Muassasa' : 'Tashkilot, lavozim'} value={r.joy} onChange={(e) => setRow(k, i, { joy: e.target.value })} />
                      <input placeholder="Izoh" value={r.izoh ?? ''} onChange={(e) => setRow(k, i, { izoh: e.target.value })} />
                      <button type="button" className="icon-btn" disabled={rows(k).length <= 1} onClick={() => setVals((v) => ({ ...v, [k]: rows(k).filter((_, j) => j !== i) }))}>✕</button>
                    </div>
                  ))}
                  <div><button type="button" className="btn ghost" onClick={() => setVals((v) => ({ ...v, [k]: [...rows(k), { yil: '', joy: '' }] }))}>+ Qator</button></div>
                </div>
              )
              return (
                <div className="q" key={k}>
                  <span className="i">•</span>
                  <span className="t">{label(k)} *</span>
                  <textarea rows={2} value={String(vals[k] ?? '')} onChange={(e) => setVals((v) => ({ ...v, [k]: e.target.value }))} />
                </div>
              )
            })}
          </div>
        </section>
      ))}
      {fileKeys.length > 0 && (
        <section className="sec">
          <summary><span className="tt">Pasport va rasmlar</span></summary>
          <div className="note">{fileKeys.map(keyLabel).join(' · ')}. Rasm bosilganda darhol saqlanadi.</div>
          <FilesPanel files={files} canEdit onUpload={upload} onDelete={del} requiredSides={{ old: fileKeys.includes('pasport_old'), orqa: fileKeys.includes('pasport_orqa') }} requiredGallery={needGallery} />
        </section>
      )}
      <div className="submit">
        {err && <span className="err">{err}</span>}
        <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Yuborilmoqda…' : 'Yuborish →'}</button>
      </div>
    </form>
  )
}
