import { useSyncQueue } from '../hooks/useSyncQueue.js'

export default function SyncStatus() {
  const { isOnline, pendingCount, syncing, sync, lastSynced } = useSyncQueue()

  return (
    <div className="sync-status">
      <div className="sync-summary" role="status" aria-live="polite">
        <span className={`status-dot${isOnline ? ' status-dot--online' : ' status-dot--offline'}`} aria-hidden="true" />
        <span>{isOnline ? 'Online' : 'Offline'}</span>
        {pendingCount > 0 && (
          <span className="sync-detail">{pendingCount} unsynced{syncing ? ' · Syncing…' : ''}</span>
        )}
        {lastSynced && pendingCount === 0 && (
          <span className="sync-detail">Last synced {new Date(lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        )}
      </div>
      {isOnline && pendingCount > 0 && !syncing && (
        <button className="button button--quiet" onClick={sync}>Sync now</button>
      )}
    </div>
  )
}
