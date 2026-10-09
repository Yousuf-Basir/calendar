import { UI } from '../i18n/ui.js'
import { useSyncQueue } from '../hooks/useSyncQueue.js'

export default function SyncStatus({ language = 'en' }) {
  const text = UI[language]
  const { isOnline, pendingCount, syncing, sync, lastSynced } = useSyncQueue()
  if (isOnline && pendingCount === 0 && !lastSynced) return null

  return (
    <div className="sync-status">
      <div className="sync-summary" role="status" aria-live="polite">
        {!isOnline && <span className="status-dot status-dot--offline" aria-hidden="true" />}
        {!isOnline && <span>{text.offline}</span>}
        {pendingCount > 0 && (
          <span className="sync-detail">{pendingCount.toLocaleString(language === 'bn' ? 'bn-BD' : 'en')} {text.unsynced}{syncing ? ` · ${text.syncing}` : ''}</span>
        )}
        {lastSynced && pendingCount === 0 && (
          <span className="sync-detail">{text.lastSynced} {new Date(lastSynced).toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en', { hour: '2-digit', minute: '2-digit' })}</span>
        )}
      </div>
      {isOnline && pendingCount > 0 && !syncing && (
        <button className="button button--quiet" onClick={sync}>{text.sync}</button>
      )}
    </div>
  )
}
