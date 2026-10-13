import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { errorText } from '../i18n'
import { formatDay, today } from '../lib/dates'
import { AppError } from '../lib/errors'
import { newId } from '../lib/id'
import { formatMoney, parsePrices, paymentTotal, PAYMENT_METHODS, type Payment, type PaymentMethod } from '../lib/pay'

interface Props {
  month: string // YYYY-MM
  payments: Payment[] // all payments; filtered to `month` here
  setPayments: (update: (prev: Payment[]) => Payment[]) => void
}

/** Today if it falls in `month`, otherwise the month's first day, so a new payment always lands in the month shown. */
function defaultDate(month: string): string {
  const t = today()
  return t.startsWith(`${month}-`) ? t : `${month}-01`
}

/** Last day of "YYYY-MM" as "YYYY-MM-DD". */
function lastDay(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
}

function centsToInput(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2)
}

export default function PaymentsSection({ month, payments, setPayments }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [editingId, setEditingId] = useState<string | null>(null)
  const inMonth = payments
    .filter((p) => p.date.startsWith(`${month}-`))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

  function add(payment: Omit<Payment, 'id'>) {
    setPayments((prev) => [...prev, { ...payment, id: newId() }])
  }

  function update(updated: Payment) {
    setPayments((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    setEditingId(null)
  }

  function remove(id: string) {
    if (id === editingId) setEditingId(null)
    setPayments((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">{t('payments.title')}</h2>

      <div className="mt-2 rounded-2xl bg-white p-4 shadow-sm">
        {/* key resets the form (and its default date) when the month changes */}
        <PaymentForm key={month} month={month} initial={{ date: defaultDate(month) }} submitLabel={t('common.add')} onSubmit={add} />
      </div>

      {inMonth.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">{t('payments.none')}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {inMonth.map((p) => (
            <li key={p.id} className="rounded-xl bg-white shadow-sm">
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setEditingId(p.id === editingId ? null : p.id)}
                  aria-expanded={p.id === editingId}
                  className="flex min-w-0 flex-1 items-baseline gap-3 py-3 pl-4 text-left"
                >
                  <span className="w-28 shrink-0 font-medium">{formatDay(p.date, lang)}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-gray-500">
                    {t(`method.${p.method}`)}
                    {p.note && ` · ${p.note}`}
                  </span>
                  <span className="font-semibold tabular-nums">{formatMoney(p.amountCents)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  aria-label={t('payments.delete', { amount: formatMoney(p.amountCents), date: formatDay(p.date, lang) })}
                  className="px-4 py-3 text-gray-400 hover:text-red-600"
                >
                  ×
                </button>
              </div>
              {p.id === editingId && (
                <div className="border-t border-gray-100 p-4">
                  <PaymentForm
                    month={month}
                    initial={p}
                    submitLabel={t('common.save')}
                    onSubmit={(fields) => update({ ...fields, id: p.id })}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 flex items-baseline font-semibold">
        <span className="flex-1">{t('payments.total')}</span>
        <span className="tabular-nums">{formatMoney(paymentTotal(inMonth))}</span>
      </p>
    </section>
  )
}

function PaymentForm({
  month,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  month: string
  initial: Partial<Payment> & { date: string }
  submitLabel: string
  onSubmit: (payment: Omit<Payment, 'id'>) => void
  onCancel?: () => void
}) {
  const [date, setDate] = useState(initial.date)
  const [amount, setAmount] = useState(initial.amountCents === undefined ? '' : centsToInput(initial.amountCents))
  const [method, setMethod] = useState<PaymentMethod>(initial.method ?? 'Cash')
  const [note, setNote] = useState(initial.note ?? '')
  const [error, setError] = useState('')
  const { t } = useTranslation()

  function submit(e: FormEvent) {
    e.preventDefault()
    try {
      const prices = parsePrices(amount)
      if (prices.length > 1) throw new AppError('Enter one amount', 'errors.oneAmount')
      const amountCents = prices[0]
      if (!amountCents) throw new AppError('Amount is required', 'errors.amountRequired')
      onSubmit({ date, amountCents, method, note: note.trim() || undefined })
      if (!onCancel) {
        // adding: clear for the next payment, keep date and method
        setAmount('')
        setNote('')
      }
      setError('')
    } catch (err) {
      setError(errorText(err, t))
    }
  }

  const field = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base outline-none focus:border-pink-600'

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-gray-600">
          {t('common.date')}
          <input
            type="date"
            value={date}
            min={`${month}-01`}
            max={lastDay(month)}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className={field}
          />
        </label>
        <label className="text-xs text-gray-600">
          {t('payments.amount')}
          <input
            inputMode="decimal"
            autoComplete="off"
            placeholder={t('payments.amountPlaceholder')}
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              if (error) setError('')
            }}
            aria-invalid={!!error}
            className={`${field} aria-invalid:border-red-500`}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-gray-600">
          {t('payments.method')}
          <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={field}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {t(`method.${m}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-gray-600">
          {t('common.note')}
          <input value={note} onChange={(e) => setNote(e.target.value)} className={field} />
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-gray-600">
            {t('common.cancel')}
          </button>
        )}
        <button type="submit" className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white">
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
