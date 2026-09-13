import { useState } from 'react'
import { Watch, ChevronDown, Link2 } from 'lucide-react'

const providers = [
  ['Apple Health', 'iPhone + Apple Watch', 'Planned for the native iPhone app'],
  ['Health Connect', 'Android health data', 'Planned for the native Android app'],
  ['Samsung Health', 'Galaxy Watch ecosystem', 'Under consideration'],
  ['Garmin Connect', 'Garmin watches', 'Requires partner approval'],
  ['Fitbit', 'Fitbit devices', 'Under consideration'],
  ['Oura', 'Sleep and recovery', 'Under consideration'],
  ['WHOOP', 'Recovery and activity', 'Under consideration'],
]

export default function HealthIntegrations() {
  const [notice, setNotice] = useState('')
  return <details className="settings-disclosure health-integrations">
    <summary><span className="settings-disclosure-label"><span className="settings-security-icon"><Watch size={19}/></span><span><span className="eyebrow">HEALTH & WATCH SYNC</span><strong>Health integrations</strong></span></span><ChevronDown size={18}/></summary>
    <div className="health-integrations-content"><p>Log steps manually today. No health provider is connected to Steel yet, and this page does not collect health data.</p>
      <div className="tracker-status-guide" aria-label="Tracker connection states"><strong>Connection states</strong><span><b>Not connected</b> is your current status. <b>Connected</b> and <b>Sync issue</b> will only appear after you explicitly connect a supported native provider.</span></div>
      <div className="health-provider-grid">{providers.map(([name, description, status]) => <article className="health-provider" key={name}><strong>{name}</strong><span>{description}</span><small>Not connected</small><em>{status}</em><button type="button" className="tracker-connect-button" onClick={() => setNotice(`${name} cannot be connected yet. Steel will ask for your consent before any supported connection is enabled.`)}><Link2 size={14}/> Connect</button></article>)}</div>
      {notice && <p className="tracker-connect-notice" role="status">{notice}</p>}
    </div>
  </details>
}
