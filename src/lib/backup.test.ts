import { describe, expect, it } from 'vitest'
import { backupFileName, createBackup, parseBackup, type BackupData } from './backup'

const data: BackupData = {
  services: [
    { id: 's1', date: '2026-10-01', priceCents: 3500, name: 'Gel', tipCents: 500, note: 'regular' },
    { id: 's2', date: '2026-10-02', priceCents: 103500 },
  ],
  payments: [{ id: 'p1', date: '2026-10-05', amountCents: 150000, method: 'Zelle' }],
  settingsHistory: [
    { from: '', commissionRate: 60, rentCents: 50000 },
    { from: '2026-11', commissionRate: 65, rentCents: 55000 },
  ],
  startingBalance: { amountCents: -13000, month: '2026-09' },
  profile: { name: 'Lan', salonName: 'Lucky Nails' },
}

describe('backup', () => {
  it('names the file by date', () => {
    expect(backupFileName('2026-10-13')).toBe('nailpay-backup-2026-10-13.json')
  })

  it('round-trips all data', () => {
    const text = createBackup(data, new Date('2026-10-13T17:00:00Z'))
    expect(parseBackup(text)).toEqual({ ...data, exportedAt: '2026-10-13T17:00:00.000Z' })
  })

  it.each(['not json', '[]', '{"services":[],"payments":[]}', '{"app":"NailPay","version":1}'])(
    'rejects a file that is not a backup: %s',
    (text) => {
      expect(() => parseBackup(text)).toThrow("That file isn't a NailPay backup.")
    },
  )

  it('rejects a backup from a newer version', () => {
    const text = JSON.stringify({ app: 'NailPay', version: 2, services: [], payments: [] })
    expect(() => parseBackup(text)).toThrow('newer version')
  })

  it('rejects a damaged backup instead of restoring part of it', () => {
    const backup = JSON.parse(createBackup(data, new Date()))
    backup.services[1].priceCents = '35'
    backup.payments.push({ id: 'p2', date: 'Oct 5', amountCents: 100, method: 'Cash' })
    expect(() => parseBackup(JSON.stringify(backup))).toThrow(
      "This backup is damaged: 1 service and 1 payment can't be read.",
    )
  })

  it('falls back to defaults for missing settings and profile', () => {
    const text = JSON.stringify({ app: 'NailPay', version: 1, services: [], payments: [] })
    expect(parseBackup(text)).toEqual({
      exportedAt: '',
      services: [],
      payments: [],
      settingsHistory: [],
      startingBalance: { amountCents: 0, month: undefined },
      profile: { name: '', salonName: '' },
    })
  })
})
