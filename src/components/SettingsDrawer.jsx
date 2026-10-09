import { useEffect, useRef } from 'react'
import { UI } from '../i18n/ui.js'

export default function SettingsDrawer({ open, onClose, language, onChangeLanguage }) {
  const dialog = useRef(null)
  const text = UI[language]
  useEffect(() => {
    const element = dialog.current
    if (!open) return
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    element.showModal()
    return () => { element.close(); document.body.style.overflow = overflow }
  }, [open])

  return (
    <dialog ref={dialog} id="settings-drawer" className="settings-drawer" aria-labelledby="settings-title"
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onClick={(event) => {
        if (event.target !== dialog.current) return
        const bounds = dialog.current.getBoundingClientRect()
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose()
      }}>
      <header className="settings-header">
        <h2 id="settings-title">{text.settings}</h2>
        <button type="button" className="menu-button" aria-label={text.close} onClick={onClose}><span aria-hidden="true">×</span></button>
      </header>
      <fieldset className="settings-language">
        <legend>{text.language}</legend>
        {[['en', language === 'bn' ? 'ইংরেজি' : 'English'], ['bn', 'বাংলা']].map(([value, label]) => (
          <label key={value} lang={language === 'bn' ? 'bn' : value}>
            <span>{label}</span>
            <input type="radio" name="app-language" value={value} checked={language === value} onChange={() => onChangeLanguage(value)} />
          </label>
        ))}
      </fieldset>
    </dialog>
  )
}
