import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** `.env` da URL va kalit bo'lmasa — ilova faqat localStorage bilan ishlaydi. */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null

export type Row = { id: string; data: unknown; tartib: number; updated_at?: string }
export type SettingRow = { key: string; value: unknown }
