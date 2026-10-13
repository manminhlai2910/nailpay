// Pure CSV export of services, laid out so Excel opens it cleanly (and NailPay can import it back).

import type { Service } from './pay'

/** Quote a cell if it holds a comma, quote or line break. */
function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** 3500 -> "35.00": a plain number, so Excel can sum the column. */
function centsToNumber(cents: number): string {
  return (cents / 100).toFixed(2)
}

/**
 * Services in `month` (YYYY-MM) as CSV: Date, Service, Price, Tip, Note, oldest day first.
 * Starts with a byte-order mark and uses CRLF line endings so Excel reads names with accents correctly.
 */
export function servicesToCsv(services: Service[], month: string): string {
  const rows = services
    .filter((s) => s.date.startsWith(`${month}-`))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((s) => [
      s.date,
      s.name ?? '',
      centsToNumber(s.priceCents),
      s.tipCents ? centsToNumber(s.tipCents) : '',
      s.note ?? '',
    ])
  return (
    '﻿' +
    [['Date', 'Service', 'Price', 'Tip', 'Note'], ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') +
    '\r\n'
  )
}
