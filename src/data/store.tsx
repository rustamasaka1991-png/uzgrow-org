import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { SEED, emptyEmployee } from './seed'
import { supabase, type Row, type SettingRow } from './supabase'
import type { Department, Employee, OrgData } from './types'

const KEY = 'uzgrow-org:v1'
const QKEY = 'uzgrow-org:queue'

export type SyncStatus = 'local' | 'loading' | 'online' | 'saving' | 'offline' | 'error'

/* ---------- normalizatsiya ---------- */
function normDept(b: Partial<Department> & { id: string }): Department {
  return { id: b.id, nomi: String(b.nomi ?? b.id), rang: String(b.rang ?? '#1d7a3e'), vazifalar: Array.isArray(b.vazifalar) ? b.vazifalar.map(String) : [] }
}
function normalize(raw: unknown): OrgData {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<OrgData>
  const bolimlar: Department[] = Array.isArray(r.bolimlar) ? r.bolimlar.filter((b) => b && typeof b.id === 'string' && b.id).map(normDept) : []
  const xodimlar: Employee[] = Array.isArray(r.xodimlar) ? r.xodimlar.filter((x) => x && typeof x.id === 'string' && x.id).map((x) => emptyEmployee(x)) : []
  for (const x of xodimlar) if (!x.shaxsiy.lavozim) x.shaxsiy.lavozim = x.lavozim
  const ids = new Set(xodimlar.map((x) => x.id))
  for (const x of xodimlar) if (x.rahbar && !ids.has(x.rahbar)) x.rahbar = ''
  const ceoId = typeof r.ceoId === 'string' && ids.has(r.ceoId) ? r.ceoId : (xodimlar.find((x) => !x.rahbar)?.id ?? '')
  return { version: 1, bolimlar, xodimlar, ceoId, updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : new Date().toISOString() }
}
function loadLocal(): OrgData {
  try { const s = localStorage.getItem(KEY); if (s) return normalize(JSON.parse(s)) } catch (e) { console.warn('localStorage o’qilmadi', e) }
  return normalize(SEED)
}
function saveLocal(d: OrgData): string | null {
  try { localStorage.setItem(KEY, JSON.stringify(d)); return null } catch (e) {
    return e instanceof Error && /quota/i.test(e.name + e.message)
      ? "Brauzer saqlash joyi to'ldi: rasmlar hajmi katta. Ba'zi rasmlarni olib tashlang."
      : 'Saqlashda xatolik: ' + String(e)
  }
}

/* ---------- Supabase navbati (offline bo'lsa saqlanib turadi) ---------- */
type Op =
  | { t: 'up_x'; id: string; data: Employee; tartib: number }
  | { t: 'del_x'; id: string }
  | { t: 'up_b'; id: string; data: Department; tartib: number }
  | { t: 'del_b'; id: string }
  | { t: 'set'; key: string; value: unknown }
const opKey = (o: Op) => (o.t === 'set' ? `set:${o.key}` : `${o.t.slice(-1)}:${o.id}`)

function loadQueue(): Map<string, Op> {
  try { const s = localStorage.getItem(QKEY); if (s) return new Map((JSON.parse(s) as Op[]).map((o) => [opKey(o), o])) } catch { /* ignore */ }
  return new Map()
}
function saveQueue(q: Map<string, Op>) {
  try { q.size ? localStorage.setItem(QKEY, JSON.stringify([...q.values()])) : localStorage.removeItem(QKEY) } catch { /* ignore */ }
}

