/**
 * Utility functions for the 10-10 month cycle (10th to 10th).
 * The client's accounting period runs from the 10th of one month to the 9th of
 * the next (e.g. July 10 – August 9).
 *
 * TIMEZONE: Pakistan Standard Time = UTC+5.
 * Vercel servers run in UTC, so all "what day is it?" questions must be answered
 * in PKT, not UTC.  We shift by +5 hours before extracting year/month/day.
 * Returned start/end are plain UTC Date objects — safe to pass to Prisma directly.
 */

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000 // UTC+5

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

/** Extract year / month (0-indexed) / day in Pakistan time from a UTC Date. */
function toPKT(utcDate: Date) {
  const shifted = new Date(utcDate.getTime() + PKT_OFFSET_MS)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day:   shifted.getUTCDate(),
  }
}

/**
 * Get the 10-10 cycle boundaries for a given UTC Date.
 *
 * "July 10 – August 9 cycle" in PKT means:
 *   start = July  10 00:00:00 PKT = July  9  19:00:00 UTC
 *   end   = August 9 23:59:59 PKT = August 9 18:59:59 UTC
 */
export function get1010MonthRange(date: Date = new Date()) {
  const { year, month, day } = toPKT(date)

  let start: Date
  let end: Date

  if (day < 10) {
    // We are in the previous cycle: (month-1)/10 PKT → month/9 PKT
    start = new Date(Date.UTC(year, month - 1, 9, 19, 0, 0, 0))
    end   = new Date(Date.UTC(year, month,     9, 18, 59, 59, 999))
  } else {
    // We are in the current cycle: month/10 PKT → (month+1)/9 PKT
    start = new Date(Date.UTC(year, month,     9, 19, 0, 0, 0))
    end   = new Date(Date.UTC(year, month + 1, 9, 18, 59, 59, 999))
  }

  // Derive label month names from the UTC boundaries converted back to PKT
  const startMonth = MONTH_NAMES[toPKT(start).month]
  const endMonth   = MONTH_NAMES[toPKT(end).month]
  const monthLabel = `${startMonth} 10 - ${endMonth} 9`

  return { start, end, monthLabel }
}

/**
 * Get all 10-10 cycles for the past N months.
 * Useful for dropdowns and period selection.
 */
export function get1010MonthsPastN(n: number = 12): Array<{ start: Date; end: Date; label: string }> {
  const months = []
  const today = new Date()

  for (let i = 0; i < n; i++) {
    const d = new Date(today)
    d.setMonth(d.getMonth() - i)
    const { start, end, monthLabel } = get1010MonthRange(d)
    months.push({ start, end, label: monthLabel })
  }

  return months
}

/** Format a 10-10 label from two UTC boundary dates. */
export function format1010MonthLabel(startDate: Date, endDate: Date): string {
  const startMonth = MONTH_NAMES[toPKT(startDate).month]
  const endMonth   = MONTH_NAMES[toPKT(endDate).month]
  return `${startMonth} 10 - ${endMonth} 9`
}
