import { supabase } from '../data/supabase'
import { download } from './util'

/** sozlamalar kaliti: oxirgi marta to'liq zaxira qachon yuklab olingan (eslatma uchun) */
export const TOLIQ_KEY = 'toliq_zaxira'
export const ESLATMA_KUN = 7

// Jadval → tartiblash ustuni va bir so'rovdagi qatorlar soni (fayllar katta — kichik bo'laklar)
const JADVALLAR: [string, string, number][] = [
  ['bolimlar', 'id', 500], ['sozlamalar', 'key', 500], ['xodimlar', 'id', 25], ['arizalar', 'id', 50],
  ['xodim_fayllar', 'id', 15], ['ariza_fayllar', 'id', 15], ['foto_arxiv', 'id', 25],
  ['toldirish_havolalari', 'token', 500], ['tarix', 'id', 500],
]

async function hammasi(jadval: string, tartib: string, bolak: number) {
  const out: unknown[] = []
  for (let from = 0; ; from += bolak) {
    const { data, error } = await supabase!.from(jadval).select('*').order(tartib).range(from, from + bolak - 1)
    if (error) throw new Error(`${jadval}: ${error.message}`)
    out.push(...(data ?? []))
    if (!data || data.length < bolak) return out
  }
}

/** Bazadagi hamma narsa (rasmlar, pasportlar, anketalar, tarix) bitta JSON faylga — bazadan tashqarida saqlash uchun */
export async function toliqZaxiraYuklab(onStep: (t: string) => void) {
  if (!supabase) throw new Error('Supabase sozlanmagan')
  const jadvallar: Record<string, unknown[]> = {}
  for (const [j, t, b] of JADVALLAR) {
    onStep(`${j}…`)
    jadvallar[j] = await hammasi(j, t, b)
  }
  const vaqt = new Date().toISOString()
  download(`uzgrow-toliq-zaxira-${vaqt.slice(0, 10)}.json`, JSON.stringify({ turi: 'uzgrow-toliq-zaxira', versiya: 1, vaqt, jadvallar }))
  await supabase.from('sozlamalar').upsert({ key: TOLIQ_KEY, value: vaqt, updated_at: vaqt })
  return Object.fromEntries(Object.entries(jadvallar).map(([k, v]) => [k, v.length]))
}

/** Oxirgi to'liq zaxira necha kun oldin olingan (hech qachon bo'lmasa null) */
export async function oxirgiToliqZaxira(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.from('sozlamalar').select('value').eq('key', TOLIQ_KEY).maybeSingle()
  return typeof data?.value === 'string' ? data.value : null
}
