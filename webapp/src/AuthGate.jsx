import { useEffect, useState } from 'react'
import { Dumbbell, Loader2, LockKeyhole, Play } from 'lucide-react'
import AppV2 from './AppV2'
import GuestApp from './GuestApp'
import './auth.css'
import { getCurrentUser, onAuthChange, signIn, signOut, signUp } from './lib/steelApi'

export default function AuthGate() {
  const [user, setUser] = useState(undefined)
  const [guestMode, setGuestMode] = useState(false)
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    getCurrentUser().then((currentUser) => {
      if (active) setUser(currentUser)
    }).catch(() => {
      if (active) setUser(null)
    })
    const unsubscribe = onAuthChange((nextUser) => {
      setUser(nextUser)
      if (nextUser) setGuestMode(false)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      if (mode === 'signup') {
        const result = await signUp(email.trim(), password)
        if (!result.session) setMessage('Account created. Check your email to confirm, then sign in.')
      } else {
        await signIn(email.trim(), password)
      }
    } catch (error) {
      setMessage(error.message || 'Unable to continue.')
    } finally {
      setBusy(false)
    }
  }

  if (user === undefined) {
    return <div className="auth-shell"><Loader2 className="spin" size={28} /><span>Opening Project Steel…</span></div>
  }

  if (guestMode) {
    return <GuestApp onExit={() => setGuestMode(false)} />
  }

  if (!user) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="auth-mark"><Dumbbell size={24} /></div>
          <div className="eyebrow">PERSONAL TRAINING SYSTEM</div>
          <h1>PROJECT <span>STEEL</span></h1>
          <p>Your private training, weight and nutrition space.</p>

          <form onSubmit={submit} className="auth-form">
            <label>Email<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label>Password<input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength="6" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            <button className="primary" disabled={busy} type="submit">
              {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          </form>

          {message && <p className="auth-message">{message}</p>}
          <button className="text-button auth-switch" type="button" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setMessage('') }}>
            {mode === 'signup' ? 'Already have an account? Sign in' : 'First time? Create account'}
          </button>

          <div style={{height:'1px',background:'#27313d',margin:'8px 0 14px'}} />
          <button className="secondary-action" type="button" style={{width:'100%',justifyContent:'center'}} onClick={() => setGuestMode(true)}>
            <Play size={16} /> Continue as guest
          </button>
          <p className="auth-message" style={{marginTop:10}}>Guest mode uses demo data only. It cannot access or change private account data.</p>

          <div className="auth-private"><LockKeyhole size={15} /> Protected by Supabase authentication + RLS</div>
        </section>
      </main>
    )
  }

  return <AppV2 user={user} onSignOut={async () => { await signOut(); setUser(null) }} />
}
