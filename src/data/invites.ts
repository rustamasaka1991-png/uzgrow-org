import { useCallback, useEffect, useState } from 'react'
import { newToken, supabase, type Invite } from './supabase'

/** Bo'limning taklif havolalari (faqat admin). Realtime bilan yangilanadi. */
export function useInvites(bolim: string) {
  const [list, setList] = useState<Invite[]>([])
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase.from('havolalar').select('*').eq('bolim', bolim).order('created_at', { ascending: false })
    if (error) setError(error.message); else { setError(null); setList((data ?? []) as Invite[]) }
  }, [bolim])

  useEffect(() => {
    if (!supabase) return
    void reload()
    // Har bir hook nusxasi o'z kanalini ochadi (bir xil nom bo'lsa supabase-js mavjud kanalni qaytaradi va xato beradi)
    const ch = supabase.channel(`havolalar-${bolim}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'havolalar' }, () => { void reload() })
      .subscribe()
    return () => { supabase?.removeChannel(ch) }
  }, [bolim, reload])

  const create = useCallback(async (p: { lavozim: string; rahbar: string; guruh: string; izoh: string }) => {
    if (!supabase) throw new Error('Supabase sozlanmagan')
    const token = newToken()
    const { error } = await supabase.from('havolalar').insert({ token, bolim, ...p })
    if (error) throw new Error(error.message)
    await reload()
    return token
  }, [bolim, reload])

  const remove = useCallback(async (token: string) => {
    if (!supabase) return
    const { error } = await supabase.from('havolalar').delete().eq('token', token)
    if (error) throw new Error(error.message)
    await reload()
  }, [reload])

  return { list, error, create, remove, reload }
}

export async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true } catch { return false }
}
