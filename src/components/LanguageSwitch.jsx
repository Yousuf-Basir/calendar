const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'bn', label: 'Bangla' },
  { id: 'ar', label: 'Arabic' },
]

export default function LanguageSwitch({ value, onChange }) {
  return (
    <div className="language-switch" role="group" aria-label="Calendar language">
      {LANGUAGES.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          className="language-switch-button"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
