// Date helpers. Dates are local-time strings: "YYYY-MM-DD" for days, "YYYY-MM" for months.

const pad = (n: number) => String(n).padStart(2, '0')

/** Today as "YYYY-MM-DD" in local time. */
export function today(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Current month as "YYYY-MM" in local time. */
export function currentMonth(): string {
  return today().slice(0, 7)
}

/** "2026-10" -> "October 2026" */
export function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

/** "2026-10" -> "Oct" */
export function formatMonthShort(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1).toLocaleDateString(undefined, { month: 'short' })
}

/** "2026-10-01" -> "Thu, Oct 1" */
export function formatDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/** "2026-12" + 1 -> "2027-01" */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number)
  const total = y * 12 + (m - 1) + n
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`
}
