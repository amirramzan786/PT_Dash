import { useEffect, useState } from 'react'
import { Loader2, LockKeyhole, Play } from 'lucide-react'
import AppV3 from './AppV3'
import GuestApp from './GuestApp'
import './auth.css'
import { getCurrentUser, onAuthChange, sendPasswordReset, signIn, signOut, signUp, updatePassword } from './lib/steelApi'
import SteelMark from './components/SteelMark'

export default function AuthGate() {
  const [user, setUser] = useState(undefined)
  const [guestMode, setGuestMode] = useState(false)
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [recoveryPassword, setRecoveryPassword] = useState('')
  const [recoveryConfirm, setRecoveryConfirm] = useState('')
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    getCurrentUser().then((currentUser) => { if (active) setUser(currentUser) }).catch(() => { if (active) setUser(null) })
    const unsubscribe = onAuthChange((nextUser, event) => { setUser(nextUser); if (nextUser) setGuestMode(false); if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true) })
    return () => { active = false; unsubscribe() }
  }, [])

  async function submit(event) {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      if (recoveryMode) {
        if (recoveryPassword.length < 6) throw new Error('Use at least 6 characters for your new password.')
        if (recoveryPassword !== recoveryConfirm) throw new Error('New passwords do not match.')
        await updatePassword(recoveryPassword)
        setRecoveryMode(false); setRecoveryPassword(''); setRecoveryConfirm(''); setMessage('Password updated. You’re signed in.')
      } else if (mode === 'reset') {
        await sendPasswordReset(email.trim())
        setMessage('If an account exists for that email, we’ve sent a password reset link.')
      } else if (mode === 'signup') {
        const result = await signUp(email.trim(), password)
        if (!result.session) setMessage('Account created. Check your email to confirm, then sign in.')
      } else {
        await signIn(email.trim(), password)
        // A fresh sign-in should always begin at the Home dashboard. Existing
        // authenticated sessions still keep their current route on refresh.
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#Home`)
      }
    } catch (error) { setMessage(error.message || 'Unable to continue.') } finally { setBusy(false) }
  }

  if (user === undefined) return <div className="auth-shell"><Loader2 className="spin" size={28}/><span>Opening Project Steel…</span></div>
  if (guestMode) return <GuestApp onExit={() => setGuestMode(false)} />

  if (recoveryMode) return <main className="auth-shell"><section className="auth-card"><div className="auth-mark"><SteelMark size={30}/></div><div className="eyebrow">ACCOUNT SECURITY</div><h1>Set a new password</h1><p>Choose a strong password for your Project Steel account.</p><form onSubmit={submit} className="auth-form"><label>New password<input type="password" autoComplete="new-password" minLength="6" required value={recoveryPassword} onChange={(e)=>setRecoveryPassword(e.target.value)}/></label><label>Confirm new password<input type="password" autoComplete="new-password" minLength="6" required value={recoveryConfirm} onChange={(e)=>setRecoveryConfirm(e.target.value)}/></label><button className="primary" disabled={busy}>{busy?'Updating…':'Update password'}</button></form>{message&&<p className="auth-message">{message}</p>}</section></main>

  if (!user) return <main className="auth-shell"><section className="auth-card"><div className="auth-mark"><SteelMark size={30}/></div><div className="eyebrow">SPARTAN STRENGTH, EVERY DAY</div><h1>PROJECT <span>STEEL</span></h1><p>{mode === 'reset' ? 'We’ll send a secure link to help you get back in.' : 'Your private training, weight and progress space.'}</p><form onSubmit={submit} className="auth-form"><label>Email<input type="email" autoComplete="email" required value={email} onChange={(e)=>setEmail(e.target.value)}/></label>{mode !== 'reset' && <label>Password<input type="password" autoComplete={mode==='signup'?'new-password':'current-password'} minLength="6" required value={password} onChange={(e)=>setPassword(e.target.value)}/></label>}<button className="primary" disabled={busy}>{busy?'Please wait…':mode==='reset'?'Send reset link':mode==='signup'?'Create account':'Sign in'}</button></form>{message&&<p className="auth-message">{message}</p>}{mode === 'reset' ? <button className="text-button auth-switch" type="button" onClick={()=>{setMode('signin');setMessage('')}}>Back to sign in</button> : <><button className="text-button auth-switch" type="button" onClick={()=>{setMode(mode==='signup'?'signin':'signup');setMessage('')}}>{mode==='signup'?'Already have an account? Sign in':'First time? Create account'}</button>{mode === 'signin' && <button className="text-button auth-switch" type="button" onClick={()=>{setMode('reset');setMessage('')}}>Forgot password?</button>}</>}<div style={{height:'1px',background:'#27313d',margin:'12px 0'}}/><button className="primary" type="button" style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}} onClick={()=>setGuestMode(true)}><Play size={17}/> Try Guest Demo</button><p className="auth-message" style={{marginTop:10}}>Demo mode is isolated from all private account data.</p><div className="auth-private"><LockKeyhole size={15}/> Protected by Supabase authentication + RLS</div></section></main>

  return <AppV3 user={user} onSignOut={async()=>{await signOut();setUser(null)}} />
}
