import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../data/auth'

export function Login() {
  const { enabled, loading, session, isAdmin, email: cur, signIn, signUp, signOut } = useAuth()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!enabled || (session && isAdmin)) return <Navigate to="/" replace />
  if (loading) return <div className="center"><div className="spinner" /> Tekshirilmoqda…</div>

  if (session && !isAdmin) {
    return (
      <div className="login">
        <h1>Ruxsat yo'q</h1>
        <p className="sub">{cur} ro'yxatdan o'tgan, lekin admin (HR) ro'yxatida yo'q. Rahbar sizni ro'yxatga qo'shishi kerak.</p>
        <button type="button" className="btn" onClick={() => signOut()}>Boshqa hisob bilan kirish</button>
      </div>
    )
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    setBusy(true); setMsg(null)
    const err = mode === 'in' ? await signIn(email, password) : await signUp(email, password)
    setBusy(false)
    if (err) setMsg(err)
  }

  return (
    <div className="login">
      <h1>HR kirishi</h1>
      <p className="sub">Bu sahifa faqat HR va rahbar (bosh direktor) uchun. Xodimlar o'zlariga berilgan shaxsiy havola orqali kiradi — ularga login kerak emas.</p>
      <form className="form" onSubmit={submit}>
        <label className="field"><span>Email</span><input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="field"><span>Parol</span><input type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {msg && <div className={/tasdiqlash xati/.test(msg) ? 'note' : 'err'}>{msg}</div>}
        <div className="actions">
          <button type="button" className="btn ghost" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(null) }}>
            {mode === 'in' ? "Ro'yxatdan o'tish" : 'Kirish'}
          </button>
          <button type="submit" className="btn primary" disabled={busy}>{busy ? '…' : mode === 'in' ? 'Kirish' : "Ro'yxatdan o'tish"}</button>
        </div>
      </form>
      {mode === 'up' && <p className="note">Faqat ruxsat ro'yxatidagi email admin bo'la oladi. Ro'yxatdan o'tgach emailga tasdiqlash xati keladi.</p>}
    </div>
  )
}
