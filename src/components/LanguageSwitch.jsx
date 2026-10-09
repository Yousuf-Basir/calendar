import { UI } from '../i18n/ui.js'
const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'bn', label: 'Bangla' },
  { id: 'ar', label: 'Arabic' },
]

export default function LanguageSwitch({ value, onChange, appLanguage = 'en' }) {
  return (
    <div className="language-switch" role="group" aria-label={UI[appLanguage].calendarType}>
      {LANGUAGES.map(({ id }, index) => (
        <button
          key={id}
          type="button"
          className="language-switch-button"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
        >
          {UI[appLanguage].types[index]}
        </button>
      ))}
    </div>
  )
}
