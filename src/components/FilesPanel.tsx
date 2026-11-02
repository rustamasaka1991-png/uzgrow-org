import { useState } from 'react'
import { FAYL_NOMI, type Fayl, type FaylTuri } from '../data/supabase'
import { fileToDataUrl } from '../lib/util'

/** Rasm o'lchamlari: pasport o'qiladigan bo'lsin, galereya o'rtacha */
export const RASM_MAX = 640, RASM_Q = 0.8, PASPORT_MAX = 1100, PASPORT_Q = 0.85, MAX_RASM = 5

export async function compress(file: File, turi: FaylTuri) {
  return turi === 'rasm' ? fileToDataUrl(file, RASM_MAX, RASM_Q) : fileToDataUrl(file, PASPORT_MAX, PASPORT_Q)
}

type Props = {
  files: Fayl[]
  canEdit: boolean
  onUpload?: (turi: FaylTuri, idx: number, data: string) => Promise<void> | void
  onDelete?: (f: Fayl) => Promise<void> | void
  loading?: boolean
  /** Pasport majburiy ekanini ko'rsatish (anketa formasida) */
  requiredPassport?: boolean
  /** 5 ta rasm majburiy: hamma slot ko'rsatiladi va yulduzcha qo'yiladi */
  requiredGallery?: boolean
  /** Faqat ma'lum pasport tomonlari majburiy (chala havola) */
  requiredSides?: { old?: boolean; orqa?: boolean }
}

/** Pasport (old/orqa) va 5 tagacha qo'shimcha rasm */
export function FilesPanel({ files, canEdit, onUpload, onDelete, loading, requiredPassport, requiredGallery, requiredSides }: Props) {
  const [big, setBig] = useState<Fayl | null>(null)
  /** Shu slot majburiymi */
  const isReq = (turi: FaylTuri) =>
    turi === 'rasm' ? !!requiredGallery
    : turi === 'pasport_old' ? !!(requiredPassport || requiredSides?.old)
    : !!(requiredPassport || requiredSides?.orqa)
  const [busy, setBusy] = useState<string | null>(null)
  const pass = (t: FaylTuri) => files.find((f) => f.turi === t)
  const gallery = files.filter((f) => f.turi === 'rasm').sort((a, b) => a.idx - b.idx)
  const freeIdx = () => { for (let i = 0; i < MAX_RASM; i++) if (!gallery.some((g) => g.idx === i)) return i; return -1 }

  async function pick(turi: FaylTuri, idx: number, f: File | undefined) {
    if (!f || !onUpload) return
    setBusy(`${turi}${idx}`)
    try { await onUpload(turi, idx, await compress(f, turi)) } catch (e) { alert(String((e as Error).message ?? e)) } finally { setBusy(null) }
  }

  const Slot = ({ turi, idx, label }: { turi: FaylTuri; idx: number; label: string }) => {
    const f = turi === 'rasm' ? gallery.find((g) => g.idx === idx) : pass(turi)
    return (
      <div className={`fslot${f ? ' has' : ''}${!f && isReq(turi) ? ' req' : ''}`}>
        {f ? (
          <>
            <img src={f.data} alt={label} onClick={() => setBig(f)} />
            {canEdit && onDelete && <button type="button" className="icon-btn fdel" title="O'chirish" onClick={() => { if (confirm(`${label} o'chirilsinmi?`)) void onDelete(f) }}>✕</button>}
          </>
        ) : canEdit && onUpload ? (
          <label className="fadd">
            <span>{busy === `${turi}${idx}` ? '…' : '+'}</span>
            <input type="file" accept="image/*" capture={turi !== 'rasm' ? 'environment' : undefined} hidden onChange={(e) => { void pick(turi, idx, e.target.files?.[0]); e.target.value = '' }} />
          </label>
        ) : <div className="fadd empty">—</div>}
        <div className="flabel">{label}{isReq(turi) ? ' *' : ''}</div>
      </div>
    )
  }

  return (
    <div className="files">
      {loading ? <div className="note">Fayllar yuklanmoqda…</div> : (
        <>
          <div className="fgroup">
            <div className="ftitle">Pasport</div>
            <div className="frow">
              <Slot turi="pasport_old" idx={0} label={FAYL_NOMI.pasport_old} />
              <Slot turi="pasport_orqa" idx={0} label={FAYL_NOMI.pasport_orqa} />
            </div>
          </div>
          <div className="fgroup">
            <div className="ftitle">Qo'shimcha rasmlar ({gallery.length}/{MAX_RASM}){requiredGallery ? ' — 5 tasi ham majburiy *' : ''}</div>
            <div className="frow">
              {requiredGallery
                ? Array.from({ length: MAX_RASM }, (_, i) => <Slot key={i} turi="rasm" idx={i} label={`Rasm ${i + 1}`} />)
                : (
                  <>
                    {gallery.map((g) => <Slot key={g.id} turi="rasm" idx={g.idx} label={`Rasm ${g.idx + 1}`} />)}
                    {canEdit && onUpload && gallery.length < MAX_RASM && <Slot turi="rasm" idx={freeIdx()} label="Qo'shish" />}
                    {!gallery.length && !canEdit && <div className="note">Rasm yo'q</div>}
                  </>
                )}
            </div>
          </div>
        </>
      )}
      {big && (
        <div className="backdrop" onMouseDown={() => setBig(null)}>
          <img className="bigimg" src={big.data} alt="" />
        </div>
      )}
    </div>
  )
}
