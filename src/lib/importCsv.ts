// Pure CSV import: parse a spreadsheet export into services. All money is integer cents.

import type { Service } from './pay'

/** Split CSV text into rows of cells. Handles quoted cells ("$1,035.00", "say ""hi"""), CRLF and a leading BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const src = text.replace(/^﻿/, '')

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') {
        quoted = false
      } else {
        cell += ch
      }
    } else if (ch === '"') {
      quoted = true
    } else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += ch
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

export const IMPORT_FIELDS = ['date', 'price', 'service', 'tip', 'note'] as const
export type ImportField = (typeof IMPORT_FIELDS)[number]

/** Which CSV column (0-based) holds each field; -1 means not in the file. */
export type ColumnMap = Record<ImportField, number>

const HEADER_NAMES: Record<ImportField, string[]> = {
  date: ['date', 'day'],
  price: ['price', 'amount', 'cost', 'charge'],
  service: ['service', 'services', 'name', 'description'],
  tip: ['tip', 'tips', 'gratuity'],
  note: ['note', 'notes', 'comment', 'comments', 'memo'],
}

/** Guess the column for each field from the header row (case- and spacing-insensitive). */
export function guessColumns(headers: string[]): ColumnMap {
  const normalized = headers.map((h) => h.trim().toLowerCase().replace(/[^a-z]/g, ''))
  const map = {} as ColumnMap
  for (const field of IMPORT_FIELDS) {
    map[field] = normalized.findIndex((h) => HEADER_NAMES[field].includes(h))
  }
  return map
}

const pad = (n: number) => String(n).padStart(2, '0')

/** "10/1/2026", "10/01/2026", "10/1/26" or "2026-10-01" -> "2026-10-01". Returns null if unreadable or not a real date. */
export function parseCsvDate(text: string): string | null {
  const t = text.trim()
  let y: number, m: number, d: number
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t)
  if (match) {
    ;[y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  } else if ((match = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(t))) {
    ;[m, d, y] = [Number(match[1]), Number(match[2]), Number(match[3])]
    if (match[3].length === 2) y += 2000
  } else {
    return null
  }
  const date = new Date(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null
  return `${y}-${pad(m)}-${pad(d)}`
}

/** "35", "35.00", "$35", "$1,035.00" -> cents. Returns null if unreadable or negative. */
export function parseCsvMoney(text: string): number | null {
  const t = text.trim().replace(/^\$\s*/, '')
  const match = /^(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?$/.exec(t)
  if (!match) return null
  return Number(match[1].replace(/,/g, '')) * 100 + Number((match[2] ?? '').padEnd(2, '0'))
}

export interface ImportRow {
  row: number // spreadsheet row number (the header is row 1)
  date: string // YYYY-MM-DD
  priceCents: number
  name?: string
  tipCents?: number
  note?: string
}

export interface FlaggedRow {
  row: number
  reason: string
  cells: string[]
}

export interface ImportAnalysis {
  rows: ImportRow[]
  flagged: FlaggedRow[]
}

const TOTAL_RE = /total/i

/**
 * Turn CSV rows (header first) into services, using `columns` to find each field.
 * A blank date reuses the date from the row above. Blank rows and "Total" rows are skipped.
 * Rows with an unreadable date, price or tip are flagged instead of imported.
 */
export function analyzeCsv(csvRows: string[][], columns: ColumnMap): ImportAnalysis {
  const rows: ImportRow[] = []
  const flagged: FlaggedRow[] = []
  let lastDate: string | null = null
  const cell = (cells: string[], field: ImportField) => (columns[field] < 0 ? '' : (cells[columns[field]] ?? '').trim())

  csvRows.slice(1).forEach((cells, i) => {
    const row = i + 2
    if (cells.every((c) => c.trim() === '')) return

    const dateText = cell(cells, 'date')
    const name = cell(cells, 'service')
    if (TOTAL_RE.test(dateText) || TOTAL_RE.test(name)) return

    const flag = (reason: string) => flagged.push({ row, reason, cells })

    let date: string | null
    if (dateText === '') {
      if (!lastDate) return flag('No date, and no date in the rows above')
      date = lastDate
    } else {
      date = parseCsvDate(dateText)
      // later blank-date rows belong to this unreadable day, so don't let them inherit the previous day
      lastDate = date
      if (!date) return flag(`Unreadable date "${dateText}"`)
    }

    const priceText = cell(cells, 'price')
    if (priceText === '') return flag('No price')
    const priceCents = parseCsvMoney(priceText)
    if (priceCents === null) return flag(`Unreadable price "${priceText}"`)

    const tipText = cell(cells, 'tip')
    const tipCents = tipText === '' ? 0 : parseCsvMoney(tipText)
    if (tipCents === null) return flag(`Unreadable tip "${tipText}"`)

    const note = cell(cells, 'note')
    rows.push({
      row,
      date,
      priceCents,
      name: name || undefined,
      tipCents: tipCents || undefined,
      note: note || undefined,
    })
  })

  return { rows, flagged }
}

export interface MonthSummary {
  month: string // YYYY-MM
  count: number
  totalCents: number
}

/** Count and total price per month, in month order. */
export function summarizeByMonth(rows: ImportRow[]): MonthSummary[] {
  const byMonth = new Map<string, MonthSummary>()
  for (const r of rows) {
    const month = r.date.slice(0, 7)
    const summary = byMonth.get(month) ?? { month, count: 0, totalCents: 0 }
    summary.count++
    summary.totalCents += r.priceCents
    byMonth.set(month, summary)
  }
  return [...byMonth.values()].sort((a, b) => (a.month < b.month ? -1 : 1))
}

/** Months (YYYY-MM) among `months` that already have services saved. */
export function monthsWithServices(services: Service[], months: string[]): string[] {
  const existing = new Set(services.map((s) => s.date.slice(0, 7)))
  return months.filter((m) => existing.has(m))
}

export type ConflictChoice = 'replace' | 'skip'

/**
 * The services list after importing `rows`. For a month that already has services, `choices`
 * decides: "replace" deletes that month's existing services first, "skip" (the default) leaves
 * the month alone and drops its imported rows.
 */
export function applyImport(
  existing: Service[],
  rows: ImportRow[],
  choices: Record<string, ConflictChoice>,
  newId: () => string,
): Service[] {
  const taken = new Set(existing.map((s) => s.date.slice(0, 7)))
  const replace = (month: string) => taken.has(month) && choices[month] === 'replace'
  const skip = (month: string) => taken.has(month) && choices[month] !== 'replace'

  const kept = existing.filter((s) => !replace(s.date.slice(0, 7)))
  const added = rows
    .filter((r) => !skip(r.date.slice(0, 7)))
    .map((r) => {
      const service: Service = { id: newId(), date: r.date, priceCents: r.priceCents }
      if (r.name) service.name = r.name
      if (r.tipCents) service.tipCents = r.tipCents
      if (r.note) service.note = r.note
      return service
    })
  return [...kept, ...added]
}
