import { useEffect, useState } from 'react'
import { Bell, ChevronDown, Save } from 'lucide-react'
import { normalizeReminders, dueReminders } from '../lib/reminders'
import { localDay } from '../lib/steps'
import { saveNotificationPreferences } from '../lib/steelApi'

const labels = { workout: 'Workout reminder', meal: 'Meal completion reminder', motivation: 'Morning motivation' }
const bodies = { workout: 'Your Project Steel workout is ready when you are.', meal: 'Review what you ate and keep your diary current.', motivation: 'Small steps today build a stronger you.' }

export function useSteelReminders(userId, preferences) {
  useEffect(() => {
    if (!userId || typeof Notification === 'undefined') return
    const storageKey = `steel-reminders:${userId}`
    let sent = {}
    try { sent = JSON.parse(localStorage.getItem(storageKey) || '{}') || {} } catch { /* Use in-memory deduplication when storage is unavailable. */ }
    function tick() {
      if (Notification.permission !== 'granted') return
      try { sent = { ...sent, ...JSON.parse(localStorage.getItem(storageKey) || '{}') } } catch { /* Keep this tab’s state. */ }
      const now = new Date()
      for (const key of dueReminders(preferences, now, sent)) {
        try {
          new Notification(labels[key], { body: bodies[key], icon: '/steel-mark.svg', tag: `steel-${key}-${localDay(now)}` })
          sent[key] = localDay(now)
          try { localStorage.setItem(storageKey, JSON.stringify(sent)) } catch { /* The reminder still works for this open tab. */ }
        } catch { /* Some mobile browsers require a future service-worker delivery channel. */ }
      }
    }
    tick()
    const timer = window.setInterval(tick, 30000)
    return () => window.clearInterval(timer)
  }, [userId, preferences])
}

export default function ReminderSettings({ userId, initialPreferences, onSaved }) {
  const [values, setValues] = useState(() => normalizeReminders(initialPreferences))
  const [permission, setPermission] = useState(() => typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => setValues(normalizeReminders(initialPreferences)), [initialPreferences])
  function update(key, patch) { setValues(current => ({ ...current, [key]: { ...current[key], ...patch } })) }
  async function enableNotifications() {
    try { setPermission(await Notification.requestPermission()) }
    catch { setMessage('This browser cannot enable alerts here. Your reminder preferences can still be saved.') }
  }
  async function save(event) {
    event.preventDefault(); setBusy(true); setMessage('')
    try { const profile = await saveNotificationPreferences(userId, values); onSaved(profile); setMessage('Reminder preferences saved.') }
    catch (error) { setMessage(error.message || 'Could not save reminders. Please try again.') }
    finally { setBusy(false) }
  }
  return <details className="settings-disclosure reminder-disclosure">
    <summary><span className="settings-disclosure-label"><span className="settings-security-icon"><Bell size={19}/></span><span><span className="eyebrow">NOTIFICATIONS & REMINDERS</span><strong>Stay on track</strong></span></span><ChevronDown size={18}/></summary>
    <form className="reminder-form" onSubmit={save}>
      <p>Choose what Steel should prompt you to do and when.</p>
      <button type="button" className="reminder-permission" onClick={enableNotifications} disabled={permission === 'granted' || permission === 'unsupported' || permission === 'denied'}><Bell size={17}/>{permission === 'granted' ? 'Browser notifications enabled' : permission === 'denied' ? 'Notifications blocked — enable them in browser settings' : permission === 'unsupported' ? 'Browser notifications unavailable' : 'Enable browser notifications'}</button>
      {Object.entries(values).map(([key, value]) => <section className="reminder-row" key={key}>
        <label className="reminder-toggle"><strong>{labels[key]}</strong><input type="checkbox" checked={value.enabled} disabled={busy} onChange={event => update(key, { enabled: event.target.checked })}/></label>
        {value.enabled && <div className="reminder-schedule"><label>Notify at <input type="time" required value={value.time} disabled={busy} onChange={event => update(key, { time: event.target.value })}/></label>
          {key === 'workout' && <div className="reminder-days" role="group" aria-label="Workout reminder days">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => <button key={day} type="button" aria-pressed={value.days.includes(index)} disabled={busy} onClick={() => update(key, { days: value.days.includes(index) ? value.days.filter(item => item !== index) : [...value.days, index].sort() })}>{day}</button>)}</div>}
        </div>}
      </section>)}
      <small>Times follow this device’s local time. Browser alerts work while Steel is open on supported desktop browsers. Notifications with the app closed require a future push integration.</small>
      {message && <p role="status">{message}</p>}
      <button className="gold-button" disabled={busy}><Save size={17}/>{busy ? 'Saving…' : 'Save reminders'}</button>
    </form>
  </details>
}
