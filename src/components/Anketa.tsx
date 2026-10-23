import { useState } from 'react'
import { useAuth } from '../data/auth'
import { ANKETA, SECTION_ORDER } from '../data/seed'
import type { Employee, QAKey, SectionKey, TimeKey } from '../data/types'
import { filled, score } from '../lib/util'
import { QABlock, ScoreBlock, SuggBlock, TimelineBlock, type Save } from './Sections'

/**
 * Anketaning 10 bo'limi.
 * mode='admin' — hamma bo'lim tahrirlanadi (HR).
 * mode='self'  — xodim o'zi: baholash va rivojlanish rejasi faqat o'qiladi, taklif holatini o'zgartira olmaydi.
 * mode='view'  — faqat ko'rish.
 */
export function Anketa({ e, mode, save }: { e: Employee; mode: 'admin' | 'self' | 'view'; save?: Save }) {
  const [open, setOpen] = useState<Record<string, boolean>>({ shaxsiy: true, talim: true, mehnat: true, baholash: true })
  const { email, rolNomi } = useAuth()
  const baholovchi = email ? `${rolNomi || 'Admin'} (${email})` : undefined
  const sc = score(e)
  const canEdit = (k: SectionKey) => mode === 'admin' || (mode === 'self' && k !== 'baholash' && k !== 'rivojlanish')
  const secCount = (k: SectionKey) => {
    const s = ANKETA[k]
    if (s.turi === 'qa') return `${s.savollar.filter(([q]) => filled(e[k as QAKey][q])).length}/${s.savollar.length}`
    if (s.turi === 'vaqt') return `${e[k as TimeKey].length} ta yozuv`
    if (s.turi === 'taklif') return `${e.takliflar.length} ta yozuv`
    return sc.any ? `${sc.total}/100 ball` : 'Baholanmagan'
  }
  const jump = (k: string) => {
    setOpen((o) => ({ ...o, [k]: true }))
    requestAnimationFrame(() => document.getElementById(`s-${k}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }))
  }
  return (
    <>
      <nav className="toc no-print">
        {SECTION_ORDER.map((k, i) => (
          <button type="button" key={k} onClick={() => jump(k)}>{String(i + 1).padStart(2, '0')} {ANKETA[k].nom}</button>
        ))}
      </nav>
      {SECTION_ORDER.map((k, i) => {
        const s = ANKETA[k]
        const sv = canEdit(k) ? save : undefined
        return (
          <details className="sec" id={`s-${k}`} key={k} open={!!open[k]} onToggle={(ev) => setOpen((o) => ({ ...o, [k]: (ev.target as HTMLDetailsElement).open }))}>
            <summary>
              <span className="num">{String(i + 1).padStart(2, '0')}</span>
              <span className="tt">{s.nom}</span>
              {mode === 'self' && !canEdit(k) && <span className="lock" title="Bu bo'limni rahbar / HR to'ldiradi">🔒 HR</span>}
              <span className="cnt">{secCount(k)}</span>
              <span className="chev">›</span>
            </summary>
            {s.turi === 'qa' && <QABlock e={e} k={k as QAKey} s={s} save={sv} />}
            {s.turi === 'vaqt' && <TimelineBlock e={e} k={k as TimeKey} save={sv} />}
            {s.turi === 'ball' && <ScoreBlock e={e} s={s} save={sv} baholovchi={baholovchi} />}
            {s.turi === 'taklif' && <SuggBlock e={e} save={sv} canStatus={mode === 'admin'} />}
          </details>
        )
      })}
    </>
  )
}
