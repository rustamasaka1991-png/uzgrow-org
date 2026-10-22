import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Employee } from './types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** `.env` da URL va kalit bo'lmasa — ilova faqat localStorage bilan ishlaydi (havolalar ishlamaydi). */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null

export type Row = { id: string; data: unknown; tartib: number; token?: string | null; updated_at?: string }
export type SettingRow = { key: string; value: unknown }
export type Invite = {
  token: string; bolim: string; lavozim: string; rahbar: string; guruh: string; izoh: string
  created_at: string; used_by: string | null; used_at: string | null
}

/** Tasodifiy 32 belgili hex token (havolalar uchun). */
export function newToken() {
  const b = new Uint8Array(16)
  crypto.getRandomValues(b)
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
}

/** Ilova manzili + hash yo'li: havola sifatida ulashish uchun. */
export const linkTo = (path: string) => `${location.origin}${location.pathname}#${path}`

/* ---------- Xodimlar uchun RPC (anon) ---------- */
export type InviteInfo =
  | { ok: false; xato: string }
  | { ok: true; used: boolean; bolim: string; bolim_nomi: string; bolim_rang: string; lavozim: string; guruh: string; izoh: string; rahbar_ism: string | null; xodim_token: string | null }
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
  inviteInfo: (token: string) => rpc<InviteInfo>('havola_info', { p_token: token }),
  inviteFill: (token: string, id: string, data: Partial<Employee>) => rpc<{ ok: true; id: string; token: string } | { ok: false; xato: string }>('havola_toldirish', { p_token: token, p_id: id, p_data: data }),
  me: (token: string) => rpc<MyInfo>('xodim_olish', { p_token: token }),
  save: (token: string, data: Partial<Employee>) => rpc<{ ok: true; xodim: Employee } | { ok: false; xato: string }>('xodim_saqlash', { p_token: token, p_data: data }),
}
