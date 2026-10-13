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
