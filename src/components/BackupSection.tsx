import { useState, type ChangeEvent } from 'react'
import { backupFileName, createBackup, parseBackup, type Backup, type BackupData } from '../lib/backup'
import { today } from '../lib/dates'
import { downloadFile } from '../lib/download'

interface Props {
  data: BackupData
  onRestore: (data: BackupData) => void
}

const count = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** Download all data as one JSON file, or replace all data from such a file after confirmation. */
export default function BackupSection({ data, onRestore }: Props) {
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
      setError((err as Error).message)
    }
  }

  function restore() {
    if (!pending) return
    const { exportedAt: _exportedAt, ...restored } = pending
    onRestore(restored)
    setPending(null)
    setDone(`Restored ${count(restored.services.length, 'service')} and ${count(restored.payments.length, 'payment')}.`)
  }

  const exported = pending?.exportedAt ? new Date(pending.exportedAt) : null

  return (
    <section className="mt-4 space-y-4 rounded-2xl bg-white p-4 shadow-sm">
      <div>
        <h2 className="font-semibold">Backup</h2>
        <p className="mt-1 text-sm text-gray-500">
          Your data lives only in this browser. Download a backup now and then, and keep it somewhere safe.
        </p>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={backUp} className="flex-1 rounded-lg bg-pink-600 py-2 font-medium text-white">
          Download backup
        </button>
        <label className="flex-1 cursor-pointer rounded-lg border border-gray-300 py-2 text-center font-medium text-gray-700 focus-within:border-pink-600">
          Restore from backup
          <input type="file" accept=".json,application/json" onChange={pickFile} className="sr-only" />
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {done && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{done}</p>}

      {pending && (
        <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
          <p>
            Replace <span className="font-semibold">everything</span> in NailPay (
            {count(data.services.length, 'service')}, {count(data.payments.length, 'payment')}, and your settings) with
            this backup
            {exported && !isNaN(exported.getTime()) && <> from {exported.toLocaleString()}</>} (
            {count(pending.services.length, 'service')}, {count(pending.payments.length, 'payment')})?
          </p>
          <p className="font-medium text-red-700">Your current data will be lost. This can't be undone.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={restore}
              className="flex-1 rounded-lg bg-red-600 py-2 font-medium text-white"
            >
              Yes, replace my data
            </button>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="flex-1 rounded-lg border border-gray-300 bg-white py-2 font-medium text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
