import type { Service } from './pay'

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

const SETTINGS_KEY = 'nailpay.settings'

export interface Settings {
  commissionRate: number // whole percent, e.g. 60
  rentCents: number
}

export const DEFAULT_SETTINGS: Settings = { commissionRate: 60, rentCents: 50000 }

/** Load saved settings, falling back to defaults for anything missing or invalid. */
export function loadSettings(storage: Storage = localStorage): Settings {
  try {
    const raw = storage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const s = JSON.parse(raw) as Record<string, unknown>
    const rate = s.commissionRate
    const rent = s.rentCents
    return {
      commissionRate:
        Number.isInteger(rate) && (rate as number) >= 0 && (rate as number) <= 100
          ? (rate as number)
          : DEFAULT_SETTINGS.commissionRate,
      rentCents: Number.isInteger(rent) && (rent as number) >= 0 ? (rent as number) : DEFAULT_SETTINGS.rentCents,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: Settings, storage: Storage = localStorage): void {
  storage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
