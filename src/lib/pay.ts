// Pure pay calculations. All money is integer cents.

import { addMonths } from './dates'

export interface Service {
  id: string
  date: string // YYYY-MM-DD
  priceCents: number
  name?: string
  tipCents?: number
  note?: string
}

const PRICE_RE = /^\$?(\d+)(?:\.(\d{1,2}))?$/

/**
 * Parse a list of prices like "35, 55, 70" or "35.50" into cents.
 * Blank entries are ignored. Throws on negative or non-numeric values.
 */
export function parsePrices(text: string): number[] {
  return text
    .split(/[,\s]+/)
    .filter((part) => part !== '')
    .map((part) => {
      const match = PRICE_RE.exec(part)
      if (!match) throw new Error(`Invalid price: "${part}"`)
      const dollars = Number(match[1])
      const cents = Number((match[2] ?? '').padEnd(2, '0'))
      return dollars * 100 + cents
    })
}

function sumPrices(services: Service[]): number {
  return services.reduce((total, s) => total + s.priceCents, 0)
}

/** Total service price (excluding tips). If `date` (YYYY-MM-DD) is given, only that day counts. */
export function dayTotal(services: Service[], date?: string): number {
  return sumPrices(date ? services.filter((s) => s.date === date) : services)
}

/** Total service price (excluding tips). If `month` (YYYY-MM) is given, only that month counts. */
export function monthTotal(services: Service[], month?: string): number {
  return sumPrices(month ? services.filter((s) => s.date.startsWith(`${month}-`)) : services)
}

/** Parse one amount where a leading "-" makes it negative: "-130" -> -13000, blank -> 0. Throws on invalid input. */
export function parseSignedAmount(text: string): number {
  const trimmed = text.trim()
  const negative = trimmed.startsWith('-')
  const prices = parsePrices(negative ? trimmed.slice(1) : trimmed)
  if (prices.length > 1) throw new Error('Enter one amount')
  const cents = prices[0] ?? 0
  return negative ? -cents : cents
}

/** 26000 -> "$260.00", 620000 -> "$6,200.00" */
export function formatMoney(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  const dollars = Math.floor(abs / 100).toLocaleString('en-US')
  const rest = String(abs % 100).padStart(2, '0')
  return `${sign}$${dollars}.${rest}`
}

/** Total tips (not part of commission). */
export function tipTotal(services: Service[]): number {
  return services.reduce((total, s) => total + (s.tipCents ?? 0), 0)
}

export interface DayGroup {
  date: string // YYYY-MM-DD
  services: Service[]
  totalCents: number
}

/** Group services by day, newest first. If `month` (YYYY-MM) is given, only that month is included. */
export function groupByDay(services: Service[], month?: string): DayGroup[] {
  const byDate = new Map<string, Service[]>()
  for (const s of services) {
    if (month && !s.date.startsWith(`${month}-`)) continue
    const day = byDate.get(s.date)
    if (day) day.push(s)
    else byDate.set(s.date, [s])
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([date, list]) => ({ date, services: list, totalCents: sumPrices(list) }))
}

export interface MonthlyPayInput {
  servicesTotalCents: number
  commissionRate: number // whole percent, e.g. 60
  rentCents: number
  owedFromLastMonthCents: number
  paymentsCents: number
}

export interface MonthlyPay {
  commissionCents: number
  netEarnedCents: number
  totalDueCents: number
  carryForwardCents: number // negative means overpaid
}

/** Commission minus rent, plus last month's balance, minus payments received. */
export function calculateMonthlyPay({
  servicesTotalCents,
  commissionRate,
  rentCents,
  owedFromLastMonthCents,
  paymentsCents,
}: MonthlyPayInput): MonthlyPay {
  const commissionCents = Math.round((servicesTotalCents * commissionRate) / 100)
  const netEarnedCents = commissionCents - rentCents
  const totalDueCents = netEarnedCents + owedFromLastMonthCents
  const carryForwardCents = totalDueCents - paymentsCents
  return { commissionCents, netEarnedCents, totalDueCents, carryForwardCents }
}

