import { useMemo, useState, type ChangeEvent } from 'react'
import { formatMonthYearShort } from '../lib/dates'
import { newId } from '../lib/id'
import {
  analyzeCsv,
  applyImport,
  guessColumns,
  IMPORT_FIELDS,
  monthsWithServices,
  parseCsv,
  summarizeByMonth,
  type ColumnMap,
  type ConflictChoice,
  type ImportField,
} from '../lib/importCsv'
import { formatMoney, type Service } from '../lib/pay'

interface Props {
  services: Service[]
  setServices: (update: (prev: Service[]) => Service[]) => void
}

const FIELD_LABELS: Record<ImportField, string> = {
  date: 'Date',
  price: 'Price',
  service: 'Service',
  tip: 'Tip',
  note: 'Note',
}
const REQUIRED: ImportField[] = ['date', 'price']

interface Loaded {
  fileName: string
  csv: string[][]
}

/** Import services from a CSV saved out of Excel. Nothing is saved until the import is confirmed. */
export default function ImportCsv({ services, setServices }: Props) {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [columns, setColumns] = useState<ColumnMap | null>(null)
  const [choices, setChoices] = useState<Record<string, ConflictChoice>>({})
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  async function pickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // let the same file be picked again
    if (!file) return
    setDone('')
    try {
      const csv = parseCsv(await file.text())
      if (csv.length < 2) throw new Error('That file has no rows under the header.')
      setLoaded({ fileName: file.name, csv })
      setColumns(guessColumns(csv[0]))
      setChoices({})
      setConfirming(false)
      setError('')
    } catch (err) {
      setLoaded(null)
      setError((err as Error).message)
    }
  }

  function reset() {
    setLoaded(null)
    setColumns(null)
    setChoices({})
    setConfirming(false)
  }

  const missing = columns ? REQUIRED.filter((f) => columns[f] < 0) : []
  const analysis = useMemo(
    () => (loaded && columns && REQUIRED.every((f) => columns[f] >= 0) ? analyzeCsv(loaded.csv, columns) : null),
    [loaded, columns],
  )
  const months = useMemo(() => (analysis ? summarizeByMonth(analysis.rows) : []), [analysis])
  const conflicts = useMemo(
    () => monthsWithServices(services, months.map((m) => m.month)),
    [services, months],
  )
  const skipped = new Set(conflicts.filter((m) => choices[m] !== 'replace'))
  const toImport = analysis ? analysis.rows.filter((r) => !skipped.has(r.date.slice(0, 7))) : []
  const replaced = conflicts.filter((m) => choices[m] === 'replace')
  const replacedCount = services.filter((s) => replaced.includes(s.date.slice(0, 7))).length

  function confirmImport() {
    if (!analysis) return
    setServices((prev) => applyImport(prev, analysis.rows, choices, newId))
    setDone(
      `Imported ${toImport.length} ${toImport.length === 1 ? 'service' : 'services'}` +
        (replacedCount ? ` and replaced ${replacedCount} existing.` : '.'),
    )
    reset()
  }

  const headers = loaded?.csv[0] ?? []
  const select = 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-2 text-base outline-none focus:border-pink-600'

  return (
    <section className="mt-4 space-y-4 rounded-2xl bg-white p-4 shadow-sm">
      <div>
        <h2 className="font-semibold">Import from Excel (CSV)</h2>
        <p className="mt-1 text-sm text-gray-500">
          In Excel, choose File › Save As › CSV. The first row should be column names. Columns: Date and Price, plus
          optional Service, Tip and Note.
        </p>
      </div>

      <label className="block">
        <span className="sr-only">CSV file</span>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={pickFile}
          className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-pink-50 file:px-3 file:py-2 file:font-medium file:text-pink-700"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {done && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{done}</p>}

      {loaded && columns && (
        <>
          <fieldset className="border-t border-gray-100 pt-3">
            <legend className="text-sm font-medium text-gray-600">Columns in {loaded.fileName}</legend>
            <div className="mt-1 grid grid-cols-2 gap-3">
              {IMPORT_FIELDS.map((field) => (
                <label key={field} className="block text-sm text-gray-600">
                  {FIELD_LABELS[field]}
                  {REQUIRED.includes(field) ? '' : ' (optional)'}
                  <select
                    value={columns[field]}
                    onChange={(e) => {
                      setColumns({ ...columns, [field]: Number(e.target.value) })
                      setConfirming(false)
                    }}
                    aria-invalid={columns[field] < 0 && REQUIRED.includes(field)}
                    className={`${select} aria-invalid:border-red-500`}
                  >
                    <option value={-1}>{REQUIRED.includes(field) ? 'Choose a column…' : '— none —'}</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h.trim() || `Column ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            {missing.length > 0 && (
              <p className="mt-2 text-sm text-red-600">
                Pick the {missing.map((f) => FIELD_LABELS[f]).join(' and ')} column to see the preview.
              </p>
            )}
          </fieldset>

          {analysis && (
            <>
              <div className="border-t border-gray-100 pt-3 text-sm">
                <p>
                  <span className="font-semibold text-green-700">{analysis.rows.length} rows OK</span>
                  {' · '}
                  <span className={analysis.flagged.length ? 'font-semibold text-red-600' : 'text-gray-500'}>
                    {analysis.flagged.length} flagged
                  </span>
                  {analysis.flagged.length > 0 && <span className="text-gray-500"> (won't be imported)</span>}
                </p>
                <ul className="mt-2 space-y-1">
                  {months.map((m) => (
                    <li key={m.month} className="flex items-baseline gap-2">
                      <span className="w-20 shrink-0 font-medium">{formatMonthYearShort(m.month)}</span>
                      <span className="flex-1 text-gray-500">
                        {m.count} {m.count === 1 ? 'service' : 'services'}
                      </span>
                      <span className="tabular-nums">{formatMoney(m.totalCents)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {conflicts.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
                  <p className="font-medium text-amber-900">
                    {conflicts.length === 1 ? 'This month already has' : 'These months already have'} services in
                    NailPay:
                  </p>
                  <ul className="mt-2 space-y-2">
                    {conflicts.map((m) => (
                      <li key={m} className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="w-20 font-medium">{formatMonthYearShort(m)}</span>
                        {(['replace', 'skip'] as const).map((choice) => (
                          <label key={choice} className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name={`conflict-${m}`}
                              checked={(choices[m] ?? 'skip') === choice}
                              onChange={() => {
                                setChoices({ ...choices, [m]: choice })
                                setConfirming(false)
                              }}
                              className="accent-pink-600"
                            />
                            {choice === 'replace' ? 'Replace that month' : 'Skip'}
                          </label>
                        ))}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="max-h-96 overflow-auto rounded-lg border border-gray-200">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="px-2 py-1.5 font-medium">Row</th>
                      <th className="px-2 py-1.5 font-medium">Date</th>
                      <th className="px-2 py-1.5 font-medium">Service</th>
                      <th className="px-2 py-1.5 text-right font-medium">Price</th>
                      <th className="px-2 py-1.5 text-right font-medium">Tip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {analysis.flagged.map((f) => (
                      <tr key={`f${f.row}`} className="bg-red-50 text-red-700">
                        <td className="px-2 py-1.5 tabular-nums">{f.row}</td>
                        <td colSpan={4} className="px-2 py-1.5">
                          <span className="font-medium">{f.reason}</span>
                          <span className="block truncate text-xs text-red-500">{f.cells.join(' · ')}</span>
                        </td>
                      </tr>
                    ))}
                    {analysis.rows.map((r) => (
                      <tr key={r.row} className={skipped.has(r.date.slice(0, 7)) ? 'text-gray-400 line-through' : ''}>
                        <td className="px-2 py-1.5 text-gray-400 tabular-nums">{r.row}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap">{r.date}</td>
                        <td className="max-w-28 truncate px-2 py-1.5">{r.name}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{formatMoney(r.priceCents)}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">
                          {r.tipCents ? formatMoney(r.tipCents) : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {confirming ? (
                <div className="space-y-3 rounded-lg border border-pink-200 bg-pink-50 p-3 text-sm">
                  <p>
                    Add <span className="font-semibold">{toImport.length}</span>{' '}
                    {toImport.length === 1 ? 'service' : 'services'}
                    {replacedCount > 0 && (
                      <>
                        {' '}
                        and <span className="font-semibold text-red-700">delete {replacedCount} existing</span> in{' '}
                        {replaced.map(formatMonthYearShort).join(', ')}
                      </>
                    )}
                    ? This can't be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={confirmImport}
                      className="flex-1 rounded-lg bg-pink-600 py-2 font-medium text-white"
                    >
                      Yes, import
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(false)}
                      className="flex-1 rounded-lg border border-gray-300 bg-white py-2 font-medium text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirming(true)}
                    disabled={toImport.length === 0}
                    className="flex-1 rounded-lg bg-pink-600 py-2 font-medium text-white disabled:opacity-40"
                  >
                    Import {toImport.length} {toImport.length === 1 ? 'service' : 'services'}
                  </button>
                  <button type="button" onClick={reset} className="text-sm text-gray-500">
                    Cancel
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  )
}
