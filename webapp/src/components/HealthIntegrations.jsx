import { useState } from 'react'
import { Watch, ChevronDown, Link2, Trash2, Unplug } from 'lucide-react'
import { activityConnectionState, activityProviders, formatActivityTimestamp } from '../lib/activityConnections'

function connectionMessage(connection) {
  if (!connection) return 'No health data is connected to Steel.'
  const lastSync = formatActivityTimestamp(connection.last_synced_at)
  const disconnected = formatActivityTimestamp(connection.disconnected_at)
  const deleted = formatActivityTimestamp(connection.imported_data_deleted_at)
  if (connection.status === 'sync_issue') return `Steel could not complete the latest sync${connection.last_error_at ? ` on ${formatActivityTimestamp(connection.last_error_at)}` : ''}.`
  if (connection.status === 'disconnected') return disconnected ? `Syncing stopped on ${disconnected}.` : 'Syncing is stopped.'
  if (lastSync) return `Last successful sync: ${lastSync}.`
  if (deleted) return `Imported activity was last deleted on ${deleted}.`
  return connection.consented_at ? 'Connection consent is recorded; awaiting the first successful sync.' : 'Awaiting connection consent.'
}

export default function HealthIntegrations({ connections = [], onDisconnect, onDeleteImportedData }) {
  const [notice, setNotice] = useState('')
  const [busyProvider, setBusyProvider] = useState('')
  const byProvider = new Map(connections.map((connection) => [connection.provider, connection]))

  async function disconnect(provider, name) {
    if (!window.confirm(`Disconnect ${name}? Steel will stop future syncing. Activity already imported from ${name} will remain unless you choose “Delete imported data”.`)) return
    setBusyProvider(provider)
    setNotice('')
    try {
      await onDisconnect?.(provider)
      setNotice(`${name} is disconnected. Previously imported activity was kept.`)
    } catch (error) {
      setNotice(error.message || `Steel could not disconnect ${name}. Please try again.`)
    } finally {
      setBusyProvider('')
    }
  }

  async function deleteImportedData(provider, name) {
    if (!window.confirm(`Delete all activity imported from ${name}? This cannot be undone. Your manually entered steps will stay in Steel.`)) return
    setBusyProvider(provider)
    setNotice('')
    try {
      await onDeleteImportedData?.(provider)
      setNotice(`Imported ${name} activity has been deleted. Manually entered steps were kept.`)
    } catch (error) {
      setNotice(error.message || `Steel could not delete imported ${name} activity. Please try again.`)
    } finally {
      setBusyProvider('')
    }
  }

  return <details className="settings-disclosure health-integrations">
    <summary><span className="settings-disclosure-label"><span className="settings-security-icon"><Watch size={19}/></span><span><span className="eyebrow">HEALTH & WATCH SYNC</span><strong>Health integrations</strong></span></span><ChevronDown size={18}/></summary>
    <div className="health-integrations-content"><p>Steel only reads health data after you explicitly connect a supported provider in a future native app. There are no connected providers on this web app by default.</p>
      <div className="tracker-status-guide" aria-label="Tracker connection states"><strong>Your control</strong><span>Disconnecting stops future syncing and keeps activity already imported. <b>Delete imported data</b> is separate, requires confirmation, and never deletes steps you entered yourself.</span></div>
      <div className="health-provider-grid">{activityProviders.map(({ id, name, description, availability }) => {
        const connection = byProvider.get(id)
        const state = activityConnectionState(connection)
        const connected = connection && state.tone !== 'not-connected'
        const busy = busyProvider === id
        return <article className="health-provider" key={id}><strong>{name}</strong><span>{description}</span><small className={`tracker-status tracker-status-${state.tone}`}>{state.label}</small><em>{connection ? connectionMessage(connection) : availability}</em>
          {connected ? <div className="tracker-provider-actions">{state.tone !== 'disconnected' && <button type="button" className="tracker-disconnect-button" disabled={busy} onClick={() => disconnect(id, name)}><Unplug size={14}/>{busy ? 'Updating…' : 'Disconnect'}</button>}<button type="button" className="tracker-delete-button" disabled={busy} onClick={() => deleteImportedData(id, name)}><Trash2 size={14}/>{busy ? 'Deleting…' : 'Delete imported data'}</button></div> : <button type="button" className="tracker-connect-button" onClick={() => setNotice(`${name} cannot be connected from this web app yet. Steel will request clear, provider-specific consent before a supported native connection is enabled.`)}><Link2 size={14}/> Connect</button>}</article>
      })}</div>
      {notice && <p className="tracker-connect-notice" role="status">{notice}</p>}
    </div>
  </details>
}
