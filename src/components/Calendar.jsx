import { useLayoutEffect, useRef } from 'react'
import {
  calendarMonth, calendarParts, canShiftMonth, dayToIso,
  monthCells, shiftMonth, weekdayIndex,
  isoToDay,
} from '../calendar/calendar.js'
import { holidayPeriod } from '../calendar/holidays.js'
import { formatGregorianRange, formatNumber, calendarLabels } from '../calendar/labels.js'
import {
  holidayForDate, holidayName,
} from '../data/bangladesh-holidays.js'

function dateLabel(day, language, appLanguage) {
  const parts = calendarParts(day, language)
  const labels = calendarLabels(language, appLanguage)
  const numberLanguage = appLanguage === 'bn' ? 'bn' : language
  const holiday = language === 'en' ? holidayForDate(dayToIso(day)) : undefined
  return `${labels.weekdayNames[weekdayIndex(day)]}, ${formatNumber(parts.day, numberLanguage)} ${labels.months[parts.month]} ${formatNumber(parts.year, numberLanguage)}${holiday ? `, ${holidayName(holiday, appLanguage)}${holiday.scope === 'regional' ? ` (${labels.regional})` : ''}` : ''}`
}

function MonthGrid({ month, language, today, active, appLanguage }) {
  const labels = calendarLabels(language, appLanguage)
  const numberLanguage = appLanguage === 'bn' ? 'bn' : language
  const cells = monthCells(month)
  return (
    <div className="month-page" aria-hidden={active ? undefined : true} inert={active ? undefined : ''}>
      <table className="month-grid">
        <caption className="sr-only">{labels.months[month.month]} {formatNumber(month.year, numberLanguage)}</caption>
        <thead>
          <tr>{labels.weekdays.map((name, index) => (
            <th key={name} scope="col" className={index === 5 ? 'is-friday' : undefined}>
              <abbr title={labels.weekdayNames[index]}>{name}</abbr>
            </th>
          ))}</tr>
        </thead>
        <tbody>{Array.from({ length: 6 }, (_, row) => (
          <tr key={row}>{cells.slice(row * 7, row * 7 + 7).map((day, column) => {
            if (day === null) return <td key={column} className="calendar-blank" />
            const holiday = language === 'en' ? holidayForDate(dayToIso(day)) : undefined
            const parts = calendarParts(day, language)
            return (
              <td key={column}>
                <time
                  dateTime={dayToIso(day)}
                  className={`calendar-day${column === 5 ? ' is-friday' : ''}${day === today ? ' is-today' : ''}`}
                  data-date={dayToIso(day)}
                  aria-label={dateLabel(day, language, appLanguage)}
                  aria-current={day === today ? 'date' : undefined}
                >
                  <span>{formatNumber(parts.day, numberLanguage)}</span>
                  {holiday && <span className={`holiday-marker${holiday.scope === 'regional' ? ' holiday-marker--regional' : ''}`} aria-hidden="true" />}
                </time>
              </td>
            )
          })}</tr>
        ))}</tbody>
      </table>
    </div>
  )
}

