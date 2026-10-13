import { describe, expect, it } from 'vitest'
import type { Payment } from './pay'
import { loadPayments, savePayments } from './storage'

function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  }
}

describe('payments storage', () => {
  it('round-trips payments', () => {
    const storage = memoryStorage()
    const payments: Payment[] = [
      { id: 'a', date: '2026-10-05', amountCents: 150000, method: 'Zelle' },
      { id: 'b', date: '2026-10-20', amountCents: 150000, method: 'Check', note: 'check #1042' },
    ]
    savePayments(payments, storage)
    expect(loadPayments(storage)).toEqual(payments)
  })

  it('returns [] when nothing is saved or the data is unreadable', () => {
    const storage = memoryStorage()
    expect(loadPayments(storage)).toEqual([])
    storage.setItem('nailpay.payments', '{not json')
    expect(loadPayments(storage)).toEqual([])
  })

  it('drops invalid entries', () => {
    const storage = memoryStorage()
    storage.setItem(
      'nailpay.payments',
      JSON.stringify([
        { id: 'ok', date: '2026-10-05', amountCents: 100, method: 'Cash' },
        { id: 'float', date: '2026-10-05', amountCents: 1.5, method: 'Cash' },
        { id: 'method', date: '2026-10-05', amountCents: 100, method: 'Venmo' },
        { id: 'date', date: '10/05/2026', amountCents: 100, method: 'Cash' },
      ]),
    )
    expect(loadPayments(storage).map((p) => p.id)).toEqual(['ok'])
  })
})
