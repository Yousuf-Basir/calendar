import { calendarMonth, dayToIso } from './calendar.js'
import { BANGLADESH_HOLIDAYS, WORKING_DAYS } from '../data/bangladesh-holidays.js'

// Keep the English holiday month when switching calendar systems. Native
// months have different boundaries; conversion changes each displayed date.
export function holidayPeriod(viewedDate) {
  const month = calendarMonth(viewedDate, 'en')
  const start = dayToIso(month.start)
  const end = dayToIso(month.end)
  const contains = (date) => date >= start && date < end
  return {
    month,
    holidays: BANGLADESH_HOLIDAYS.filter((holiday) => contains(holiday.date)),
    workingDays: [...WORKING_DAYS].filter(contains),
  }
}