export default function Calendar({ language, appLanguage = 'en', viewedDate, today, onChangeMonth }) {
  const carousel = useRef(null)
  const settleTimer = useRef(null)
  const moving = useRef(false)
  const month = calendarMonth(viewedDate, language)
  const labels = calendarLabels(language, appLanguage)
  const numberLanguage = appLanguage === 'bn' ? 'bn' : language
  const previous = calendarMonth(month.start - 1, language)
  const next = calendarMonth(month.end, language)
  const canPrevious = canShiftMonth(viewedDate, language, -1)
  const canNext = canShiftMonth(viewedDate, language, 1)

  // Native scrolling follows the finger without React renders. After snapping,
  // rotate three month pages and recenter before paint, retaining swipe momentum.
  useLayoutEffect(() => {
    const element = carousel.current
    const center = () => {
      clearTimeout(settleTimer.current)
      element.style.setProperty('--calendar-cell-size', `${Math.max(30, (element.clientWidth - 24) / 7)}px`)
      element.scrollLeft = element.clientWidth
      moving.current = false
    }
    center()
    const resize = new ResizeObserver(center)
    resize.observe(element)
    return () => {
      clearTimeout(settleTimer.current)
      resize.disconnect()
    }
  }, [month.key])

  const settle = () => {
    const element = carousel.current
    const page = Math.round(element.scrollLeft / element.clientWidth)
    const direction = Math.max(-1, Math.min(1, page - 1))
    if (direction && canShiftMonth(viewedDate, language, direction)) {
      onChangeMonth(shiftMonth(viewedDate, language, direction))
    } else {
      element.scrollLeft = element.clientWidth
      moving.current = false
    }
  }
  const onScroll = () => {
    clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(settle, 140)
  }
  const navigate = (direction) => {
    if (moving.current || !canShiftMonth(viewedDate, language, direction)) return
    moving.current = true
    carousel.current.scrollTo({
      left: carousel.current.clientWidth * (1 + direction),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    })
  }
  const { holidays: monthHolidays, workingDays, missingYears } = holidayPeriod(viewedDate, language)
  const holidayMonthLabel = `${labels.months[month.month]} ${formatNumber(month.year, numberLanguage)}`

  return (
    <section className="calendar" aria-label={`${labels.months[month.month]} ${formatNumber(month.year, numberLanguage)}`}>
      <div className="calendar-toolbar">
        <h2 className="calendar-month-heading" aria-live="polite" aria-atomic="true">
          {labels.months[month.month]} <span>{formatNumber(month.year, numberLanguage)}</span>
          {language !== 'en' && <small className="calendar-english-range" lang={appLanguage}>{formatGregorianRange(month, appLanguage)}</small>}
        </h2>
        <div className="calendar-navigation">
          {(today < month.start || today >= month.end) && (
            <button type="button" className="calendar-today" onClick={() => onChangeMonth(today)}>{labels.today}</button>
          )}
          <button type="button" className="calendar-arrow calendar-arrow--previous" aria-label={labels.previous} disabled={!canPrevious} onClick={() => navigate(-1)} />
          <button type="button" className="calendar-arrow" aria-label={labels.next} disabled={!canNext} onClick={() => navigate(1)} />
        </div>
      </div>
      <div className="calendar-carousel" ref={carousel} onScroll={onScroll} dir="ltr">
        {[previous, month, next].map((page, index) => (
          <MonthGrid key={page.key} month={page} language={language} appLanguage={appLanguage} today={today} active={index === 1} />
        ))}
      </div>
      {language === 'ar' && (
        <p className="calendar-note">
          {month.confirmed ? labels.confirmed : labels.estimated}
          {(!month.confirmed || !month.lengthConfirmed) && <span>{labels.moonNote}</span>}
        </p>
      )}
      {language === 'en' && <section className="holiday-list" aria-labelledby="holiday-heading">
        <h3 id="holiday-heading">{labels.holidays}<small>{holidayMonthLabel}</small></h3>
        {monthHolidays.length > 0 ? (
          <ul>{monthHolidays.map((holiday) => {
            const day = isoToDay(holiday.date)
            const parts = calendarParts(day, language)
            return (
              <li key={holiday.date}>
                <time dateTime={holiday.date}>
                  <strong>{formatNumber(parts.day, numberLanguage, true)}</strong>
                  <span>{labels.months[parts.month]} {formatNumber(parts.year, numberLanguage)}</span>
                </time>
                <div>{holidayName(holiday, appLanguage)}{holiday.scope === 'regional' && <small>{labels.regional}</small>}</div>
              </li>
            )
          })}</ul>
        ) : missingYears.length === 0 && <p className="calendar-note">{labels.none}</p>}
        {missingYears.length > 0 && <p className="calendar-note">{labels.unavailable} {missingYears.map((year) => formatNumber(year, numberLanguage)).join(', ')}.</p>}
        {workingDays.map((date) => {
          const parts = calendarParts(isoToDay(date), language)
          return <p key={date} className="calendar-note">{labels.working}: {formatNumber(parts.day, numberLanguage)} {labels.months[parts.month]} {formatNumber(parts.year, numberLanguage)}</p>
        })}
      </section>}
    </section>
  )
}