/** Ikki holat orasidagi farqdan Supabase amallarini chiqaradi. */
function diffOps(prev: OrgData, next: OrgData): Op[] {
  const ops: Op[] = []
  const pb = new Map(prev.bolimlar.map((b, i) => [b.id, { b, i }]))
  next.bolimlar.forEach((b, i) => { const p = pb.get(b.id); if (!p || p.b !== b || p.i !== i) ops.push({ t: 'up_b', id: b.id, data: b, tartib: i }) })
  for (const id of pb.keys()) if (!next.bolimlar.some((b) => b.id === id)) ops.push({ t: 'del_b', id })
  const px = new Map(prev.xodimlar.map((x, i) => [x.id, { x, i }]))
  next.xodimlar.forEach((x, i) => { const p = px.get(x.id); if (!p || p.x !== x || p.i !== i) ops.push({ t: 'up_x', id: x.id, data: x, tartib: i }) })
  for (const id of px.keys()) if (!next.xodimlar.some((x) => x.id === id)) ops.push({ t: 'del_x', id })
  if (prev.ceoId !== next.ceoId) ops.push({ t: 'set', key: 'ceoId', value: next.ceoId })
  return ops
}

async function runOp(o: Op) {
  if (!supabase) return
  const now = new Date().toISOString()
  const q =
    o.t === 'up_x' ? supabase.from('xodimlar').upsert({ id: o.id, data: o.data, tartib: o.tartib, updated_at: now })
    : o.t === 'del_x' ? supabase.from('xodimlar').delete().eq('id', o.id)
    : o.t === 'up_b' ? supabase.from('bolimlar').upsert({ id: o.id, data: o.data, tartib: o.tartib, updated_at: now })
    : o.t === 'del_b' ? supabase.from('bolimlar').delete().eq('id', o.id)
    : supabase.from('sozlamalar').upsert({ key: o.key, value: o.value, updated_at: now })
  const { error } = await q
  if (error) throw new Error(error.message)
}

const isNetErr = (msg: string) => /fetch|network|Failed|ECONN|timeout/i.test(msg)

/* ---------- Context ---------- */
type Ctx = {
  data: OrgData
  byId: Record<string, Employee>
  deptOf: (id: string) => Department | undefined
  kids: (id: string) => Employee[]
  ofDept: (id: string) => Employee[]
  headOf: (id: string) => Employee | undefined
  colorOf: (deptId: string) => string
  addEmployee: (e: Employee) => void
  updateEmployee: (id: string, fn: (e: Employee) => Employee) => void
  deleteEmployee: (id: string) => void
  addDepartment: (d: Department) => void
  updateDepartment: (id: string, fn: (d: Department) => Department) => void
  deleteDepartment: (id: string) => boolean
  replaceAll: (d: unknown) => void
  reset: () => void
  saveError: string | null
  lastSaved: string
  sync: SyncStatus
  syncError: string | null
  pending: number
  retrySync: () => void
}

const OrgContext = createContext<Ctx | null>(null)

