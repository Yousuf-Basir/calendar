import { UI } from '../i18n/ui.js'
import { useEffect, useRef } from 'react'
import { installInstructions } from '../pwa/install.js'
import { installController } from '../pwa/installStore.js'

export default function InstallDrawer({ state, language = 'en' }) {
  const text = UI[language]
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
      <aside className="install-offer" aria-label={text.getApp}>
        <p>{text.keep}</p>
        <button className="install-pill" type="button" onClick={() => installController.open()}>
          <img src="/icons/calendar-custom-32.png" alt="" width="22" height="22" />
          {text.get} <span aria-hidden="true">↗</span>
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
          <img className="install-app-icon" src="/icons/calendar-custom-192.png" alt={text.icon} width="76" height="76" />
          <div><p className="install-eyebrow">{text.eyebrow}</p><h2 id="install-title">{text.title}</h2><p>{text.tagline}</p></div>
        </div>
        <div className="install-features" aria-label={text.features}>
          <span><strong>{language === 'bn' ? '৩' : '3'}</strong>{text.calendars}</span><span><strong>{text.offline}</strong>{text.always}</span><span><strong>{text.free}</strong>{text.account}</span>
        </div>
        <p id="install-description">{text.description}</p>
        {state.instructions && <div className="install-instructions" role="status">
          <h3>{text.add}</h3>
          <ol>{installInstructions(window, language).map((step) => <li key={step}>{step}</li>)}</ol>
          <p>{text.once}</p>
        </div>}
        {state.message && <p role="status" className="install-message">{text.fallback}</p>}
        <div className="install-actions">
          <button type="button" className="install-primary" disabled={state.busy} onClick={() => installController.install()}>{state.busy ? text.opening : text.install}</button>
          <button type="button" className="install-cancel" disabled={state.busy} onClick={() => installController.cancel()}>{text.cancel}</button>
        </div>
      </dialog>
    </>
  )
}
