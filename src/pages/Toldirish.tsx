import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { ANKETA } from '../data/seed'
import { api, type ToldirishInfo } from '../data/supabase'
import type { Timeline } from '../data/types'
import { fileToDataUrl } from '../lib/util'

/**
 * Bir martalik "chala joylar" havolasi: faqat HR belgilagan to'ldirilmagan maydonlar ko'rinadi.
 * Yuborilgach havola yopiladi.
 */
export function Toldirish() {
  const { token = '' } = useParams()
  const [info, setInfo] = useState<ToldirishInfo | null>(null)
  const [vals, setVals] = useState<Record<string, unknown>>({})
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let alive = true
    api.toldirishInfo(token).then((r) => {
      if (!alive) return
      setInfo(r)
      if (r.ok) {
        const v: Record<string, unknown> = {}
        for (const k of r.maydonlar) {
          const cur = r.qiymatlar[k]
          v[k] = k === 'talim' || k === 'mehnat' ? (Array.isArray(cur) && cur.length ? cur : [{ yil: '', joy: '' }]) : (cur ?? '')
        }
        setVals(v)
      }
    }).catch((e) => { if (alive) setInfo({ ok: false, xato: String(e.message ?? e) }) })
    return () => { alive = false }
  }, [token])

  if (!info) return <div className="center"><div className="spinner" /> Havola tekshirilmoqda…</div>
  if (!info.ok) return <div className="login"><h1>Havola ishlamaydi</h1><p className="sub">{info.xato}</p></div>
  if (done) return <div className="done"><div className="big-ok">✅</div><h1>Rahmat, {info.ism}!</h1><p className="sub">Ma'lumotlar saqlandi. Bu havola endi yopildi.</p></div>

  const label = (k: string) => {
    if (k === 'foto') return 'Rasm'
    const [sec, q] = k.split('.')
    const s = ANKETA[sec as keyof typeof ANKETA]
    if (!s) return k
    if (!q) return s.nom
    return s.turi === 'qa' ? (s.savollar.find(([x]) => x === q)?.[1] ?? q) : k
  }
  const setRow = (k: string, i: number, p: Partial<Timeline>) => setVals((v) => ({ ...v, [k]: (v[k] as Timeline[]).map((r, j) => (j === i ? { ...r, ...p } : r)) }))
  const rows = (k: string) => (vals[k] as Timeline[]) ?? []

  function missing(): string[] {
    return info!.ok ? info!.maydonlar.filter((k) => {
      const v = vals[k]
      if (k === 'talim' || k === 'mehnat') return !(v as Timeline[]).some((r) => r.yil?.trim() && r.joy?.trim())
      return !String(v ?? '').trim()
    }) : []
  }
  async function submit(ev: FormEvent) {
    ev.preventDefault()
    const m = missing()
    if (m.length) { setErr(`${m.length} ta maydon hali bo'sh: ${m.map(label).join(', ')}`); return }
    setBusy(true); setErr('')
    try {
      // "sec.q" → { sec: { q: v } } ko'rinishiga yig'amiz
      const out: Record<string, unknown> = {}
      for (const k of info!.ok ? info!.maydonlar : []) {
        const v = vals[k]
        if (k.includes('.')) { const [s, q] = k.split('.'); out[s] = { ...((out[s] as Record<string, unknown>) ?? {}), [q]: String(v ?? '').trim() } }
        else if (k === 'talim' || k === 'mehnat') out[k] = (v as Timeline[]).map((r) => ({ yil: r.yil.trim(), joy: r.joy.trim(), ...(r.izoh?.trim() ? { izoh: r.izoh.trim() } : {}) })).filter((r) => r.yil || r.joy)
        else out[k] = v
      }
      const r = await api.toldirishYuborish(token, out)
      if (!r.ok) { setErr(r.xato); return }
      setDone(true); window.scrollTo(0, 0)
    } catch (e) { setErr(String((e as Error).message ?? e)) } finally { setBusy(false) }
  }

  // Bo'limlar bo'yicha guruhlash
  const groups: Record<string, string[]> = {}
  for (const k of info.maydonlar) (groups[k.split('.')[0]] ??= []).push(k)

  return (
    <form className="aform" onSubmit={submit} noValidate>
      <div className="intro">
        <h1>{info.ism}, anketangizni to'ldiring</h1>
        <p className="sub">HR anketangizda {info.maydonlar.length} ta to'ldirilmagan joy topdi. Faqat shu savollar ko'rsatilgan — hammasini to'ldirib "Yuborish" bosing. Havola bir marta ishlaydi.</p>
      </div>
      {Object.entries(groups).map(([sec, keys]) => (
        <section className="sec" key={sec}>
          <summary><span className="tt">{sec === 'foto' ? 'Rasm' : (ANKETA[sec as keyof typeof ANKETA]?.nom ?? sec)}</span></summary>
          <div className="qgrid">
            {keys.map((k) => {
              if (k === 'foto') return (
                <div className="photo-row" key={k}>
                  <Avatar e={{ ism: info.ok ? info.ism : '?', foto: String(vals.foto ?? '') }} size="lg" />
                  <label className="btn">Rasm yuklash *<input type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) setVals((v) => ({ ...v, foto: '' })); if (f) { try { const d = await fileToDataUrl(f); setVals((v) => ({ ...v, foto: d })) } catch (ex) { setErr(String(ex)) } } }} /></label>
                </div>
              )
              if (k === 'talim' || k === 'mehnat') return (
                <div className="tl-edit" key={k}>
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
      <div className="submit">
        {err && <span className="err">{err}</span>}
        <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Yuborilmoqda…' : 'Yuborish →'}</button>
      </div>
    </form>
  )
}
