import { useState, type FormEvent } from 'react'
import { Avatar } from '../components/Avatar'
import { ANKETA, emptyEmployee } from '../data/seed'
import { api } from '../data/supabase'
import type { Employee, QAKey, TimeKey, Timeline } from '../data/types'
import { fileToDataUrl } from '../lib/util'

/** Ochiq anketa: bitta doimiy havola, HR ga yuboriladi. */
const QA_KEYS: QAKey[] = ['shaxsiy', 'oila', 'shaxsiyat', 'hobbi', 'maqsad']
const TIME_KEYS: TimeKey[] = ['talim', 'mehnat']
const ORDER: (QAKey | TimeKey)[] = ['shaxsiy', 'talim', 'mehnat', 'oila', 'shaxsiyat', 'hobbi', 'maqsad']
const ONE_LINE = new Set(['fish', 'tugilgan', 'telefon', 'millat', 'lavozim'])

export function AnketaForm() {
  const [e, setE] = useState<Employee>(() => emptyEmployee({ talim: [{ yil: '', joy: '' }], mehnat: [{ yil: '', joy: '' }] }))
  const [hp, setHp] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const setQ = (k: QAKey, q: string, v: string) => setE((x) => ({ ...x, [k]: { ...x[k], [q]: v } }))
  const setRow = (k: TimeKey, i: number, p: Partial<Timeline>) => setE((x) => ({ ...x, [k]: x[k].map((r, j) => (j === i ? { ...r, ...p } : r)) }))
  const addRow = (k: TimeKey) => setE((x) => ({ ...x, [k]: [...x[k], { yil: '', joy: '' }] }))
  const delRow = (k: TimeKey, i: number) => setE((x) => ({ ...x, [k]: x[k].filter((_, j) => j !== i) }))

  async function onFile(f: File | undefined) {
    if (!f) return
    try { const foto = await fileToDataUrl(f); setE((x) => ({ ...x, foto })) } catch (ex) { setErr(String(ex)) }
  }

  const filledCount = QA_KEYS.reduce((a, k) => a + Object.values(e[k]).filter((v) => v.trim()).length, 0)
    + TIME_KEYS.reduce((a, k) => a + e[k].filter((r) => r.yil.trim() || r.joy.trim()).length, 0)

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    const ism = e.shaxsiy.fish.trim()
    if (!ism) { setErr("1-savol: to'liq ism-sharifingizni kiriting"); document.getElementById('s-shaxsiy')?.scrollIntoView({ behavior: 'smooth' }); return }
    if (!e.shaxsiy.telefon.trim()) { setErr("Telefon raqamingizni kiriting — HR siz bilan bog'lanishi uchun"); return }
    setBusy(true); setErr('')
    try {
      const clean = (k: TimeKey) => e[k].map((r) => ({ yil: r.yil.trim(), joy: r.joy.trim(), ...(r.izoh?.trim() ? { izoh: r.izoh.trim() } : {}) })).filter((r) => r.yil || r.joy)
      const r = await api.submitAnketa({
        ism, foto: e.foto, shaxsiy: e.shaxsiy, talim: clean('talim'), mehnat: clean('mehnat'),
        oila: e.oila, shaxsiyat: e.shaxsiyat, hobbi: e.hobbi, maqsad: e.maqsad, website: hp,
      })
      if (!r.ok) { setErr(r.xato); return }
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

  return (
    <form className="aform" onSubmit={submit}>
      <div className="intro">
        <h1>UZ-GROW xodim anketasi</h1>
        <p className="sub">Barcha savollarga iloji boricha to'liq javob bering. Yulduzcha (*) bilan belgilanganlar majburiy. Oxirida "Yuborish" tugmasini bosing — anketa HR bo'limiga tushadi.</p>
        <div className="photo-row">
          <Avatar e={{ ism: e.shaxsiy.fish || '?', foto: e.foto }} size="lg" />
          <div className="photo-actions">
            <label className="btn">Rasm yuklash<input type="file" accept="image/*" hidden onChange={(ev) => onFile(ev.target.files?.[0])} /></label>
            {e.foto && <button type="button" className="btn ghost" onClick={() => setE((x) => ({ ...x, foto: '' }))}>Olib tashlash</button>}
            <span className="note">Ixtiyoriy, lekin tavsiya etiladi</span>
          </div>
        </div>
      </div>

      {/* honeypot: odamlar ko'rmaydi, botlar to'ldiradi */}
      <label className="hp" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={hp} onChange={(ev) => setHp(ev.target.value)} /></label>

      {ORDER.map((k, i) => {
        const s = ANKETA[k]
        return (
          <section className="sec" id={`s-${k}`} key={k}>
            <summary><span className="num">{String(i + 1).padStart(2, '0')}</span><span className="tt">{s.nom}</span></summary>
            {s.turi === 'qa' ? (
              <div className="qgrid">
                {s.savollar.map(([q, t], j) => {
                  const req = k === 'shaxsiy' && (q === 'fish' || q === 'telefon')
                  return (
                    <div className="q" key={q}>
                      <span className="i">{j + 1}.</span>
                      <span className="t">{t}{req ? ' *' : ''}</span>
                      <textarea rows={ONE_LINE.has(q) ? 1 : 3} value={e[k as QAKey][q]} onChange={(ev) => setQ(k as QAKey, q, ev.target.value)}
                        placeholder={q === 'telefon' ? '+998 __ ___ __ __' : q === 'tugilgan' ? 'kun.oy.yil' : ''} />
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="tl-edit">
                <div className="note">{k === 'talim' ? "Maktab, kollej, universitet, kurslar — yillari bilan." : "Qayerda, kim bo'lib, qachon ishlagansiz — oxirgisidan boshlab."}</div>
                {e[k as TimeKey].map((r, j) => (
                  <div className="tl-row" key={j}>
                    <input placeholder="Yillar (2018–2021)" value={r.yil} onChange={(ev) => setRow(k as TimeKey, j, { yil: ev.target.value })} />
                    <input placeholder={k === 'talim' ? 'Muassasa, yo’nalish' : 'Tashkilot, lavozim'} value={r.joy} onChange={(ev) => setRow(k as TimeKey, j, { joy: ev.target.value })} />
                    <input placeholder="Izoh (ixtiyoriy)" value={r.izoh ?? ''} onChange={(ev) => setRow(k as TimeKey, j, { izoh: ev.target.value })} />
                    <button type="button" className="icon-btn" onClick={() => delRow(k as TimeKey, j)} aria-label="O'chirish">✕</button>
                  </div>
                ))}
                <div><button type="button" className="btn ghost" onClick={() => addRow(k as TimeKey)}>+ Qator qo'shish</button></div>
              </div>
            )}
          </section>
        )
      })}

      <div className="submit">
        <span className="note">To'ldirilgan: {filledCount} ta javob</span>
        {err && <span className="err">{err}</span>}
        <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Yuborilmoqda…' : 'Yuborish →'}</button>
      </div>
    </form>
  )
}
