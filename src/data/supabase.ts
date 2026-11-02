import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Employee } from './types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** `.env` da URL va kalit bo'lmasa — ilova faqat localStorage bilan ishlaydi (havolalar va anketa qabul ishlamaydi). */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null

export type Row = { id: string; data: unknown; tartib: number; token?: string | null; updated_at?: string }
export type SettingRow = { key: string; value: unknown }
export type ArizaHolat = 'yangi' | 'qabul' | 'rad'
/** Ro'yxat uchun yengil ko'rinish (rasm va javoblarsiz) */
export type ArizaLite = { id: string; holat: ArizaHolat; xodim_id: string | null; created_at: string; ism: string | null; telefon: string | null; lavozim: string | null; foto: string | null }
/** To'liq anketa (HR ochganda yuklanadi) */
export type Ariza = { id: string; data: Partial<Employee>; holat: ArizaHolat; xodim_id: string | null; izoh: string; created_at: string; updated_at: string }
/** Qo'shimcha fayl: galereya rasmi yoki pasport */
export type FaylTuri = 'rasm' | 'pasport_old' | 'pasport_orqa'
export type Fayl = { id: number; turi: FaylTuri; idx: number; data: string }
export const FAYL_NOMI: Record<FaylTuri, string> = { rasm: 'Rasm', pasport_old: 'Pasport (old tomoni)', pasport_orqa: 'Pasport (orqa tomoni)' }

/** Tasodifiy 32 belgili hex token (shaxsiy havolalar uchun). */
export function newToken() {
  const b = new Uint8Array(16)
  crypto.getRandomValues(b)
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
}

/** Ilova manzili + hash yo'li: havola sifatida ulashish uchun. */
export const linkTo = (path: string) => `${location.origin}${location.pathname}#${path}`

/* ---------- Xodimlar uchun RPC (anon) ---------- */
export type MyInfo =
  | { ok: false; xato: string }
  | { ok: true; xodim: Employee; bolim_nomi: string | null; bolim_rang: string; rahbar_ism: string | null }
export type ToldirishInfo =
  | { ok: false; xato: string }
  | { ok: true; ism: string; maydonlar: string[]; qiymatlar: Record<string, unknown> }
type Ok = { ok: true } | { ok: false; xato: string }

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('Supabase sozlanmagan')
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message)
  return data as T
}
export const api = {
  /** Ochiq anketa formasi: HR ga yuborish (fayllar bilan) */
  submitAnketa: (data: Partial<Employee> & { website?: string }, fayllar: { turi: FaylTuri; idx: number; data: string }[]) =>
    rpc<{ ok: true; id: string } | { ok: false; xato: string }>('anketa_yuborish', { p_data: data, p_fayllar: fayllar }),
  me: (token: string) => rpc<MyInfo>('xodim_olish', { p_token: token }),
  save: (token: string, data: Partial<Employee>) => rpc<{ ok: true; xodim: Employee } | { ok: false; xato: string }>('xodim_saqlash', { p_token: token, p_data: data }),
  myFiles: (token: string) => rpc<Fayl[]>('xodim_fayllar_olish', { p_token: token }),
  myFileSave: (token: string, turi: FaylTuri, idx: number, data: string) => rpc<{ ok: true; id: number } | { ok: false; xato: string }>('xodim_fayl_saqlash', { p_token: token, p_turi: turi, p_idx: idx, p_data: data }),
  myFileDelete: (token: string, id: number) => rpc<Ok>('xodim_fayl_ochirish', { p_token: token, p_id: id }),
  toldirishInfo: (token: string) => rpc<ToldirishInfo>('toldirish_info', { p_token: token }),
  toldirishYuborish: (token: string, data: Record<string, unknown>) => rpc<Ok>('toldirish_yuborish', { p_token: token, p_data: data }),
}
