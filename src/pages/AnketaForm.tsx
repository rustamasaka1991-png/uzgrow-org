import { useEffect, useState, type FormEvent } from 'react'
import { Avatar } from '../components/Avatar'
import { ANKETA, HOLATLAR, emptyEmployee } from '../data/seed'
import { api } from '../data/supabase'
import type { Employee, QAKey, Taklif, TimeKey, Timeline } from '../data/types'
import { fileToDataUrl, today } from '../lib/util'

/** Ochiq anketa: bitta doimiy havola, HR ga yuboriladi. Hamma savol majburiy. */
const QA_KEYS: QAKey[] = ['shaxsiy', 'oila', 'shaxsiyat', 'hobbi', 'maqsad', 'rivojlanish']
const TIME_KEYS: TimeKey[] = ['talim', 'mehnat']
const ORDER: (QAKey | TimeKey | 'takliflar')[] = ['shaxsiy', 'talim', 'mehnat', 'oila', 'shaxsiyat', 'hobbi', 'maqsad', 'rivojlanish', 'takliflar']
const ONE_LINE = new Set(['fish', 'tugilgan', 'telefon', 'millat', 'lavozim'])
const DRAFT_KEY = 'uzgrow-org:anketa-qoralama'

function loadDraft(): Employee | null {
  try { const s = localStorage.getItem(DRAFT_KEY); if (s) return emptyEmployee(JSON.parse(s)) } catch { /* ignore */ }
  return null
}
const newTaklif = (): Taklif => ({ id: `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, sana: today(), muammo: '', yechim: '', foyda: '', reja: '', natija: '', tasir: '', holat: HOLATLAR[0], ragbat: '' })

export function AnketaForm() {
  const [e, setE] = useState<Employee>(() => loadDraft() ?? emptyEmployee({ talim: [{ yil: '', joy: '' }], mehnat: [{ yil: '', joy: '' }] }))
  const [restored] = useState(() => !!loadDraft())
  const [hp, setHp] = useState('')
  const [err, setErr] = useState('')
  const [missing, setMissing] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(e)) } catch { /* ignore */ } }, 400)
    return () => window.clearTimeout(t)
  }, [e])
  const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ } }

  const setQ = (k: QAKey, q: string, v: string) => { setE((x) => ({ ...x, [k]: { ...x[k], [q]: v } })); if (missing.size) setMissing((m) => { const n = new Set(m); n.delete(`${k}.${q}`); return n }) }
  const setRow = (k: TimeKey, i: number, p: Partial<Timeline>) => setE((x) => ({ ...x, [k]: x[k].map((r, j) => (j === i ? { ...r, ...p } : r)) }))
  const addRow = (k: TimeKey) => setE((x) => ({ ...x, [k]: [...x[k], { yil: '', joy: '' }] }))
  const delRow = (k: TimeKey, i: number) => setE((x) => ({ ...x, [k]: x[k].filter((_, j) => j !== i) }))
  const setT = (i: number, p: Partial<Taklif>) => setE((x) => ({ ...x, takliflar: x.takliflar.map((t, j) => (j === i ? { ...t, ...p } : t)) }))

  async function onFile(f: File | undefined) {
    if (!f) return
    try { const foto = await fileToDataUrl(f); setE((x) => ({ ...x, foto })) } catch (ex) { setErr(String(ex)) }
  }

  const total = QA_KEYS.reduce((a, k) => a + (ANKETA[k].turi === 'qa' ? ANKETA[k].savollar.length : 0), 0) + 2
  const filledCount = QA_KEYS.reduce((a, k) => a + Object.values(e[k]).filter((v) => v.trim()).length, 0)
    + TIME_KEYS.reduce((a, k) => a + (e[k].some((r) => r.yil.trim() && r.joy.trim()) ? 1 : 0), 0)

  /** Bo'sh qolgan majburiy maydonlar: "bo'lim.savol" ko'rinishida */
  function findMissing(): string[] {
    const m: string[] = []
    for (const k of QA_KEYS) {
      const s = ANKETA[k]
      if (s.turi === 'qa') for (const [q] of s.savollar) if (!e[k][q]?.trim()) m.push(`${k}.${q}`)
    }
    for (const k of TIME_KEYS) if (!e[k].some((r) => r.yil.trim() && r.joy.trim())) m.push(`${k}.row`)
    return m
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    const miss = findMissing()
    if (miss.length) {
      setMissing(new Set(miss))
      const secs = Array.from(new Set(miss.map((x) => ANKETA[x.split('.')[0] as QAKey | TimeKey].nom)))
      setErr(`${miss.length} ta savol to'ldirilmagan: ${secs.join(', ')}. Hammasi majburiy.`)
      const first = miss[0].split('.')[0]
      document.getElementById(`s-${first}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    setBusy(true); setErr('')
    try {
      const clean = (k: TimeKey) => e[k].map((r) => ({ yil: r.yil.trim(), joy: r.joy.trim(), ...(r.izoh?.trim() ? { izoh: r.izoh.trim() } : {}) })).filter((r) => r.yil || r.joy)
      const takliflar = e.takliflar.filter((t) => t.muammo.trim())
      const r = await api.submitAnketa({
        ism: e.shaxsiy.fish.trim(), foto: e.foto, shaxsiy: e.shaxsiy, talim: clean('talim'), mehnat: clean('mehnat'),
        oila: e.oila, shaxsiyat: e.shaxsiyat, hobbi: e.hobbi, maqsad: e.maqsad, rivojlanish: e.rivojlanish, takliflar, website: hp,
      })
      if (!r.ok) { setErr(r.xato); return }
      clearDraft()
      setDone(true)
      window.scrollTo(0, 0)
    } catch (ex) { setErr(String((ex as Error).message ?? ex)) } finally { setBusy(false) }
  }

  if (done) {
    return (
      <div className="done">
        <div className="big-ok">✅</div>
        <h1>Rahmat, {e.shaxsiy.fish}!</h1>
        <p className="sub">Anketangiz HR bo'limiga yuborildi. HR ko'rib chiqib, siz bilan bog'lanadi.</p>
      </div>
    )
  }

  const sectionMissing = (k: string) => [...missing].filter((x) => x.startsWith(k + '.')).length

  return (
    <form className="aform" onSubmit={submit} noValidate>
      <div className="intro">
        <h1>UZ-GROW xodim anketasi</h1>
        <p className="sub">Barcha savollar majburiy — bo'sh qoldirib yuborib bo'lmaydi. Javoblaringiz shu brauzerda avtomatik saqlanib boradi, keyin davom ettirsangiz bo'ladi. Oxirida "Yuborish" — anketa HR bo'limiga tushadi.</p>
        {restored && (
          <div className="note" style={{ marginBottom: 10 }}>
            ↩ Avval boshlagan anketangiz tiklandi.{' '}
            <button type="button" className="btn ghost" onClick={() => { if (confirm("Hamma javoblar o'chirilib, bo'sh anketa ochilsinmi?")) { clearDraft(); location.reload() } }}>Boshidan boshlash</button>
          </div>
        )}
        <div className="photo-row">
          <Avatar e={{ ism: e.shaxsiy.fish || '?', foto: e.foto }} size="lg" />
          <div className="photo-actions">
            <label className="btn">Rasm yuklash<input type="file" accept="image/*" hidden onChange={(ev) => onFile(ev.target.files?.[0])} /></label>
            {e.foto && <button type="button" className="btn ghost" onClick={() => setE((x) => ({ ...x, foto: '' }))}>Olib tashlash</button>}
            <span className="note">Rasm ixtiyoriy — HR keyin ham yuklay oladi</span>
          </div>
        </div>
      </div>

      <label className="hp" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={hp} onChange={(ev) => setHp(ev.target.value)} /></label>

      {ORDER.map((k, i) => {
        const s = ANKETA[k]
        const sm = sectionMissing(k)
        return (
          <section className={`sec${sm ? ' has-missing' : ''}`} id={`s-${k}`} key={k}>
            <summary><span className="num">{String(i + 1).padStart(2, '0')}</span><span className="tt">{s.nom}</span>{sm > 0 && <span className="cnt err">{sm} ta bo'sh</span>}{k === 'takliflar' && <span className="cnt">ixtiyoriy</span>}</summary>
            {s.turi === 'qa' ? (
              <div className="qgrid">
                {s.savollar.map(([q, t], j) => {
                  const isMissing = missing.has(`${k}.${q}`)
                  return (
                    <div className={`q${isMissing ? ' missing' : ''}`} key={q}>
                      <span className="i">{j + 1}.</span>
                      <span className="t">{t} *</span>
                      <textarea rows={ONE_LINE.has(q) ? 1 : 3} value={e[k as QAKey][q]} onChange={(ev) => setQ(k as QAKey, q, ev.target.value)}
                        placeholder={q === 'telefon' ? '+998 __ ___ __ __' : q === 'tugilgan' ? 'kun.oy.yil' : ''} />
                    </div>
                  )
                })}
              </div>
            ) : s.turi === 'vaqt' ? (
              <div className={`tl-edit${missing.has(`${k}.row`) ? ' missing' : ''}`}>
                <div className="note">{k === 'talim' ? "Maktab, kollej, universitet, kurslar — yillari bilan. Kamida bitta qator *" : "Qayerda, kim bo'lib, qachon ishlagansiz — oxirgisidan boshlab. Kamida bitta qator * (ish tajribasi bo'lmasa: \"Yo'q\" deb yozing)"}</div>
                {e[k as TimeKey].map((r, j) => (
                  <div className="tl-row" key={j}>
                    <input placeholder="Yillar (2018–2021)" value={r.yil} onChange={(ev) => { setRow(k as TimeKey, j, { yil: ev.target.value }); if (missing.size) setMissing((m) => { const n = new Set(m); n.delete(`${k}.row`); return n }) }} />
                    <input placeholder={k === 'talim' ? 'Muassasa, yo’nalish' : 'Tashkilot, lavozim'} value={r.joy} onChange={(ev) => setRow(k as TimeKey, j, { joy: ev.target.value })} />
                    <input placeholder="Izoh (ixtiyoriy)" value={r.izoh ?? ''} onChange={(ev) => setRow(k as TimeKey, j, { izoh: ev.target.value })} />
                    <button type="button" className="icon-btn" onClick={() => delRow(k as TimeKey, j)} aria-label="O'chirish" disabled={e[k as TimeKey].length <= 1}>✕</button>
                  </div>
                ))}
                <div><button type="button" className="btn ghost" onClick={() => addRow(k as TimeKey)}>+ Qator qo'shish</button></div>
              </div>
            ) : (
              <div className="sugg">
                <div className="note">Ishni yaxshilash bo'yicha taklifingiz bo'lsa yozing (ixtiyoriy). HR ko'rib chiqadi va holatini belgilaydi.</div>
                {e.takliflar.map((t, j) => (
                  <div className="sg edit" key={t.id}>
                    <label className="field"><span>Muammo / taklif nomi</span><input value={t.muammo} onChange={(ev) => setT(j, { muammo: ev.target.value })} placeholder="Masalan: Ombor hisobini avtomatlashtirish" /></label>
                    <label className="field"><span>Yechim</span><textarea rows={2} value={t.yechim} onChange={(ev) => setT(j, { yechim: ev.target.value })} /></label>
                    <label className="field"><span>Kutilayotgan foyda</span><textarea rows={2} value={t.foyda} onChange={(ev) => setT(j, { foyda: ev.target.value })} /></label>
                    <div className="actions"><button type="button" className="btn ghost" onClick={() => setE((x) => ({ ...x, takliflar: x.takliflar.filter((_, i2) => i2 !== j) }))}>Olib tashlash</button></div>
                  </div>
                ))}
                <div><button type="button" className="btn ghost" onClick={() => setE((x) => ({ ...x, takliflar: [...x.takliflar, newTaklif()] }))}>+ Taklif qo'shish</button></div>
              </div>
            )}
          </section>
        )
      })}

      <div className="submit">
        <span className="note">To'ldirilgan: {filledCount} / {total}</span>
        {err && <span className="err">{err}</span>}
        <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Yuborilmoqda…' : 'Yuborish →'}</button>
      </div>
    </form>
  )
}