export const PAYMENT_METHODS = ['Cash', 'Check', 'Zelle'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export interface Payment {
  id: string
  date: string // YYYY-MM-DD
  amountCents: number
  method: PaymentMethod
  note?: string
}

/** Total paid by the owner. If `month` (YYYY-MM) is given, only payments dated in that month count. */
export function paymentTotal(payments: Payment[], month?: string): number {
  return payments
    .filter((p) => !month || p.date.startsWith(`${month}-`))
    .reduce((total, p) => total + p.amountCents, 0)
}

export interface Settings {
  commissionRate: number // whole percent, e.g. 60
  rentCents: number
}

export const DEFAULT_SETTINGS: Settings = { commissionRate: 60, rentCents: 50000 }

/** Settings that take effect in month `from` (YYYY-MM). `from: ''` means from the very beginning. */
export interface SettingsChange extends Settings {
  from: string
}

/** The settings in effect for `month`: the latest change at or before it, else the earliest change, else defaults. */
export function settingsForMonth(history: SettingsChange[], month: string): Settings {
  const sorted = [...history].sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0))
  const change = sorted.filter((c) => c.from <= month).at(-1) ?? sorted[0]
  return change ? { commissionRate: change.commissionRate, rentCents: change.rentCents } : DEFAULT_SETTINGS
}

/** Apply `settings` from `month` onward: later changes are replaced, earlier months are untouched. */
export function changeSettingsFrom(history: SettingsChange[], month: string, settings: Settings): SettingsChange[] {
  const before = history.filter((c) => c.from < month)
  const base = before.length > 0 ? before : [{ ...DEFAULT_SETTINGS, from: '' }]
  const previous = settingsForMonth(base, month)
  const same = previous.commissionRate === settings.commissionRate && previous.rentCents === settings.rentCents
  if (same) return before
  return [...base, { ...settings, from: month }]
}

export interface StartingBalance {
  amountCents: number // owed to the technician before `month`; negative if she owed the owner
  month?: string // YYYY-MM; if unset, the first month with services or payments
}

export interface PayData {
  services: Service[]
  payments: Payment[]
  settingsHistory: SettingsChange[]
  startingBalance: StartingBalance
}

export interface MonthStatement extends MonthlyPay {
  month: string
  settings: Settings
  servicesTotalCents: number
  paymentsCents: number
  owedFromLastMonthCents: number
  isFirstMonth: boolean // owed comes from the starting balance rather than a previous month
}

/** First month (YYYY-MM) with any service or payment, or undefined if there is no data. */
export function firstDataMonth(services: Service[], payments: Payment[]): string | undefined {
  const dates = [...services.map((s) => s.date), ...payments.map((p) => p.date)]
  return dates.length > 0 ? dates.reduce((min, d) => (d < min ? d : min)).slice(0, 7) : undefined
}

/**
 * The pay statement for `month`, with "owed from last month" carried forward month by month
 * from the start month (every month in between counts, including rent for months with no services).
 * Months before the start month stand alone with nothing owed from before.
 */
export function statementForMonth(data: PayData, month: string): MonthStatement {
  const start = data.startingBalance.month ?? firstDataMonth(data.services, data.payments) ?? month
  const chained = start <= month
  let owed = chained ? data.startingBalance.amountCents : 0
  let current = chained ? start : month
  for (;;) {
    const settings = settingsForMonth(data.settingsHistory, current)
    const servicesTotalCents = monthTotal(data.services, current)
    const paymentsCents = paymentTotal(data.payments, current)
    const pay = calculateMonthlyPay({ servicesTotalCents, ...settings, owedFromLastMonthCents: owed, paymentsCents })
    if (current === month) {
      return {
        month,
        settings,
        servicesTotalCents,
        paymentsCents,
        owedFromLastMonthCents: owed,
        isFirstMonth: chained && current === start,
        ...pay,
      }
    }
    owed = pay.carryForwardCents
    current = addMonths(current, 1)
  }
}
