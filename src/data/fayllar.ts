import { useCallback, useEffect, useState } from 'react'
import { newToken, supabase, type Fayl, type FaylTuri } from './supabase'

type Jadval = 'ariza_fayllar' | 'xodim_fayllar'
const COL: Record<Jadval, string> = { ariza_fayllar: 'ariza_id', xodim_fayllar: 'xodim_id' }

/** Admin: anketa yoki xodim fayllari (pasport, qo'shimcha rasmlar). Faqat ochilganda yuklanadi. */
export function useFayllar(jadval: Jadval, id: string | undefined) {
  const [list, setList] = useState<Fayl[]>([])
  const [loading, setLoading] = useState(!!supabase && !!id)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!supabase || !id) { setList([]); setLoading(false); return }
    const { data, error } = await supabase.from(jadval).select('id,turi,idx,data').eq(COL[jadval], id).order('turi').order('idx')
    if (error) setError(error.message); else { setError(null); setList((data ?? []) as Fayl[]) }
    setLoading(false)
  }, [jadval, id])

  useEffect(() => { void reload() }, [reload])

  const upload = useCallback(async (turi: FaylTuri, idx: number, data: string) => {
    if (!supabase || !id) throw new Error('Supabase sozlanmagan')
    const { error } = await supabase.from(jadval).upsert({ [COL[jadval]]: id, turi, idx, data }, { onConflict: `${COL[jadval]},turi,idx` })
    if (error) throw new Error(error.message)
    await reload()
  }, [jadval, id, reload])

  const remove = useCallback(async (fid: number) => {
    if (!supabase) throw new Error('Supabase sozlanmagan')
    const { error } = await supabase.from(jadval).delete().eq('id', fid)
    if (error) throw new Error(error.message)
    await reload()
  }, [jadval, reload])

  return { list, loading, error, upload, remove, reload }
}

/** Anketa qabul qilinganda fayllar xodimga ko'chadi */
export async function copyArizaFilesToXodim(arizaId: string, xodimId: string) {
  if (!supabase) return
  const { data, error } = await supabase.from('ariza_fayllar').select('turi,idx,data').eq('ariza_id', arizaId)
  if (error) throw new Error(error.message)
  if (!data?.length) return
  const rows = data.map((f) => ({ xodim_id: xodimId, turi: f.turi, idx: f.idx, data: f.data }))
  const { error: e2 } = await supabase.from('xodim_fayllar').upsert(rows, { onConflict: 'xodim_id,turi,idx' })
  if (e2) throw new Error(e2.message)
}

/** HR: chala anketa uchun bir martalik havola (faqat ko'rsatilgan maydonlar ochiladi) */
export async function createToldirishLink(target: { xodim_id?: string; ariza_id?: string }, maydonlar: string[]) {
  if (!supabase) throw new Error('Supabase sozlanmagan')
  const token = newToken()
  const { error } = await supabase.from('toldirish_havolalari').insert({ token, xodim_id: target.xodim_id ?? null, ariza_id: target.ariza_id ?? null, maydonlar })
  if (error) throw new Error(error.message)
  return token
}

/** HR: mavjud ochiq (ishlatilmagan) havolalar */
export function useToldirishLinks(target: { xodim_id?: string; ariza_id?: string }) {
  const [list, setList] = useState<{ token: string; maydonlar: string[]; created_at: string; used_at: string | null }[]>([])
  const key = target.xodim_id ?? target.ariza_id
  const col = target.xodim_id ? 'xodim_id' : 'ariza_id'
  const reload = useCallback(async () => {
    if (!supabase || !key) return
    const { data } = await supabase.from('toldirish_havolalari').select('token,maydonlar,created_at,used_at').eq(col, key).order('created_at', { ascending: false }).limit(5)
    setList((data ?? []) as typeof list)
  }, [col, key])
  useEffect(() => { void reload() }, [reload])
  const remove = useCallback(async (token: string) => { if (!supabase) return; await supabase.from('toldirish_havolalari').delete().eq('token', token); await reload() }, [reload])
  return { list, reload, remove }
}
