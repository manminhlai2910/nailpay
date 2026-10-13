import { describe, expect, it } from 'vitest'
import { dayTotal, formatMoney, monthTotal, parsePrices, type Service } from './pay'

function servicesOn(date: string, prices: number[]): Service[] {
  return prices.map((priceCents, i) => ({ id: `${date}-${i}`, date, priceCents }))
}

describe('parsePrices', () => {
  it('parses a comma-separated list into cents', () => {
    expect(parsePrices('35, 55, 70, 55, 45')).toEqual([3500, 5500, 7000, 5500, 4500])
  })

  it('parses a single price', () => {
    expect(parsePrices('35')).toEqual([3500])
  })

  it('handles decimals without float errors', () => {
    expect(parsePrices('35.5, 0.10, 19.99')).toEqual([3550, 10, 1999])
  })

  it('ignores blanks', () => {
    expect(parsePrices(' 35,, 55 , ')).toEqual([3500, 5500])
    expect(parsePrices('')).toEqual([])
  })

  it('rejects negative values', () => {
    expect(() => parsePrices('35, -10')).toThrow(/-10/)
  })

  it('rejects non-numeric values', () => {
    expect(() => parsePrices('35, abc')).toThrow(/abc/)
    expect(() => parsePrices('1.234')).toThrow()
  })
})

describe('dayTotal', () => {
  it('10/01/2026 with 35, 55, 70, 55, 45 -> 26000 cents', () => {
    const services = servicesOn('2026-10-01', parsePrices('35, 55, 70, 55, 45'))
    expect(dayTotal(services)).toBe(26000)
    expect(formatMoney(dayTotal(services))).toBe('$260.00')
  })

  it('only counts the given date and excludes tips', () => {
    const services = [
      ...servicesOn('2026-10-01', [3500, 5500]),
      ...servicesOn('2026-10-02', [7000]),
      { id: 'tip', date: '2026-10-01', priceCents: 4500, tipCents: 1000 },
    ]
    expect(dayTotal(services, '2026-10-01')).toBe(13500)
  })

  it('is 0 for no services', () => {
    expect(dayTotal([])).toBe(0)
  })
})

describe('monthTotal', () => {
  it('sums only services in the given month', () => {
    const services = [
      ...servicesOn('2026-09-30', [10000]),
      ...servicesOn('2026-10-01', [3500, 5500, 7000, 5500, 4500]),
      ...servicesOn('2026-10-15', [6000]),
    ]
    expect(monthTotal(services, '2026-10')).toBe(32000)
    expect(monthTotal(services)).toBe(42000)
  })
})

describe('formatMoney', () => {
  it('formats cents as dollars', () => {
    expect(formatMoney(26000)).toBe('$260.00')
    expect(formatMoney(5)).toBe('$0.05')
    expect(formatMoney(620000)).toBe('$6,200.00')
    expect(formatMoney(-15000)).toBe('-$150.00')
  })
})
