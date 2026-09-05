import { useState } from 'react'
import { Save, Footprints } from 'lucide-react'
import { saveManualSteps } from '../lib/steelApi'

export default function ManualSteps({ userId, steps, onSaved }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function submit(event) {
    event.preventDefault()
    setBusy(true); setMessage('')
    try {
      await saveManualSteps(userId, value)
      await onSaved()
      setMessage(steps.source && steps.source !== 'manual' ? 'Manual total saved. Connected data still takes priority.' : 'Today’s step total saved.')
      setOpen(false)
    } catch (error) { setMessage(error.message || 'Could not save steps. Please try again.') }
    finally { setBusy(false) }
  }
  return <div className="manual-steps">
    <button type="button" className="text-link" aria-expanded={open} aria-controls="manual-step-form" onClick={() => { setValue(String(steps.steps || '')); setOpen(!open); setMessage('') }}><Footprints size={16}/>{open ? 'Close step entry' : 'Add / edit steps'}</button>
    {open && <form id="manual-step-form" onSubmit={submit}>
      <label htmlFor="manual-step-total">Today’s total steps</label>
      <div className="manual-steps-input"><input id="manual-step-total" type="number" inputMode="numeric" min="0" max="200000" step="1" required value={value} onChange={event => setValue(event.target.value)} disabled={busy}/><button className="gold-button" disabled={busy}><Save size={16}/>{busy ? 'Saving…' : 'Save steps'}</button></div>
      <small>Enter your total for today. Saving replaces your previous manual total; it doesn’t add to it. Connected totals take priority.</small>
    </form>}
    {message && <p role="status">{message}</p>}
  </div>
}