export function OrgProvider({ children }: { children: ReactNode }) {
  const [data, setDataState] = useState<OrgData>(loadLocal)
  const dataRef = useRef(data)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [sync, setSync] = useState<SyncStatus>(supabase ? 'loading' : 'local')
  const [syncError, setSyncError] = useState<string | null>(null)
  const [pending, setPending] = useState(0)
  const queue = useRef<Map<string, Op>>(loadQueue())
  const flushing = useRef(false)
  const loaded = useRef(false)
  const syncErrorRef = useRef<string | null>(null)
  syncErrorRef.current = syncError

  /** Holatni o'rnatadi (lokal keshga ham yozadi). */
  const setData = useCallback((next: OrgData) => {
    dataRef.current = next
    setDataState(next)
    setSaveError(saveLocal(next))
  }, [])

  /* ---- navbatni Supabase'ga yuborish ---- */
  const flush = useCallback(async () => {
    if (!supabase || flushing.current) return
    flushing.current = true
    try {
      while (queue.current.size) {
        const [k, op] = queue.current.entries().next().value as [string, Op]
        setSync('saving')
        await runOp(op)
        queue.current.delete(k)
        saveQueue(queue.current)
        setPending(queue.current.size)
      }
      setSync('online'); setSyncError(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setSync(isNetErr(msg) ? 'offline' : 'error')
      setSyncError(msg)
    } finally { flushing.current = false }
  }, [])

  const enqueue = useCallback((ops: Op[]) => {
    if (!supabase || !ops.length) return
    for (const o of ops) queue.current.set(opKey(o), o)
    saveQueue(queue.current)
    setPending(queue.current.size)
    void flush()
  }, [flush])

  /** Foydalanuvchi amali: lokal holat + Supabase navbati. */
  const commit = useCallback((fn: (d: OrgData) => OrgData) => {
    const prev = dataRef.current
    const next = { ...fn(prev), updatedAt: new Date().toISOString() }
    setData(next)
    enqueue(diffOps(prev, next))
  }, [setData, enqueue])

  /* ---- Supabase'dan yuklash + realtime ---- */
  useEffect(() => {
    if (!supabase) return
    const sb = supabase
    let alive = true

    const applyRemote = (b: Row[], x: Row[], s: SettingRow[]) => {
      const bolimlar = [...b].sort((p, q) => p.tartib - q.tartib).map((r) => ({ ...(r.data as Department), id: r.id }))
      const xodimlar = [...x].sort((p, q) => p.tartib - q.tartib).map((r) => ({ ...(r.data as Employee), id: r.id }))
      const ceo = s.find((r) => r.key === 'ceoId')?.value
      setData(normalize({ bolimlar, xodimlar, ceoId: typeof ceo === 'string' ? ceo : undefined, updatedAt: new Date().toISOString() }))
    }

    const load = async () => {
      try {
        setSync('loading')
        await flush() // oldin offline paytdagi o'zgarishlarni yuboramiz
        if (queue.current.size) throw new Error(syncErrorRef.current ?? 'Navbat yuborilmadi')
        const [b, x, s] = await Promise.all([
          sb.from('bolimlar').select('id,data,tartib'),
          sb.from('xodimlar').select('id,data,tartib'),
          sb.from('sozlamalar').select('key,value'),
        ])
        const err = b.error ?? x.error ?? s.error
        if (err) throw new Error(err.message)
        if (!alive) return
        if ((b.data?.length ?? 0) + (x.data?.length ?? 0) === 0) {
          // Baza bo'sh — lokal (yoki boshlang'ich) ma'lumotni yuklaymiz
          const cur = dataRef.current
          enqueue(diffOps({ ...cur, bolimlar: [], xodimlar: [], ceoId: '' }, cur))
        } else {
          applyRemote(b.data as Row[], x.data as Row[], s.data as SettingRow[])
        }
        loaded.current = true
        if (!queue.current.size) { setSync('online'); setSyncError(null) }
      } catch (e) {
        if (!alive) return
        const msg = e instanceof Error ? e.message : String(e)
        setSync(isNetErr(msg) ? 'offline' : 'error'); setSyncError(msg)
      }
    }
    void load()

    // Boshqa qurilmadagi o'zgarishlar
    const channel = sb.channel('uzgrow-org')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'xodimlar' }, (p) => {
        const cur = dataRef.current
        if (p.eventType === 'DELETE') {
          const id = (p.old as { id?: string }).id
          if (id && cur.xodimlar.some((x) => x.id === id)) setData({ ...cur, xodimlar: cur.xodimlar.filter((x) => x.id !== id) })
          return
        }
        const r = p.new as Row
        const e = emptyEmployee({ ...(r.data as Employee), id: r.id })
        if (!e.shaxsiy.lavozim) e.shaxsiy.lavozim = e.lavozim
        const list = cur.xodimlar.filter((x) => x.id !== r.id)
        list.splice(Math.min(r.tartib, list.length), 0, e)
        setData({ ...cur, xodimlar: list, ceoId: cur.ceoId || (e.rahbar ? '' : e.id) })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bolimlar' }, (p) => {
        const cur = dataRef.current
        if (p.eventType === 'DELETE') {
          const id = (p.old as { id?: string }).id
          if (id) setData({ ...cur, bolimlar: cur.bolimlar.filter((b) => b.id !== id) })
          return
        }
        const r = p.new as Row
        const d = normDept({ ...(r.data as Department), id: r.id })
        const list = cur.bolimlar.filter((b) => b.id !== r.id)
        list.splice(Math.min(r.tartib, list.length), 0, d)
        setData({ ...cur, bolimlar: list })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sozlamalar' }, (p) => {
        const r = p.new as SettingRow
        if (r?.key === 'ceoId' && typeof r.value === 'string') setData({ ...dataRef.current, ceoId: r.value })
      })
      .subscribe()

    const onOnline = () => { if (loaded.current) void flush(); else void load() }
    window.addEventListener('online', onOnline)
    const timer = window.setInterval(() => { if (queue.current.size || !loaded.current) { if (loaded.current) void flush(); else void load() } }, 30000)
    return () => { alive = false; sb.removeChannel(channel); window.removeEventListener('online', onOnline); window.clearInterval(timer) }
  }, [setData, flush, enqueue])

  // Supabase yo'q bo'lsa — boshqa oynadagi o'zgarishlarni localStorage orqali olamiz
  useEffect(() => {
    if (supabase) return
    const on = (ev: StorageEvent) => { if (ev.key === KEY && ev.newValue) { try { const d = normalize(JSON.parse(ev.newValue)); dataRef.current = d; setDataState(d) } catch { /* ignore */ } } }
    window.addEventListener('storage', on)
    return () => window.removeEventListener('storage', on)
  }, [])

  const byId = useMemo(() => Object.fromEntries(data.xodimlar.map((e) => [e.id, e])), [data.xodimlar])

  const api = useMemo<Ctx>(() => {
    const deptOf = (id: string) => data.bolimlar.find((b) => b.id === id)
    const kids = (id: string) => data.xodimlar.filter((e) => e.rahbar === id)
    const ofDept = (id: string) => data.xodimlar.filter((e) => e.bolim === id)
    const headOf = (id: string) => ofDept(id).find((e) => !byId[e.rahbar] || byId[e.rahbar].bolim !== id)
    const colorOf = (deptId: string) => deptOf(deptId)?.rang ?? 'var(--brand)'
    return {
      data, byId, deptOf, kids, ofDept, headOf, colorOf, saveError, sync, syncError, pending,
      lastSaved: data.updatedAt,
      retrySync: () => { void flush() },
      addEmployee: (e) => commit((d) => ({ ...d, xodimlar: [...d.xodimlar, e], ceoId: d.ceoId || (e.rahbar ? d.ceoId : e.id) })),
      updateEmployee: (id, fn) => commit((d) => ({ ...d, xodimlar: d.xodimlar.map((x) => (x.id === id ? fn(x) : x)) })),
      deleteEmployee: (id) => commit((d) => {
        const victim = d.xodimlar.find((x) => x.id === id)
        if (!victim) return d
        const xodimlar = d.xodimlar.filter((x) => x.id !== id).map((x) => (x.rahbar === id ? { ...x, rahbar: victim.rahbar } : x))
        const ceoId = d.ceoId === id ? (xodimlar.find((x) => !x.rahbar)?.id ?? '') : d.ceoId
        return { ...d, xodimlar, ceoId }
      }),
      addDepartment: (b) => commit((d) => ({ ...d, bolimlar: [...d.bolimlar, b] })),
      updateDepartment: (id, fn) => commit((d) => ({ ...d, bolimlar: d.bolimlar.map((b) => (b.id === id ? fn(b) : b)) })),
      deleteDepartment: (id) => {
        if (dataRef.current.xodimlar.some((x) => x.bolim === id)) return false
        commit((d) => ({ ...d, bolimlar: d.bolimlar.filter((b) => b.id !== id) }))
        return true
      },
      replaceAll: (raw) => commit(() => normalize(raw)),
      reset: () => commit(() => normalize(SEED)),
    }
  }, [data, byId, commit, flush, saveError, sync, syncError, pending])

  return <OrgContext.Provider value={api}>{children}</OrgContext.Provider>
}

export function useOrg() {
  const c = useContext(OrgContext)
  if (!c) throw new Error('OrgProvider yo’q')
  return c
}
