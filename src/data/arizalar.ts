import { useCallback, useEffect, useState } from 'react'
import { supabase, type Ariza } from './supabase'

/** To'ldirilgan anketalar (faqat admin). Realtime bilan yangilanadi. */
export function useArizalar() {
  const [list, setList] = useState<Ariza[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(!!supabase)

  const reload = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase.from('arizalar').select('*').order('created_at', { ascending: false }).limit(300)
    if (error) setError(error.message); else { setError(null); setList((data ?? []) as Ariza[]) }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!supabase) return
    void reload()
    const ch = supabase.channel(`arizalar-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'arizalar' }, () => { void reload() })
      .subscribe()
    return () => { supabase?.removeChannel(ch) }
  }, [reload])

  const setHolat = useCallback(async (id: string, holat: Ariza['holat'], extra: { xodim_id?: string | null; izoh?: string } = {}) => {
    if (!supabase) throw new Error('Supabase sozlanmagan')
    const { error } = await supabase.from('arizalar').update({ holat, updated_at: new Date().toISOString(), ...extra }).eq('id', id)
    if (error) throw new Error(error.message)
    await reload()
  }, [reload])

  const remove = useCallback(async (id: string) => {
    if (!supabase) throw new Error('Supabase sozlanmagan')
    const { error } = await supabase.from('arizalar').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await reload()
  }, [reload])

  return { list, error, loading, setHolat, remove, reload, yangi: list.filter((a) => a.holat === 'yangi').length }
}

/** Faqat yangi anketalar soni (sarlavha uchun). */
export function useYangiArizalar(enabled: boolean) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!supabase || !enabled) { setN(0); return }
    const sb = supabase
    const load = async () => {
      const { count } = await sb.from('arizalar').select('id', { count: 'exact', head: true }).eq('holat', 'yangi')
      setN(count ?? 0)
    }
    void load()
    const ch = sb.channel(`arizalar-soni-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'arizalar' }, () => { void load() })
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [enabled])
  return n
}
