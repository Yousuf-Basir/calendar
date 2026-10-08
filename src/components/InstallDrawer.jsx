import { useEffect, useRef } from 'react'
import { installInstructions } from '../pwa/install.js'
import { installController } from '../pwa/installStore.js'

export default function InstallDrawer({ state }) {
  const dialog = useRef(null)
  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (state.open && !state.installed) {
      const previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      if (!element.open) element.showModal()
      return () => {
        if (element.open) element.close()
        document.body.style.overflow = previousOverflow
      }
    }
    if (element.open) element.close()
  }, [state.open, state.installed])

  if (!state.ready || state.installed) return null
  return (
    <>
      <aside className="install-offer" aria-label="Get the Calendar app">
        <p>Keep your calendar one tap away.</p>
        <button className="install-pill" type="button" onClick={() => installController.open()}>
          <img src="/icons/calendar-image-32.png" alt="" width="22" height="22" />
          Get Calendar <span aria-hidden="true">↗</span>
        </button>
      </aside>
      <dialog ref={dialog} className="install-drawer" aria-labelledby="install-title" aria-describedby="install-description"
        onCancel={(event) => { event.preventDefault(); if (!state.busy) installController.cancel() }}
        onClick={(event) => {
          if (event.target !== dialog.current || state.busy) return
          const bounds = dialog.current.getBoundingClientRect()
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) installController.cancel()
        }}>
        <div className="drawer-handle" aria-hidden="true" />
        <div className="install-app">
          <img className="install-app-icon" src="/icons/calendar-image-192.png" alt="Calendar app icon" width="76" height="76" />
          <div><p className="install-eyebrow">YOUR EVERYDAY COMPANION</p><h2 id="install-title">Calendar</h2><p>Make room for your days.</p></div>
        </div>
        <div className="install-features" aria-label="App features">
          <span><strong>3</strong>Calendars</span><span><strong>Offline</strong>Always with you</span><span><strong>Free</strong>No account needed</span>
        </div>
        <p id="install-description">Add Calendar to your home screen. Your dates and Bangladesh holidays, even without internet.</p>
        {state.instructions && <div className="install-instructions" role="status">
          <h3>Add Calendar to your device</h3>
          <ol>{installInstructions(window).map((step) => <li key={step}>{step}</li>)}</ol>
          <p>Once added, open Calendar from its icon.</p>
        </div>}
        {state.message && <p role="status" className="install-message">{state.message}</p>}
        <div className="install-actions">
          <button type="button" className="install-primary" disabled={state.busy} onClick={() => installController.install()}>{state.busy ? 'Opening…' : 'Install'}</button>
          <button type="button" className="install-cancel" disabled={state.busy} onClick={() => installController.cancel()}>Cancel</button>
        </div>
      </dialog>
    </>
  )
}
