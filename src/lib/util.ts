import { ANKETA, SECTION_ORDER } from '../data/seed'
import type { Employee, QAKey, TimeKey } from '../data/types'

export const filled = (v: unknown) => v !== undefined && v !== null && String(v).trim() !== ''

export function initials(n: string) {
  const w = String(n).replace(/[^\p{L}\p{N}\s]/gu, '').trim().split(/\s+/).filter(Boolean)
  if (!w.length) return '?'
  if (w.length > 1 && /\d/.test(w[1])) return (w[0][0] + w[1]).toUpperCase()
  return w.slice(0, 2).map((x) => x[0]).join('').toUpperCase()
}

export function completeness(e: Employee) {
  let t = 0, f = 0
  for (const k of SECTION_ORDER) {
    const s = ANKETA[k]
    if (s.turi === 'qa') {
      for (const [q] of s.savollar) { t++; if (filled(e[k as QAKey][q])) f++ }
    } else if (s.turi === 'vaqt') {
      t++; if (e[k as TimeKey].length) f++
    } else if (s.turi === 'ball') {
      t++; if (s.mezonlar.every(([q]) => filled(e.baholash[q]))) f++
    }
  }
  return Math.round((f / t) * 100)
}

export function score(e: Employee) {
  const s = ANKETA.baholash
  if (s.turi !== 'ball') return { total: 0, any: false }
  const any = s.mezonlar.some(([q]) => filled(e.baholash[q]))
  const total = s.mezonlar.reduce((a, [q]) => a + (Number(e.baholash[q]) || 0), 0)
  return { total, any }
}

export function slug(s: string) {
  const map: Record<string, string> = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h' }
  return s.toLowerCase().split('').map((c) => map[c] ?? c).join('').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x'
}

/** Qidiruv uchun: kirill → lotin, kichik harf, apostrof va bo'shliqlar olib tashlanadi ("Шодиев" == "shodiev"). */
export function norm(s: string) {
  return slug(String(s ?? '')).replace(/-/g, '')
}

/** Sanadan beri necha kun o'tdi (ISO yoki kun.oy.yil). */
export function daysSince(iso: string | undefined) {
  if (!iso) return null
  let d = new Date(iso)
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(iso)
  if (m) d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
  if (Number.isNaN(d.getTime())) return null
  return Math.floor((Date.now() - d.getTime()) / 86400000)
}

export function uniqueId(base: string, taken: Set<string>) {
  let id = base, n = 2
  while (taken.has(id)) id = `${base}-${n++}`
  return id
}

export function today() {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

/** Rasmni 512px gacha kichraytirib, JPEG data-URL qaytaradi (localStorage'ga sig'ishi uchun). */
export function fileToDataUrl(file: File, max = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height))
      const w = Math.round(img.width * k), h = Math.round(img.height * k)
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      const ctx = c.getContext('2d')
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('canvas')); return }
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Rasm o’qilmadi')) }
    img.src = url
  })
}

export function download(name: string, text: string, type = 'application/json') {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
