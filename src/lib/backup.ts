// Pure backup/restore of all NailPay data as one JSON file.

import { AppError } from './errors'
import type { PayData } from './pay'
import { isPayment, isService, toProfile, toSettingsHistory, toStartingBalance, type Profile } from './storage'

const APP = 'NailPay'
const VERSION = 1

export interface BackupData extends PayData {
  profile: Profile
}

export interface Backup extends BackupData {
  exportedAt: string // ISO timestamp
}

/** "2026-10-13" -> "nailpay-backup-2026-10-13.json" */
export function backupFileName(date: string): string {
  return `nailpay-backup-${date}.json`
}

/** All data as backup-file text. */
export function createBackup(data: BackupData, exportedAt: Date): string {
  const { services, payments, settingsHistory, startingBalance, profile } = data
  return JSON.stringify(
    {
      app: APP,
      version: VERSION,
      exportedAt: exportedAt.toISOString(),
      services,
      payments,
      settingsHistory,
      startingBalance,
      profile,
    },
    null,
    2,
  )
}

/** Read backup-file text. Throws with a readable message if it isn't a valid NailPay backup. */
export function parseBackup(text: string): Backup {
  const notBackup = new AppError("That file isn't a NailPay backup.", 'errors.notBackup')
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw notBackup
  }
  if (typeof parsed !== 'object' || parsed === null) throw notBackup
  const b = parsed as Record<string, unknown>
  if (b.app !== APP || !Array.isArray(b.services) || !Array.isArray(b.payments)) throw notBackup
  if (typeof b.version !== 'number' || b.version > VERSION) {
    throw new AppError('This backup was made by a newer version of NailPay.', 'errors.newerBackup')
  }

  // Refuse a partly damaged backup rather than silently restoring only some of it.
  const badServices = b.services.filter((s) => !isService(s)).length
  const badPayments = b.payments.filter((p) => !isPayment(p)).length
  if (badServices || badPayments) {
    const parts = [
      badServices && `${badServices} service${badServices === 1 ? '' : 's'}`,
      badPayments && `${badPayments} payment${badPayments === 1 ? '' : 's'}`,
    ].filter(Boolean)
    const key = badServices && badPayments ? 'both' : badServices ? 'services' : 'payments'
    throw new AppError(`This backup is damaged: ${parts.join(' and ')} can't be read.`, `errors.damaged.${key}`, {
      services: badServices,
      payments: badPayments,
    })
  }

  return {
    exportedAt: typeof b.exportedAt === 'string' ? b.exportedAt : '',
    services: b.services.filter(isService),
    payments: b.payments.filter(isPayment),
    settingsHistory: toSettingsHistory(b.settingsHistory),
    startingBalance: toStartingBalance(b.startingBalance),
    profile: toProfile(b.profile),
  }
}
