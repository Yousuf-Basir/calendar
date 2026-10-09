import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import InstallDrawer from './components/InstallDrawer.jsx'
import { installController } from './pwa/installStore.js'
import SyncStatus from './components/SyncStatus.jsx'
import LanguageSwitch from './components/LanguageSwitch.jsx'
import SettingsDrawer from './components/SettingsDrawer.jsx'
import { UI, readLanguage, saveLanguage } from './i18n/ui.js'
import Calendar from './components/Calendar.jsx'
import { todayInBangladesh } from './calendar/calendar.js'

// Refresh the date when the app is left open overnight or resumed on mobile.
function useToday() {
  const [today, setToday] = useState(() => todayInBangladesh())
  useEffect(() => {
    const refresh = () => setToday(todayInBangladesh())
    const interval = window.setInterval(refresh, 60_000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])
  return today
}

export default function App() {
  const installState = useSyncExternalStore(installController.subscribe, installController.getSnapshot)
  const [language, setLanguage] = useState('en')
  const [appLanguage, setAppLanguage] = useState(() => {
    try { return readLanguage(window.localStorage) } catch { return 'en' }
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const text = UI[appLanguage]
  useEffect(() => {
    document.documentElement.lang = appLanguage
    document.title = text.title
    try { saveLanguage(window.localStorage, appLanguage) } catch { /* Storage may be blocked. */ }
  }, [appLanguage, text.title])
  const today = useToday()
  const [viewedDate, setViewedDate] = useState(today)
  const previousToday = useRef(today)
  useEffect(() => {
    const previous = previousToday.current
    setViewedDate((current) => current === previous ? today : current)
    previousToday.current = today
  }, [today])

  return (
    <div className={`app-shell${installState.ready && !installState.installed ? ' has-install-offer' : ''}`}>
      <header className="app-header">
        <div className="app-brand">
          <button type="button" className="menu-button" aria-label={text.menu} aria-expanded={menuOpen} aria-controls="settings-drawer" onClick={() => setMenuOpen(true)}>
            <span className="burger-icon" aria-hidden="true"><span /><span /><span /></span>
          </button>
          <h1 className="app-name">{text.title}</h1>
        </div>
        <LanguageSwitch appLanguage={appLanguage} value={language} onChange={setLanguage} />
      </header>
      <SyncStatus language={appLanguage} />
      <main className="home" lang={appLanguage} data-language={appLanguage}>
        <Calendar appLanguage={appLanguage} language={language} viewedDate={viewedDate} today={today} onChangeMonth={setViewedDate} />
      </main>
      <SettingsDrawer open={menuOpen} onClose={() => setMenuOpen(false)} language={appLanguage} onChangeLanguage={setAppLanguage} />
      <InstallDrawer language={appLanguage} state={installState} />
    </div>
  )
}
