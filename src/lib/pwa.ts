import { useEffect, useState } from 'react'

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
let deferred: BIP | null = null
const listeners = new Set<() => void>()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as BIP; listeners.forEach((l) => l()) })
  window.addEventListener('appinstalled', () => { deferred = null; listeners.forEach((l) => l()) })
}

/**
 * "Ilovani o'rnatish" tugmasi uchun.
 * canInstall — brauzer o'rnatishga tayyor (Chrome/Edge). installed — ilova oynasida ochilgan.
 */
export function usePwaInstall() {
  const [, tick] = useState(0)
  useEffect(() => { const l = () => tick((n) => n + 1); listeners.add(l); return () => { listeners.delete(l) } }, [])
  const installed = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true)
  const isIos = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)
  const install = async () => {
    if (!deferred) return false
    await deferred.prompt()
    const r = await deferred.userChoice
    if (r.outcome === 'accepted') deferred = null
    listeners.forEach((l) => l())
    return r.outcome === 'accepted'
  }
  return { canInstall: !!deferred && !installed, installed, isIos, install }
}
