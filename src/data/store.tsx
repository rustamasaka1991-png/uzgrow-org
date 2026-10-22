import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { SEED, emptyEmployee } from './seed'
import type { Department, Employee, OrgData } from './types'

const KEY = 'uzgrow-org:v1'

function normalize(raw: unknown): OrgData {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<OrgData>
  const bolimlar: Department[] = Array.isArray(r.bolimlar)
    ? r.bolimlar.filter((b) => b && typeof b.id === 'string' && b.id).map((b) => ({
        id: b.id, nomi: String(b.nomi ?? b.id), rang: String(b.rang ?? '#1d7a3e'),
        vazifalar: Array.isArray(b.vazifalar) ? b.vazifalar.map(String) : [],
      }))
    : []
  const xodimlar: Employee[] = Array.isArray(r.xodimlar)
    ? r.xodimlar.filter((x) => x && typeof x.id === 'string' && x.id).map((x) => emptyEmployee(x))
    : []
  for (const x of xodimlar) if (!x.shaxsiy.lavozim) x.shaxsiy.lavozim = x.lavozim
  const ids = new Set(xodimlar.map((x) => x.id))
  for (const x of xodimlar) if (x.rahbar && !ids.has(x.rahbar)) x.rahbar = ''
  const ceoId = typeof r.ceoId === 'string' && ids.has(r.ceoId) ? r.ceoId : (xodimlar.find((x) => !x.rahbar)?.id ?? '')
  return { version: 1, bolimlar, xodimlar, ceoId, updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : new Date().toISOString() }
}

function load(): OrgData {
  try {
    const s = localStorage.getItem(KEY)
    if (s) return normalize(JSON.parse(s))
  } catch (e) {
    console.warn('localStorage o’qilmadi', e)
  }
  return normalize(SEED)
}

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
}

const OrgContext = createContext<Ctx | null>(null)

export function OrgProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<OrgData>(load)
  const [saveError, setSaveError] = useState<string | null>(null)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) { first.current = false; return }
    try {
      localStorage.setItem(KEY, JSON.stringify(data))
      setSaveError(null)
    } catch (e) {
      const msg = e instanceof Error && /quota/i.test(e.name + e.message)
        ? "Saqlash joyi to'ldi: rasmlar hajmi katta. Ba'zi rasmlarni olib tashlang yoki JSON eksport qiling."
        : 'Saqlashda xatolik: ' + String(e)
      setSaveError(msg)
    }
  }, [data])

  // Boshqa oynada o'zgarsa — sinxronlash
  useEffect(() => {
    const on = (ev: StorageEvent) => { if (ev.key === KEY && ev.newValue) { try { setData(normalize(JSON.parse(ev.newValue))) } catch { /* ignore */ } } }
    window.addEventListener('storage', on)
    return () => window.removeEventListener('storage', on)
  }, [])

  const commit = useCallback((fn: (d: OrgData) => OrgData) => {
    setData((d) => ({ ...fn(d), updatedAt: new Date().toISOString() }))
  }, [])

  const byId = useMemo(() => Object.fromEntries(data.xodimlar.map((e) => [e.id, e])), [data.xodimlar])

  const api = useMemo<Ctx>(() => {
    const deptOf = (id: string) => data.bolimlar.find((b) => b.id === id)
    const kids = (id: string) => data.xodimlar.filter((e) => e.rahbar === id)
    const ofDept = (id: string) => data.xodimlar.filter((e) => e.bolim === id)
    const headOf = (id: string) => ofDept(id).find((e) => !byId[e.rahbar] || byId[e.rahbar].bolim !== id)
    const colorOf = (deptId: string) => deptOf(deptId)?.rang ?? 'var(--brand)'
    return {
      data, byId, deptOf, kids, ofDept, headOf, colorOf, saveError,
      lastSaved: data.updatedAt,
      addEmployee: (e) => commit((d) => ({ ...d, xodimlar: [...d.xodimlar, e] })),
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
        if (data.xodimlar.some((x) => x.bolim === id)) return false
        commit((d) => ({ ...d, bolimlar: d.bolimlar.filter((b) => b.id !== id) }))
        return true
      },
      replaceAll: (raw) => setData(normalize(raw)),
      reset: () => setData(normalize(SEED)),
    }
  }, [data, byId, commit, saveError])

  return <OrgContext.Provider value={api}>{children}</OrgContext.Provider>
}

export function useOrg() {
  const c = useContext(OrgContext)
  if (!c) throw new Error('OrgProvider yo’q')
  return c
}
