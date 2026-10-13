import { describe, expect, it } from 'vitest'
import {
  calculateMonthlyPay,
  changeSettingsFrom,
  dayTotal,
  formatMoney,
  groupByDay,
  monthTotal,
  parsePrices,
  parseSignedAmount,
  paymentTotal,
  settingsForMonth,
  statementForMonth,
  tipTotal,
  type PayData,
  type Payment,
  type Service,
  type SettingsChange,
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

describe('paymentTotal', () => {
  const payments: Payment[] = [
    { id: 'a', date: '2026-09-30', amountCents: 50000, method: 'Cash' },
    { id: 'b', date: '2026-10-05', amountCents: 150000, method: 'Zelle' },
    { id: 'c', date: '2026-10-20', amountCents: 150000, method: 'Check', note: 'check #1042' },
  ]

  it('sums only payments in the given month', () => {
    expect(paymentTotal(payments, '2026-10')).toBe(300000)
    expect(paymentTotal(payments)).toBe(350000)
    expect(paymentTotal([], '2026-10')).toBe(0)
  })

  it('feeds calculateMonthlyPay for the spec test case', () => {
    const result = calculateMonthlyPay({
      servicesTotalCents: 620000,
      commissionRate: 60,
      rentCents: 50000,
      owedFromLastMonthCents: 15000,
      paymentsCents: paymentTotal(payments, '2026-10'),
    })
    expect(formatMoney(-paymentTotal(payments, '2026-10'))).toBe('-$3,000.00')
    expect(formatMoney(result.carryForwardCents)).toBe('$370.00')
  })
})

describe('parseSignedAmount', () => {
  it('parses positive, negative and blank amounts', () => {
    expect(parseSignedAmount('150')).toBe(15000)
    expect(parseSignedAmount(' -130.50 ')).toBe(-13050)
    expect(parseSignedAmount('')).toBe(0)
  })

  it('rejects more than one amount', () => {
    expect(() => parseSignedAmount('1, 2')).toThrow(/one amount/)
  })
})

describe('settingsForMonth', () => {
  const history: SettingsChange[] = [
    { from: '', commissionRate: 60, rentCents: 50000 },
    { from: '2026-10', commissionRate: 65, rentCents: 60000 },
  ]

  it('uses defaults when nothing is saved', () => {
    expect(settingsForMonth([], '2026-10')).toEqual({ commissionRate: 60, rentCents: 50000 })
  })

  it('uses the latest change at or before the month', () => {
    expect(settingsForMonth(history, '2026-09').rentCents).toBe(50000)
    expect(settingsForMonth(history, '2026-10').rentCents).toBe(60000)
    expect(settingsForMonth(history, '2027-03').rentCents).toBe(60000)
  })
})

describe('changeSettingsFrom', () => {
  it('keeps earlier months on their old settings', () => {
    const history = changeSettingsFrom([], '2026-10', { commissionRate: 65, rentCents: 50000 })
    expect(settingsForMonth(history, '2026-09').commissionRate).toBe(60)
    expect(settingsForMonth(history, '2026-10').commissionRate).toBe(65)
  })

  it('replaces later changes', () => {
    const history: SettingsChange[] = [
      { from: '', commissionRate: 60, rentCents: 50000 },
      { from: '2026-12', commissionRate: 70, rentCents: 50000 },
    ]
    const next = changeSettingsFrom(history, '2026-10', { commissionRate: 65, rentCents: 50000 })
    expect(next.map((c) => c.from)).toEqual(['', '2026-10'])
    expect(settingsForMonth(next, '2027-01').commissionRate).toBe(65)
  })

  it('adds no change when the settings are unchanged', () => {
    expect(changeSettingsFrom([], '2026-10', { commissionRate: 60, rentCents: 50000 })).toEqual([])
  })
})

describe('statementForMonth', () => {
  const data: PayData = {
    services: [...servicesOn('2026-09-10', [100000]), ...servicesOn('2026-10-01', [620000])],
    payments: [{ id: 'p', date: '2026-10-20', amountCents: 300000, method: 'Zelle' }],
    settingsHistory: [],
    startingBalance: { amountCents: 5000 },
  }

  it('carries each month into the next (spec test case)', () => {
    // Sept: commission $600 - rent $500 + starting $50 = $150 carried into October
    const sept = statementForMonth(data, '2026-09')
    expect(sept.isFirstMonth).toBe(true)
    expect(sept.owedFromLastMonthCents).toBe(5000)
    expect(sept.carryForwardCents).toBe(15000)

    const oct = statementForMonth(data, '2026-10')
    expect(oct.isFirstMonth).toBe(false)
    expect(oct.owedFromLastMonthCents).toBe(15000)
    expect(oct.totalDueCents).toBe(337000)
    expect(oct.carryForwardCents).toBe(37000)
  })

  it('charges rent for empty months in between', () => {
    expect(statementForMonth(data, '2026-11').owedFromLastMonthCents).toBe(37000)
    expect(statementForMonth(data, '2026-12').owedFromLastMonthCents).toBe(37000 - 50000)
  })

  it('applies each month its own settings', () => {
    const settingsHistory = changeSettingsFrom([], '2026-10', { commissionRate: 60, rentCents: 0 })
    const oct = statementForMonth({ ...data, settingsHistory }, '2026-10')
    expect(oct.owedFromLastMonthCents).toBe(15000) // September still paid $500 rent
    expect(oct.carryForwardCents).toBe(87000)
  })

  it('starts from the starting balance month when set', () => {
    const withStart = { ...data, startingBalance: { amountCents: 15000, month: '2026-10' } }
    expect(statementForMonth(withStart, '2026-10').carryForwardCents).toBe(37000)
    // months before the start stand alone
    const sept = statementForMonth(withStart, '2026-09')
    expect(sept.owedFromLastMonthCents).toBe(0)
    expect(sept.isFirstMonth).toBe(false)
  })

  it('crosses year boundaries', () => {
    const yearEnd = { ...data, services: servicesOn('2026-12-05', [100000]), payments: [] }
    expect(statementForMonth(yearEnd, '2027-01').owedFromLastMonthCents).toBe(15000)
  })

  it('uses the starting balance when there is no data', () => {
    const empty = { ...data, services: [], payments: [] }
    expect(statementForMonth(empty, '2026-10').owedFromLastMonthCents).toBe(5000)
  })
})
