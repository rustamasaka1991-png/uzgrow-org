// Vercel cron: har kuni Supabase'ga bitta so'rov yuboradi — bepul tarifdagi loyiha
// 7 kun ishlatilmay "uxlab" qolmasligi uchun. Ochiq (maxfiy bo'lmagan) RPC chaqiriladi.
const URL = process.env.VITE_SUPABASE_URL || 'https://zvmidfreiebudylyfzob.supabase.co'
const KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_eG14pKHiKAouFWP7XPMr0A_U01kav2p'

export default async function handler(req, res) {
  try {
    const r = await fetch(`${URL}/rest/v1/rpc/tuzilma_ochiq`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: '{}',
    })
    const text = await r.text()
    res.status(200).json({ ok: r.ok, status: r.status, bytes: text.length, at: new Date().toISOString() })
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) })
  }
}
