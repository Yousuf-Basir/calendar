import { calendarParts, isoToDay } from '../calendar/calendar.js'
import { holidayPeriod } from '../calendar/holidays.js'
import { calendarLabels, formatNumber } from '../calendar/labels.js'
import { holidayName } from '../data/bangladesh-holidays.js'

export default function HolidayList({ viewedDate, language, appLanguage = 'en' }) {
  // Preserve the English-calendar-only holiday view. App language is separate.
  if (language !== 'en') return null
  const labels = calendarLabels(language, appLanguage)
  const numberLanguage = appLanguage === 'bn' ? 'bn' : language
  const { month, holidays, workingDays, missingYears, projectedYears } = holidayPeriod(viewedDate, language)
  const monthLabel = `${labels.months[month.month]} ${formatNumber(month.year, numberLanguage)}`
  return (
    <section className="holiday-list" aria-labelledby="holiday-heading">
      <h3 id="holiday-heading">{labels.holidays}<small>{monthLabel}</small></h3>
      {projectedYears.length > 0 && <p className="calendar-note holiday-warning" role="status">
        {labels.projectedFor} {projectedYears.map(year => formatNumber(year, numberLanguage)).join(', ')} — {labels.projectedWarning}
      </p>}
      {holidays.length > 0 ? (
        <ul>{holidays.map(holiday => {
          const parts = calendarParts(isoToDay(holiday.date), language)
          return <li key={holiday.date}>
            <time dateTime={holiday.date}>
              <strong>{formatNumber(parts.day, numberLanguage, true)}</strong>
              <span>{labels.months[parts.month]} {formatNumber(parts.year, numberLanguage)}</span>
            </time>
            <div>{holidayName(holiday, appLanguage)}
              {holiday.status === 'projected' && <small>{labels.projected}</small>}
              {holiday.scope === 'regional' && <small>{labels.regional}</small>}
            </div>
          </li>
        })}</ul>
      ) : missingYears.length === 0 && <p className="calendar-note">{projectedYears.length ? labels.noneProjected : labels.none}</p>}
      {missingYears.length > 0 && <p className="calendar-note">{labels.unavailable} {missingYears.map(year => formatNumber(year, numberLanguage)).join(', ')}.</p>}
      {workingDays.map(date => {
        const parts = calendarParts(isoToDay(date), language)
        return <p key={date} className="calendar-note">{labels.working}: {formatNumber(parts.day, numberLanguage)} {labels.months[parts.month]} {formatNumber(parts.year, numberLanguage)}</p>
      })}
    </section>
  )
}
