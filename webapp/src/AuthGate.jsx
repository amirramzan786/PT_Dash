import { useEffect, useRef, useState } from 'react'
import { Loader2, LockKeyhole, Play } from 'lucide-react'
import AppV3 from './AppV3'
import GuestApp from './GuestApp'
import './auth.css'
import { completeBetaVerification, getCurrentUser, getMfaAssuranceLevel, getMfaFactors, onAuthChange, sendPasswordReset, signIn, signOut, signUp, updatePassword, verifyAuthenticatorApp } from './lib/steelApi'
import SteelMark from './components/SteelMark'

function hasBetaVerificationIntent() {
  if (typeof window === 'undefined') return false
  return /beta-verified(?:[=&]|$)/i.test(`${window.location.hash}${window.location.search}`)
}

function BetaVerificationScreen({ result, error, busy, onRetry, onContinue }) {
  const founderNumber = Number(result?.foundingNumber)
  const isFounder = Number.isInteger(founderNumber) && founderNumber > 0
  return <main className="auth-shell"><section className="auth-card beta-verification-card" aria-live="polite"><div className="auth-mark"><span aria-hidden="true">✓</span></div><div className="eyebrow">PROJECT STEEL · ACCESS CONFIRMED</div><h1>You’re <span>verified.</span></h1>{busy ? <><p>We’re securing your beta access now.</p><div className="beta-verification-loading"><Loader2 className="spin" size={20}/> Confirming your place…</div></> : error ? <><p>We couldn’t finish the beta access check yet.</p><p className="auth-message" role="alert">{error}</p><button className="primary" type="button" onClick={onRetry}>Try again</button></> : <><p>Your email ownership is confirmed and your next step is ready.</p><div className="beta-verification-result"><strong>{isFounder ? `FOUNDING MEMBER · #${String(founderNumber).padStart(2, '0')}` : 'BETA WAITLIST'}</strong><span>{isFounder ? 'Steel Premium free for life. No payment details required.' : 'You’re verified and on the Steel beta waitlist. We’ll contact you when more access becomes available.'}</span></div><button className="primary" type="button" onClick={onContinue}>Continue to Steel <span aria-hidden="true">→</span></button></>}</section></main>
}

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
  const [mfaGate, setMfaGate] = useState('checking')
  const [mfaFactor, setMfaFactor] = useState(null)
  const [mfaCode, setMfaCode] = useState('')
  const [betaVerification, setBetaVerification] = useState(null)
  const [betaVerificationBusy, setBetaVerificationBusy] = useState(false)
  const [betaVerificationError, setBetaVerificationError] = useState('')
  const betaVerificationAttempted = useRef(false)

  async function assessMfa(nextUser) {
    if (!nextUser) { setMfaFactor(null); setMfaGate('clear'); return }
    setMfaGate('checking')
    try {
      const [factors, assurance] = await Promise.all([getMfaFactors(), getMfaAssuranceLevel()])
      const factor = factors.find((item) => item.factor_type === 'totp' && item.status === 'verified')
      if (factor && assurance?.currentLevel !== 'aal2') { setMfaFactor(factor); setMfaGate('required') }
      else { setMfaFactor(null); setMfaGate('clear') }
    } catch { setMfaFactor(null); setMfaGate('clear') }
  }

  useEffect(() => {
    let active = true
    async function finishBetaVerification(nextUser) {
      if (!active || !nextUser || !hasBetaVerificationIntent() || betaVerificationAttempted.current) return
      betaVerificationAttempted.current = true
      setBetaVerificationBusy(true)
      setBetaVerificationError('')
      try {
        const result = await completeBetaVerification()
        if (active) setBetaVerification(result)
      } catch (error) {
        if (active) setBetaVerificationError(error.message || 'We could not complete beta verification.')
      } finally {
        if (active) setBetaVerificationBusy(false)
      }
    }
    getCurrentUser().then((currentUser) => { if (active) { setUser(currentUser); assessMfa(currentUser); finishBetaVerification(currentUser) } }).catch(() => { if (active) { setUser(null); setMfaGate('clear') } })
    const unsubscribe = onAuthChange((nextUser, event) => { setUser(nextUser); assessMfa(nextUser); if (nextUser) { setGuestMode(false); finishBetaVerification(nextUser) } if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true) })
    return () => { active = false; unsubscribe() }
  }, [])

  function clearBetaVerification() {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#Home`)
    setBetaVerification(null)
    setBetaVerificationError('')
  }

  async function retryBetaVerification() {
    if (!user) return
    setBetaVerificationBusy(true)
    setBetaVerificationError('')
    try { setBetaVerification(await completeBetaVerification()) }
    catch (error) { setBetaVerificationError(error.message || 'We could not complete beta verification.') }
    finally { setBetaVerificationBusy(false) }
  }

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

  async function submitMfa(event) {
    event.preventDefault()
    if (!mfaFactor || !/^\d{6}$/.test(mfaCode)) { setMessage('Enter the 6-digit code from your authenticator app.'); return }
    setBusy(true); setMessage('')
    try { await verifyAuthenticatorApp({ factorId: mfaFactor.id, code: mfaCode }); setMfaCode(''); setMfaGate('clear') }
    catch (error) { setMessage(error.message || 'That code could not be verified.') } finally { setBusy(false) }
  }

  if (user === undefined || (user && mfaGate === 'checking')) return <div className="auth-shell"><Loader2 className="spin" size={28}/><span>Opening Project Steel…</span></div>
  if (guestMode) return <GuestApp onExit={() => setGuestMode(false)} />

  if (user && (betaVerificationBusy || betaVerification || betaVerificationError)) return <BetaVerificationScreen result={betaVerification} error={betaVerificationError} busy={betaVerificationBusy} onRetry={retryBetaVerification} onContinue={clearBetaVerification} />

  if (recoveryMode) return <main className="auth-shell"><section className="auth-card"><div className="auth-mark"><SteelMark size={30}/></div><div className="eyebrow">ACCOUNT SECURITY</div><h1>Set a new password</h1><p>Choose a strong password for your Project Steel account.</p><form onSubmit={submit} className="auth-form"><label>New password<input type="password" autoComplete="new-password" minLength="6" required value={recoveryPassword} onChange={(e)=>setRecoveryPassword(e.target.value)}/></label><label>Confirm new password<input type="password" autoComplete="new-password" minLength="6" required value={recoveryConfirm} onChange={(e)=>setRecoveryConfirm(e.target.value)}/></label><button className="primary" disabled={busy}>{busy?'Updating…':'Update password'}</button></form>{message&&<p className="auth-message">{message}</p>}</section></main>

  if (user && mfaGate === 'required') return <main className="auth-shell"><section className="auth-card"><div className="auth-mark"><SteelMark size={30}/></div><div className="eyebrow">TWO-STEP VERIFICATION</div><h1>Confirm it’s you</h1><p>Enter the current 6-digit code from your authenticator app to continue to Steel.</p><form onSubmit={submitMfa} className="auth-form"><label>Authenticator code<input inputMode="numeric" autoComplete="one-time-code" maxLength="6" required value={mfaCode} onChange={(e)=>setMfaCode(e.target.value.replace(/\D/g,''))}/></label><button className="primary" disabled={busy}>{busy?'Checking…':'Continue securely'}</button></form>{message&&<p className="auth-message">{message}</p>}<button className="text-button auth-switch" type="button" onClick={async()=>{await signOut();setUser(null)}}>Use a different account</button></section></main>

  if (!user) return <main className="auth-shell"><section className="auth-card"><div className="auth-mark"><SteelMark size={30}/></div><div className="eyebrow">SPARTAN STRENGTH, EVERY DAY</div><h1>PROJECT <span>STEEL</span></h1><p>{mode === 'reset' ? 'We’ll send a secure link to help you get back in.' : 'Your private training, weight and progress space.'}</p><form onSubmit={submit} className="auth-form"><label>Email<input type="email" autoComplete="email" required value={email} onChange={(e)=>setEmail(e.target.value)}/></label>{mode !== 'reset' && <label>Password<input type="password" autoComplete={mode==='signup'?'new-password':'current-password'} minLength="6" required value={password} onChange={(e)=>setPassword(e.target.value)}/></label>}<button className="primary" disabled={busy}>{busy?'Please wait…':mode==='reset'?'Send reset link':mode==='signup'?'Create account':'Sign in'}</button></form>{message&&<p className="auth-message">{message}</p>}{mode === 'reset' ? <button className="text-button auth-switch" type="button" onClick={()=>{setMode('signin');setMessage('')}}>Back to sign in</button> : <><button className="text-button auth-switch" type="button" onClick={()=>{setMode(mode==='signup'?'signin':'signup');setMessage('')}}>{mode==='signup'?'Already have an account? Sign in':'First time? Create account'}</button>{mode === 'signin' && <button className="text-button auth-switch" type="button" onClick={()=>{setMode('reset');setMessage('')}}>Forgot password?</button>}</>}<div style={{height:'1px',background:'#27313d',margin:'12px 0'}}/><button className="primary" type="button" style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}} onClick={()=>setGuestMode(true)}><Play size={17}/> Try Guest Demo</button><p className="auth-message" style={{marginTop:10}}>Demo mode is isolated from all private account data.</p><div className="auth-private"><LockKeyhole size={15}/> Protected by Supabase authentication + RLS</div></section></main>

  return <AppV3 user={user} onSignOut={async()=>{await signOut();setUser(null)}} />
}
