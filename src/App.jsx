import { useSyncExternalStore } from 'react'
import InstallDrawer from './components/InstallDrawer.jsx'
import SyncStatus from './components/SyncStatus.jsx'
import { installController } from './pwa/installStore.js'

export default function App() {
  const installState = useSyncExternalStore(installController.subscribe, installController.getSnapshot)

  return (
    <div className={`app-shell${installState.ready && !installState.installed ? ' has-install-offer' : ''}`}>
      <header className="app-header">
        <h1 className="app-name">Offline PWA</h1>
        <SyncStatus />
      </header>
      <main className="home">
        <h2>Your next app starts here.</h2>
        <p>A minimal React starter that works offline and installs on your device.</p>
        <p>Build your app here. Local storage, a sync queue, and the installation flow are ready to use.</p>
      </main>
      <InstallDrawer state={installState} />
    </div>
  )
}
