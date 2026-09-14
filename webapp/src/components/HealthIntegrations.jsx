import { useState } from 'react'
import { Watch, ChevronDown, Link2, Trash2, Unplug } from 'lucide-react'
import { activityConnectionState, activityProviders, formatActivityTimestamp } from '../lib/activityConnections'
import { getNativeRuntime, SteelHealthConnect, SteelHealthKit } from '../lib/nativeBridge'

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

const nativeScopes = ['steps', 'workout_minutes']
const nativeProviderBridges = { apple_health: SteelHealthKit, health_connect: SteelHealthConnect }

function localNativeConnection(provider, result, records) {
  const deniedScopes = result.deniedScopes || []
  const readableScopes = result.readableScopes || nativeScopes
  return {
    provider,
    status: readableScopes.length === nativeScopes.length && deniedScopes.length === 0 ? 'connected' : 'sync_issue',
    scopes: readableScopes,
    consented_at: new Date().toISOString(),
    consent_version: 'native-activity-v1',
    last_synced_at: new Date().toISOString(),
    last_error_at: readableScopes.length === nativeScopes.length && deniedScopes.length === 0 ? null : new Date().toISOString(),
    last_error_code: readableScopes.length === nativeScopes.length && deniedScopes.length === 0 ? null : 'PARTIAL_PERMISSION',
    imported_data_deleted_at: null,
    record_count: records.length,
  }
}

