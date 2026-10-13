import {
  DEFAULT_SETTINGS,
  PAYMENT_METHODS,
  type Payment,
  type Service,
  type Settings,
  type SettingsChange,
  type StartingBalance,
} from './pay'

const SERVICES_KEY = 'nailpay.services'

function isService(value: unknown): value is Service {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Record<string, unknown>
  return (
    typeof s.id === 'string' &&
    typeof s.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(s.date) &&
    Number.isInteger(s.priceCents) &&
    (s.name === undefined || typeof s.name === 'string') &&
    (s.tipCents === undefined || Number.isInteger(s.tipCents)) &&
    (s.note === undefined || typeof s.note === 'string')
  )
}

/** Load saved services. Returns [] if nothing is saved or the data is unreadable. */
export function loadServices(storage: Storage = localStorage): Service[] {
  try {
    const raw = storage.getItem(SERVICES_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isService) : []
  } catch {
    return []
  }
}

export function saveServices(services: Service[], storage: Storage = localStorage): void {
  storage.setItem(SERVICES_KEY, JSON.stringify(services))
}

export type { Settings } from './pay'

const SETTINGS_KEY = 'nailpay.settings' // before settings history: a single Settings object
const SETTINGS_HISTORY_KEY = 'nailpay.settingsHistory'

/** Validate one settings object, falling back to defaults for anything missing or invalid. */
function toSettings(value: unknown): Settings {
  const s = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>
  const rate = s.commissionRate
  const rent = s.rentCents
  return {
    commissionRate:
      Number.isInteger(rate) && (rate as number) >= 0 && (rate as number) <= 100
        ? (rate as number)
        : DEFAULT_SETTINGS.commissionRate,
    rentCents: Number.isInteger(rent) && (rent as number) >= 0 ? (rent as number) : DEFAULT_SETTINGS.rentCents,
  }
}

/**
 * Load the settings history. Older saves held one settings object; it becomes a change that
 * applies from the beginning. Returns [] (meaning defaults) if nothing is saved or readable.
 */
export function loadSettingsHistory(storage: Storage = localStorage): SettingsChange[] {
  try {
    const raw = storage.getItem(SETTINGS_HISTORY_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed
        .filter((c) => typeof c?.from === 'string' && /^(\d{4}-\d{2})?$/.test(c.from))
        .map((c) => ({ ...toSettings(c), from: c.from as string }))
    }
    const legacy = storage.getItem(SETTINGS_KEY)
    return legacy ? [{ ...toSettings(JSON.parse(legacy)), from: '' }] : []
  } catch {
    return []
  }
}

export function saveSettingsHistory(history: SettingsChange[], storage: Storage = localStorage): void {
  storage.setItem(SETTINGS_HISTORY_KEY, JSON.stringify(history))
}

const STARTING_BALANCE_KEY = 'nailpay.startingBalance'

/** Load the starting balance. Defaults to $0 from the first month with data. */
export function loadStartingBalance(storage: Storage = localStorage): StartingBalance {
  try {
    const raw = storage.getItem(STARTING_BALANCE_KEY)
    if (!raw) return { amountCents: 0 }
    const b = JSON.parse(raw) as Record<string, unknown>
    return {
      amountCents: Number.isInteger(b.amountCents) ? (b.amountCents as number) : 0,
      month: typeof b.month === 'string' && /^\d{4}-\d{2}$/.test(b.month) ? b.month : undefined,
    }
  } catch {
    return { amountCents: 0 }
  }
}

export function saveStartingBalance(balance: StartingBalance, storage: Storage = localStorage): void {
  storage.setItem(STARTING_BALANCE_KEY, JSON.stringify(balance))
}

const PAYMENTS_KEY = 'nailpay.payments'

function isPayment(value: unknown): value is Payment {
  if (typeof value !== 'object' || value === null) return false
  const p = value as Record<string, unknown>
  return (
    typeof p.id === 'string' &&
    typeof p.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(p.date) &&
    Number.isInteger(p.amountCents) &&
    (PAYMENT_METHODS as readonly unknown[]).includes(p.method) &&
    (p.note === undefined || typeof p.note === 'string')
  )
}

/** Load saved payments. Returns [] if nothing is saved or the data is unreadable. */
export function loadPayments(storage: Storage = localStorage): Payment[] {
  try {
    const raw = storage.getItem(PAYMENTS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isPayment) : []
  } catch {
    return []
  }
}

export function savePayments(payments: Payment[], storage: Storage = localStorage): void {
  storage.setItem(PAYMENTS_KEY, JSON.stringify(payments))
}
