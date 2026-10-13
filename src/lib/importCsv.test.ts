import { describe, expect, it } from 'vitest'
import {
  analyzeCsv,
  applyImport,
  guessColumns,
  monthsWithServices,
  parseCsv,
  parseCsvDate,
  parseCsvMoney,
  summarizeByMonth,
  type ColumnMap,
} from './importCsv'
import type { Service } from './pay'

const ALL: ColumnMap = { date: 0, price: 1, service: 2, tip: 3, note: 4 }

describe('parseCsv', () => {
  it('splits rows and cells, handling quotes, escaped quotes, CRLF and a BOM', () => {
    const text = '﻿Date,Price,Note\r\n10/1/2026,"$1,035.00","said ""thanks"""\r\n,35,\n'
    expect(parseCsv(text)).toEqual([
      ['Date', 'Price', 'Note'],
      ['10/1/2026', '$1,035.00', 'said "thanks"'],
      ['', '35', ''],
    ])
  })

  it('keeps a last row without a trailing newline', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })
})

describe('guessColumns', () => {
  it('matches headers case-insensitively and marks missing fields -1', () => {
    expect(guessColumns([' DATE ', 'Service', 'Price ($)', 'Tips'])).toEqual({
      date: 0,
      service: 1,
      price: 2,
      tip: 3,
      note: -1,
    })
  })
})

describe('parseCsvDate', () => {
  it.each([
    ['10/1/2026', '2026-10-01'],
    ['10/01/2026', '2026-10-01'],
    ['2026-10-01', '2026-10-01'],
    ['1/5/26', '2026-01-05'],
    [' 12/31/2026 ', '2026-12-31'],
  ])('reads %s', (text, expected) => {
    expect(parseCsvDate(text)).toBe(expected)
  })

  it.each(['', 'Oct 1', '13/1/2026', '2/30/2026', '2026/10/01', 'Total'])('rejects %j', (text) => {
    expect(parseCsvDate(text)).toBeNull()
  })
})

describe('parseCsvMoney', () => {
  it.each([
    ['35', 3500],
    ['35.00', 3500],
    ['$35', 3500],
    ['35.5', 3550],
    ['$1,035.00', 103500],
    [' $ 40 ', 4000],
    ['0', 0],
  ])('reads %s', (text, expected) => {
    expect(parseCsvMoney(text)).toBe(expected)
  })

  it.each(['', 'abc', '-35', '35.123', '1,03', '$', '35 dollars'])('rejects %j', (text) => {
    expect(parseCsvMoney(text)).toBeNull()
  })
})

describe('analyzeCsv', () => {
  it('fills blank dates from the row above and reads optional fields', () => {
    const csv = parseCsv(
      'Date,Price,Service,Tip,Note\n10/1/2026,35,Gel,5,\n,$55.00,Pedicure,,regular\n10/2/2026,40,,,\n',
    )
    expect(analyzeCsv(csv, ALL)).toEqual({
      rows: [
        { row: 2, date: '2026-10-01', priceCents: 3500, name: 'Gel', tipCents: 500, note: undefined },
        { row: 3, date: '2026-10-01', priceCents: 5500, name: 'Pedicure', tipCents: undefined, note: 'regular' },
        { row: 4, date: '2026-10-02', priceCents: 4000, name: undefined, tipCents: undefined, note: undefined },
      ],
      flagged: [],
    })
  })

  it('skips blank rows and Total rows', () => {
    const csv = parseCsv('Date,Price,Service\n10/1/2026,35,Gel\n,,\n,35,Total\nTotal,35,\n,,Daily total\n,20,Polish\n')
    const { rows, flagged } = analyzeCsv(csv, { date: 0, price: 1, service: 2, tip: -1, note: -1 })
    expect(rows.map((r) => [r.row, r.date, r.priceCents])).toEqual([
      [2, '2026-10-01', 3500],
      [7, '2026-10-01', 2000],
    ])
    expect(flagged).toEqual([])
  })

  it('flags unreadable dates, prices and tips with the row number', () => {
    const csv = parseCsv('Date,Price,Service,Tip\n,35,Gel,\nOct 1,35,Gel,\n,40,Gel,\n10/2/2026,abc,Gel,\n,,Gel,\n,30,Gel,x\n')
    const { rows, flagged } = analyzeCsv(csv, { date: 0, price: 1, service: 2, tip: 3, note: -1 })
    expect(rows).toEqual([])
    expect(flagged.map((f) => [f.row, f.reason])).toEqual([
      [2, { key: 'import.flag.noDate' }],
      [3, { key: 'import.flag.badDate', params: { value: 'Oct 1' } }],
      [4, { key: 'import.flag.noDate' }], // belongs to the unreadable day, not an earlier one
      [5, { key: 'import.flag.badPrice', params: { value: 'abc' } }],
      [6, { key: 'import.flag.noPrice' }],
      [7, { key: 'import.flag.badTip', params: { value: 'x' } }],
    ])
  })

  it('uses the chosen columns even when headers do not match', () => {
    const csv = parseCsv('Amt,When\n35,10/1/2026\n')
    const { rows } = analyzeCsv(csv, { date: 1, price: 0, service: -1, tip: -1, note: -1 })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ date: '2026-10-01', priceCents: 3500 })
  })
})

describe('summarizeByMonth', () => {
  it('counts and totals per month in month order', () => {
    expect(
      summarizeByMonth([
        { row: 2, date: '2026-11-03', priceCents: 4000 },
        { row: 3, date: '2026-10-01', priceCents: 3500 },
        { row: 4, date: '2026-10-20', priceCents: 5500 },
      ]),
    ).toEqual([
      { month: '2026-10', count: 2, totalCents: 9000 },
      { month: '2026-11', count: 1, totalCents: 4000 },
    ])
  })
})

describe('import into existing data', () => {
  const existing: Service[] = [
    { id: 'old-oct', date: '2026-10-05', priceCents: 1000 },
    { id: 'old-sep', date: '2026-09-05', priceCents: 2000 },
  ]
  const rows = [
    { row: 2, date: '2026-10-01', priceCents: 3500, name: 'Gel', tipCents: 500 },
    { row: 3, date: '2026-11-01', priceCents: 4000 },
  ]
  let n = 0
  const id = () => `new-${n++}`

  it('finds months that already have services', () => {
    expect(monthsWithServices(existing, ['2026-10', '2026-11'])).toEqual(['2026-10'])
  })

  it('skips conflicting months by default', () => {
    n = 0
    expect(applyImport(existing, rows, {}, id)).toEqual([
      ...existing,
      { id: 'new-0', date: '2026-11-01', priceCents: 4000 },
    ])
  })

  it('replaces a conflicting month when chosen', () => {
    n = 0
    expect(applyImport(existing, rows, { '2026-10': 'replace' }, id)).toEqual([
      { id: 'old-sep', date: '2026-09-05', priceCents: 2000 },
      { id: 'new-0', date: '2026-10-01', priceCents: 3500, name: 'Gel', tipCents: 500 },
      { id: 'new-1', date: '2026-11-01', priceCents: 4000 },
    ])
  })
})
