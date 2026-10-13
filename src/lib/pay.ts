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
