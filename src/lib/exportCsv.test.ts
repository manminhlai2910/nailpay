import { describe, expect, it } from 'vitest'
import { servicesToCsv } from './exportCsv'
import { analyzeCsv, guessColumns, parseCsv } from './importCsv'
import type { Service } from './pay'

const services: Service[] = [
  { id: 'b', date: '2026-10-02', priceCents: 103500, name: 'Full set, gel', note: 'said "thanks"' },
  { id: 'a', date: '2026-10-01', priceCents: 3500, name: 'Gel', tipCents: 500 },
  { id: 'c', date: '2026-10-01', priceCents: 5550 },
  { id: 'x', date: '2026-11-01', priceCents: 4000 },
]

describe('servicesToCsv', () => {
  it('writes the month oldest first, with a BOM, CRLF, plain-number prices and quoted cells', () => {
    expect(servicesToCsv(services, '2026-10')).toBe(
      '﻿Date,Service,Price,Tip,Note\r\n' +
        '2026-10-01,Gel,35.00,5.00,\r\n' +
        '2026-10-01,,55.50,,\r\n' +
        '2026-10-02,"Full set, gel",1035.00,,"said ""thanks"""\r\n',
    )
  })

  it('writes just the header for a month with no services', () => {
    expect(servicesToCsv(services, '2026-12')).toBe('﻿Date,Service,Price,Tip,Note\r\n')
  })

  it('can be imported back', () => {
    const csv = parseCsv(servicesToCsv(services, '2026-10'))
    const { rows, flagged } = analyzeCsv(csv, guessColumns(csv[0]))
    expect(flagged).toEqual([])
    expect(
      rows.map(({ date, priceCents, name, tipCents, note }) => ({ date, priceCents, name, tipCents, note })),
    ).toEqual([
      { date: '2026-10-01', priceCents: 3500, name: 'Gel', tipCents: 500, note: undefined },
      { date: '2026-10-01', priceCents: 5550, name: undefined, tipCents: undefined, note: undefined },
      { date: '2026-10-02', priceCents: 103500, name: 'Full set, gel', tipCents: undefined, note: 'said "thanks"' },
    ])
  })
})
