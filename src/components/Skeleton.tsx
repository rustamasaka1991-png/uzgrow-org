/** Ma'lumot kelguncha sahifa shakli (skeleton): bo'sh "0 xodim" yoki aylanuvchi belgi o'rniga */

/** Bosh sahifa: raqamlar, rahbar va bo'lim kartochkalari joyi */
export function OverviewSkeleton() {
  return (
    <div role="status" aria-label="Yuklanmoqda">
      <div className="stats"><div className="sk sk-chip" /><div className="sk sk-chip" /></div>
      <div className="lead"><div className="sk sk-boss" /><div className="vline" /><div className="sk sk-boss" /><div className="vline" /></div>
      <div className="depts" style={{ ['--cols' as string]: 4 }}>
        {Array.from({ length: 8 }, (_, i) => <div key={i} className="sk sk-dept" />)}
      </div>
    </div>
  )
}

/** Profil, bo'lim, anketa sahifalari: sarlavha + bir necha bo'lim */
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Yuklanmoqda">
      <div className="sk sk-crumb" />
      <div className="panel sk-head"><div className="sk sk-av" /><div className="sk-grow"><div className="sk sk-t" /><div className="sk sk-s" /></div></div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="panel sk-block"><div className="sk sk-h" /><div className="sk sk-line" /><div className="sk sk-line" /><div className="sk sk-line sk-short" /></div>
      ))}
    </div>
  )
}

/** Ro'yxat (anketalar, tarix): bir necha qator */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Yuklanmoqda">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="sk-row"><div className="sk sk-av-s" /><div className="sk-grow"><div className="sk sk-line sk-first" /><div className="sk sk-line sk-short" /></div></div>
      ))}
    </div>
  )
}
