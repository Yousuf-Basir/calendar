import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import InstallDrawer from './components/InstallDrawer.jsx'
import { installController } from './pwa/installStore.js'
import SyncStatus from './components/SyncStatus.jsx'
import LanguageSwitch from './components/LanguageSwitch.jsx'
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
        <h1 className="app-name">Calendar</h1>
        <LanguageSwitch value={language} onChange={setLanguage} />
      </header>
      <SyncStatus />
      <main className="home" lang={language === 'bn' ? 'bn' : 'en'} data-language={language}>
        <Calendar language={language} viewedDate={viewedDate} today={today} onChangeMonth={setViewedDate} />
      </main>
      <InstallDrawer state={installState} />
    </div>
  )
}
