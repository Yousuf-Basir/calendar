import { calendarMonth, dayToIso } from './calendar.js'
import { BANGLADESH_HOLIDAYS, HOLIDAY_YEARS, WORKING_DAYS } from '../data/bangladesh-holidays.js'

// Holidays and special working days must follow the visible calendar month.
export function holidayPeriod(viewedDate, system = 'en') {
  const month = calendarMonth(viewedDate, system)
  const start = dayToIso(month.start)
  const end = dayToIso(month.end)
  const contains = (date) => date >= start && date < end
  const firstYear = Number(start.slice(0, 4))
  const lastYear = Number(dayToIso(month.end - 1).slice(0, 4))
  const missingYears = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => firstYear + index)
    .filter((year) => !HOLIDAY_YEARS.includes(year))
  return {
    month,
    missingYears,
    holidays: BANGLADESH_HOLIDAYS.filter((holiday) => contains(holiday.date)),
    workingDays: [...WORKING_DAYS].filter(contains),
  }
}
