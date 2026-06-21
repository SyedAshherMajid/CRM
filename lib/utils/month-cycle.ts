/**
 * Utility functions for the 10-10 month cycle (10th to 10th)
 * Client's accounting closes from 10th to 10th instead of calendar months
 */

/**
 * Get the 10-10 month range for a given date
 * Returns { start, end, monthLabel }
 * Examples:
 * - June 10 to July 9 = "June 10 - July 9"
 * - March 25 = returns March 10 - April 9 range
 */
export function get1010MonthRange(date: Date = new Date()) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()

  let start: Date
  let end: Date

  if (day < 10) {
    // We're in the previous 10-10 cycle
    start = new Date(year, month - 1, 10)
    end = new Date(year, month, 9)
  } else {
    // We're in the current 10-10 cycle
    start = new Date(year, month, 10)
    end = new Date(year, month + 1, 9)
  }

  // Fix end date to be end of day
  end.setHours(23, 59, 59, 999)

  // Generate month label
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]
  const startMonth = monthNames[start.getMonth()]
  const endMonth = monthNames[end.getMonth()]

  const monthLabel = `${startMonth} 10 - ${endMonth} 9`

  return { start, end, monthLabel }
}

/**
 * Get all 10-10 months for the past N months
 * Useful for dropdowns and period selection
 */
export function get1010MonthsPastN(n: number = 12): Array<{ start: Date; end: Date; label: string }> {
  const months = []
  const today = new Date()

  for (let i = 0; i < n; i++) {
    const date = new Date(today)
    date.setMonth(date.getMonth() - i)
    const { start, end, monthLabel } = get1010MonthRange(date)
    months.push({ start, end, label: monthLabel })
  }

  return months
}

/**
 * Format a 10-10 month label from dates
 */
export function format1010MonthLabel(startDate: Date, endDate: Date): string {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]
  const startMonth = monthNames[startDate.getMonth()]
  const endMonth = monthNames[endDate.getMonth()]
  return `${startMonth} 10 - ${endMonth} 9`
}
