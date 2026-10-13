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

// Display formatters take a locale ("en", "vi"); omitted means the browser's.

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
const isVietnamese = (locale?: string) => locale?.startsWith('vi') ?? false

/** "2026-10" -> "October 2026" / "Tháng 10 năm 2026" */
export function formatMonth(month: string, locale?: string): string {
  const [y, m] = month.split('-').map(Number)
  return capitalize(new Date(y, m - 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' }))
}

/** "2026-10" -> "Oct" / "T10" (Intl's "Tháng 10" is too wide for chart labels) */
export function formatMonthShort(month: string, locale?: string): string {
  const [y, m] = month.split('-').map(Number)
  if (isVietnamese(locale)) return `T${m}`
  return new Date(y, m - 1).toLocaleDateString(locale, { month: 'short' })
}

/** "2026-10-01" -> "Thu, Oct 1" / "Thứ 5, 1 thg 10" */
export function formatDay(date: string, locale?: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(locale, {
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

/** "2026-10" -> "Oct 2026" / "10/2026" */
export function formatMonthYearShort(month: string, locale?: string): string {
  const [y, m] = month.split('-').map(Number)
  if (isVietnamese(locale)) return `${m}/${y}`
  return new Date(y, m - 1).toLocaleDateString(locale, { month: 'short', year: 'numeric' })
}
