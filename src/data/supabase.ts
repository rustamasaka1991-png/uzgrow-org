import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Employee } from './types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** `.env` da URL va kalit bo'lmasa — ilova faqat localStorage bilan ishlaydi (havolalar va anketa qabul ishlamaydi). */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null

export type Row = { id: string; data: unknown; tartib: number; token?: string | null; updated_at?: string }
export type SettingRow = { key: string; value: unknown }
/** To'ldirilgan anketa (HR ko'rib chiqadi) */
export type Ariza = { id: string; data: Partial<Employee>; holat: 'yangi' | 'qabul' | 'rad'; xodim_id: string | null; izoh: string; created_at: string; updated_at: string }

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

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('Supabase sozlanmagan')
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message)
  return data as T
}
export const api = {
  /** Ochiq anketa formasi: HR ga yuborish */
  submitAnketa: (data: Partial<Employee> & { website?: string }) => rpc<{ ok: true; id: string } | { ok: false; xato: string }>('anketa_yuborish', { p_data: data }),
  me: (token: string) => rpc<MyInfo>('xodim_olish', { p_token: token }),
  save: (token: string, data: Partial<Employee>) => rpc<{ ok: true; xodim: Employee } | { ok: false; xato: string }>('xodim_saqlash', { p_token: token, p_data: data }),
}
