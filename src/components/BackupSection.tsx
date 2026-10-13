import { useState, type ChangeEvent } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { errorText } from '../i18n'
import { backupFileName, createBackup, parseBackup, type Backup, type BackupData } from '../lib/backup'
import { today } from '../lib/dates'
import { downloadFile } from '../lib/download'

interface Props {
  data: BackupData
  onRestore: (data: BackupData) => void
}

/** Download all data as one JSON file, or replace all data from such a file after confirmation. */
export default function BackupSection({ data, onRestore }: Props) {
  const { t, i18n } = useTranslation()
  const services = (n: number) => t('count.service', { count: n })
  const payments = (n: number) => t('count.payment', { count: n })
  const [pending, setPending] = useState<Backup | null>(null)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  function backUp() {
    downloadFile(backupFileName(today()), createBackup(data, new Date()), 'application/json')
    setDone('')
  }

  async function pickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // let the same file be picked again
    if (!file) return
    setDone('')
    try {
      setPending(parseBackup(await file.text()))
      setError('')
    } catch (err) {
      setPending(null)
      setError(errorText(err, t))
    }
  }

  function restore() {
    if (!pending) return
    const { exportedAt: _exportedAt, ...restored } = pending
    onRestore(restored)
    setPending(null)
    setDone(
      t('backup.restored', {
        services: services(restored.services.length),
        payments: payments(restored.payments.length),
      }),
    )
  }

  const exported = pending?.exportedAt ? new Date(pending.exportedAt) : null
  const exportedValid = exported !== null && !isNaN(exported.getTime())

  return (
    <section className="mt-4 space-y-4 rounded-2xl bg-white p-4 shadow-sm">
      <div>
        <h2 className="font-semibold">{t('backup.title')}</h2>
        <p className="mt-1 text-sm text-gray-500">{t('backup.desc')}</p>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={backUp} className="flex-1 rounded-lg bg-pink-600 py-2 font-medium text-white">
          {t('backup.download')}
        </button>
        <label className="flex-1 cursor-pointer rounded-lg border border-gray-300 py-2 text-center font-medium text-gray-700 focus-within:border-pink-600">
          {t('backup.restore')}
          <input type="file" accept=".json,application/json" onChange={pickFile} className="sr-only" />
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {done && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{done}</p>}

      {pending && (
        <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
          <p>
            <Trans
              i18nKey={exportedValid ? 'backup.confirmFrom' : 'backup.confirm'}
              values={{
                currentServices: services(data.services.length),
                currentPayments: payments(data.payments.length),
                services: services(pending.services.length),
                payments: payments(pending.payments.length),
                date: exportedValid ? exported.toLocaleString(i18n.language) : '',
              }}
              components={{ b: <span className="font-semibold" /> }}
            />
          </p>
          <p className="font-medium text-red-700">{t('backup.lost')}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={restore}
              className="flex-1 rounded-lg bg-red-600 py-2 font-medium text-white"
            >
              {t('backup.yesReplace')}
            </button>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="flex-1 rounded-lg border border-gray-300 bg-white py-2 font-medium text-gray-700"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
