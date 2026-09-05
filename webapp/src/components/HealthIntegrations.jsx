import { Watch, ChevronDown } from 'lucide-react'

const providers = [
  ['Apple Health', 'iPhone + Apple Watch', 'Planned'],
  ['Health Connect', 'Android health data', 'Planned'],
  ['Samsung Health', 'Galaxy Watch ecosystem', 'Planned'],
  ['Garmin Connect', 'Garmin watches', 'Under consideration'],
  ['Fitbit', 'Fitbit devices', 'Under consideration'],
  ['Oura', 'Sleep and recovery', 'Under consideration'],
  ['WHOOP', 'Recovery and activity', 'Under consideration'],
]

export default function HealthIntegrations() {
  return <details className="settings-disclosure health-integrations">
    <summary><span className="settings-disclosure-label"><span className="settings-security-icon"><Watch size={19}/></span><span><span className="eyebrow">HEALTH & WATCH SYNC</span><strong>Health integrations</strong></span></span><ChevronDown size={18}/></summary>
    <div className="health-integrations-content"><p>Log steps manually today. Connected health services are being planned; none of the providers below is connected to Steel yet.</p>
      <div className="health-provider-grid">{providers.map(([name, description, status]) => <article className="health-provider" key={name}><strong>{name}</strong><span>{description}</span><small>{status}</small></article>)}</div>
    </div>
  </details>
}
