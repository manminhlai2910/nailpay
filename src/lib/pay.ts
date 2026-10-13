// Pure pay calculations. All money is integer cents.

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
