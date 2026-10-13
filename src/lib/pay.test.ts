import { describe, expect, it } from 'vitest'
import {
  calculateMonthlyPay,
  dayTotal,
  formatMoney,
  groupByDay,
  monthTotal,
  parsePrices,
  tipTotal,
  type Service,
} from './pay'

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

describe('tipTotal', () => {
  it('sums tips, treating missing tips as 0', () => {
    const services: Service[] = [
      { id: 'a', date: '2026-10-01', priceCents: 3500, tipCents: 500 },
      { id: 'b', date: '2026-10-01', priceCents: 5500 },
      { id: 'c', date: '2026-10-02', priceCents: 7000, tipCents: 1250 },
    ]
    expect(tipTotal(services)).toBe(1750)
  })
})

describe('groupByDay', () => {
  it('groups by date, newest first, filtered to the month', () => {
    const services = [
      ...servicesOn('2026-10-01', [3500, 5500]),
      ...servicesOn('2026-09-30', [10000]),
      ...servicesOn('2026-10-15', [6000]),
      ...servicesOn('2026-10-01', [7000]),
    ]
    const groups = groupByDay(services, '2026-10')
    expect(groups.map((g) => g.date)).toEqual(['2026-10-15', '2026-10-01'])
    expect(groups[1].services).toHaveLength(3)
    expect(groups[1].totalCents).toBe(16000)
  })
})

describe('calculateMonthlyPay', () => {
  const base = {
    servicesTotalCents: 620000,
    commissionRate: 60,
    rentCents: 50000,
    owedFromLastMonthCents: 15000,
    paymentsCents: 300000,
  }

  it('matches the spec test case', () => {
    expect(calculateMonthlyPay(base)).toEqual({
      commissionCents: 372000,
      netEarnedCents: 322000,
      totalDueCents: 337000,
      carryForwardCents: 37000,
    })
  })

  it('still owes rent with zero services', () => {
    const result = calculateMonthlyPay({ ...base, servicesTotalCents: 0 })
    expect(result.commissionCents).toBe(0)
    expect(result.netEarnedCents).toBe(-50000)
  })

  it('uses the given commission rate', () => {
    const result = calculateMonthlyPay({ ...base, servicesTotalCents: 100000, commissionRate: 70 })
    expect(result.commissionCents).toBe(70000)
  })

  it('rounds commission to the nearest cent', () => {
    const result = calculateMonthlyPay({ ...base, servicesTotalCents: 4501 })
    expect(result.commissionCents).toBe(2701)
  })

  it('carries a negative balance forward when overpaid', () => {
    const result = calculateMonthlyPay({ ...base, paymentsCents: 350000 })
    expect(result.totalDueCents).toBe(337000)
    expect(result.carryForwardCents).toBe(-13000)
  })
})
