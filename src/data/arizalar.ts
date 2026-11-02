import { useCallback, useEffect, useState } from 'react'
import { supabase, type Ariza, type ArizaLite } from './supabase'

/** Ro'yxat uchun faqat yengil ustunlar — javoblar va katta rasmlar yuklanmaydi (tezlik) */
const LITE = 'id,holat,xodim_id,created_at,ism:data->>ism,telefon:data->shaxsiy->>telefon,lavozim:data->shaxsiy->>lavozim,foto:data->>foto_kichik'

/** To'ldirilgan anketalar ro'yxati (faqat admin). Realtime bilan yangilanadi. */
export function useArizalar() {
  const [list, setList] = useState<ArizaLite[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(!!supabase)

  const reload = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase.from('arizalar').select(LITE).order('created_at', { ascending: false }).limit(500)
    if (error) setError(error.message); else { setError(null); setList((data ?? []) as unknown as ArizaLite[]) }
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

/** Bitta anketa to'liq (HR ochganda) */
export function useAriza(id: string) {
  const [ariza, setAriza] = useState<Ariza | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!supabase || !id) return
    const { data, error } = await supabase.from('arizalar').select('*').eq('id', id).maybeSingle()
    if (error) setError(error.message); else { setError(null); setAriza((data as Ariza) ?? null) }
    setLoading(false)
  }, [id])

  useEffect(() => { setLoading(true); void reload() }, [reload])

  /** HR anketa ma'lumotini o'zgartiradi */
  const updateData = useCallback(async (data: unknown) => {
    if (!supabase) throw new Error('Supabase sozlanmagan')
    const { error } = await supabase.from('arizalar').update({ data, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) throw new Error(error.message)
    setAriza((a) => (a ? { ...a, data: data as Ariza['data'] } : a))
  }, [id])

  const setHolat = useCallback(async (holat: Ariza['holat'], extra: { xodim_id?: string | null; izoh?: string } = {}) => {
    if (!supabase) throw new Error('Supabase sozlanmagan')
    const { error } = await supabase.from('arizalar').update({ holat, updated_at: new Date().toISOString(), ...extra }).eq('id', id)
    if (error) throw new Error(error.message)
    await reload()
  }, [id, reload])

  const remove = useCallback(async () => {
    if (!supabase) throw new Error('Supabase sozlanmagan')
    const { error } = await supabase.from('arizalar').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }, [id])

  return { ariza, error, loading, updateData, setHolat, remove, reload }
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