export default function HealthIntegrations({ connections = [], onDisconnect, onDeleteImportedData, onConnect }) {
  const [notice, setNotice] = useState('')
  const [busyProvider, setBusyProvider] = useState('')
  const [consentProvider, setConsentProvider] = useState('')
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [nativeConnections, setNativeConnections] = useState({})
  const byProvider = new Map(connections.map((connection) => [connection.provider, connection]))
  const nativeRuntime = getNativeRuntime()

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

  function beginNativeConnect(provider) {
    setNotice('')
    setConsentAccepted(false)
    setConsentProvider(provider)
  }

  function cancelNativeConnect() {
    if (busyProvider) return
    setConsentProvider('')
    setConsentAccepted(false)
  }

  async function connectNative(provider, name) {
    if (!consentAccepted) return
    setBusyProvider(provider)
    setNotice('')
    try {
      const nativeBridge = nativeProviderBridges[provider]
      const availability = await nativeBridge.isAvailable()
      if (!availability?.available) {
        setNotice(`${name} is unavailable on this device. You can keep using manual activity entry.`)
        return
      }
      const authorization = await nativeBridge.requestAuthorization({ read: nativeScopes, write: [] })
      if (!authorization?.granted) {
        const missing = authorization?.deniedScopes?.length ? ` Missing: ${authorization.deniedScopes.join(' and ')}.` : ''
        setNotice(`${name} access was not granted.${missing} You can review permissions in Settings or continue with manual entry.`)
        return
      }
      const end = new Date()
      const start = new Date(end.getTime() - (7 * 24 * 60 * 60 * 1000))
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      const read = await nativeBridge.readActivity({ start: start.toISOString(), end: end.toISOString(), timeZone })
      const records = Array.isArray(read?.records) ? read.records : []
      const localConnection = localNativeConnection(provider, authorization, records)
      await onConnect?.({ provider, status: localConnection.status, scopes: authorization.readableScopes || nativeScopes, records, observedAt: read?.observed_at, timeZone: read?.time_zone || timeZone })
      setNativeConnections((current) => ({ ...current, [provider]: localConnection }))
      setConsentProvider('')
      setConsentAccepted(false)
      if (localConnection.status === 'connected') setNotice(`${name} connected. ${records.length ? `${records.length} activity records are ready to sync.` : 'No activity was found in the last 7 days.'}`)
      else setNotice(`${name} connected with a sync issue. Some requested metrics are unavailable; review permissions in Settings.`)
    } catch (error) {
      setNotice(error.message || `${name} could not be connected. You can review permissions in Settings or continue with manual entry.`)
    } finally {
      setBusyProvider('')
    }
  }

  async function openProviderSettings(provider, name) {
    try {
      await nativeProviderBridges[provider].openSettings()
    } catch (error) {
      setNotice(error.message || `Open Settings to review ${name} permissions.`)
    }
  }

  return <details className="settings-disclosure health-integrations">
    <summary><span className="settings-disclosure-label"><span className="settings-security-icon"><Watch size={19}/></span><span><span className="eyebrow">HEALTH & WATCH SYNC</span><strong>Health integrations</strong></span></span><ChevronDown size={18}/></summary>
    <div className="health-integrations-content"><p>{nativeRuntime.healthBridgeAvailable || nativeRuntime.healthConnectBridgeAvailable ? 'Native activity connections are available on this device. Steel reads only the scopes you approve; manual entry remains available.' : 'Steel only reads health data after you explicitly connect a supported provider in the native app. There are no connected providers on this web app by default.'}</p>
      <div className="tracker-status-guide" aria-label="Tracker connection states"><strong>Your control</strong><span>Disconnecting stops future syncing and keeps activity already imported. <b>Delete imported data</b> is separate, requires confirmation, and never deletes steps you entered yourself.</span></div>
      <div className="health-provider-grid">{activityProviders.map(({ id, name, description, availability }) => {
        const connection = nativeConnections[id] || byProvider.get(id)
        const state = activityConnectionState(connection)
        const connected = connection && (state.tone === 'connected' || state.tone === 'issue')
        const disconnected = connection && state.tone === 'disconnected'
        const busy = busyProvider === id
        const canConnectNative = Boolean(nativeProviderBridges[id] && ((id === 'apple_health' && nativeRuntime.healthBridgeAvailable) || (id === 'health_connect' && nativeRuntime.healthConnectBridgeAvailable)))
        return <article className="health-provider" key={id}><strong>{name}</strong><span>{description}</span><small className={`tracker-status tracker-status-${state.tone}`}>{state.label}</small><em>{connection ? connectionMessage(connection) : canConnectNative ? 'Available in this native app' : availability}</em>
          {connected ? <div className="tracker-provider-actions"><button type="button" className="tracker-disconnect-button" disabled={busy} onClick={() => disconnect(id, name)}><Unplug size={14}/>{busy ? 'Updating…' : 'Disconnect'}</button>{canConnectNative && state.tone === 'issue' && <button type="button" className="tracker-secondary-button" disabled={busy} onClick={() => openProviderSettings(id, name)}>Review permissions</button>}<button type="button" className="tracker-delete-button" disabled={busy} onClick={() => deleteImportedData(id, name)}><Trash2 size={14}/>{busy ? 'Deleting…' : 'Delete imported data'}</button></div> : disconnected ? <div className="tracker-provider-actions"><button type="button" className="tracker-connect-button" onClick={() => canConnectNative ? beginNativeConnect(id) : setNotice(`${name} cannot be connected here yet. Steel will request clear, provider-specific consent before a supported native connection is enabled.`)}><Link2 size={14}/>{canConnectNative ? 'Reconnect' : 'Connect'}</button><button type="button" className="tracker-delete-button" disabled={busy} onClick={() => deleteImportedData(id, name)}><Trash2 size={14}/>{busy ? 'Deleting…' : 'Delete imported data'}</button></div> : canConnectNative ? consentProvider === id ? <div className="native-consent-panel"><p>Steel can read steps and workout time to show your activity progress. It will not write to your health app or read sleep, heart rate or medical data.</p><label><input type="checkbox" checked={consentAccepted} onChange={(event) => setConsentAccepted(event.target.checked)}/><span>I understand and want to connect {name}.</span></label><div><button type="button" className="tracker-connect-button" disabled={!consentAccepted || busy} onClick={() => connectNative(id, name)}><Link2 size={14}/>{busy ? 'Connecting…' : 'Continue'}</button><button type="button" className="tracker-secondary-button" disabled={busy} onClick={cancelNativeConnect}>Cancel</button></div></div> : <button type="button" className="tracker-connect-button" onClick={() => beginNativeConnect(id)}><Link2 size={14}/> Connect</button> : <button type="button" className="tracker-connect-button" onClick={() => setNotice(`${name} cannot be connected here yet. Steel will request clear, provider-specific consent before a supported native connection is enabled.`)}><Link2 size={14}/> Connect</button>}</article>
      })}</div>
      {notice && <p className="tracker-connect-notice" role="status">{notice}</p>}
    </div>
  </details>
}
