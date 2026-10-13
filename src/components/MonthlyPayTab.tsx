import { useState } from 'react'
import { formatMonth } from '../lib/dates'
import {
  calculateMonthlyPay,
  formatMoney,
  monthTotal,
  parsePrices,
  paymentTotal,
  tipTotal,
  type Payment,
  type Service,
} from '../lib/pay'
import type { Settings } from '../lib/storage'
import PaymentsSection from './PaymentsSection'

interface Props {
  month: string // YYYY-MM
  services: Service[] // all services; filtered to `month` here
  payments: Payment[] // all payments; filtered to `month` here
  setPayments: (update: (prev: Payment[]) => Payment[]) => void
  settings: Settings
  owedText: string
  onOwedTextChange: (text: string) => void
}

/** Parse the owed box: blank -> 0, a leading "-" means last month was overpaid. Throws on invalid input. */
function parseOwed(text: string): number {
  const trimmed = text.trim()
  const negative = trimmed.startsWith('-')
  const prices = parsePrices(negative ? trimmed.slice(1) : trimmed)
  if (prices.length > 1) throw new Error('Enter one amount')
  const cents = prices[0] ?? 0
  return negative ? -cents : cents
}

/** "+$150.00" for positive amounts, "-$130.00" for negative, "$0.00" for zero. */
function formatSigned(cents: number): string {
  return cents > 0 ? `+${formatMoney(cents)}` : formatMoney(cents)
}

export default function MonthlyPayTab({
  month,
  services,
  payments,
  setPayments,
  settings,
  owedText,
  onOwedTextChange,
}: Props) {
  const [owedError, setOwedError] = useState('')
  const inMonth = services.filter((s) => s.date.startsWith(`${month}-`))
  const servicesTotalCents = monthTotal(inMonth)
  const paymentsCents = paymentTotal(payments, month)

  let owedFromLastMonthCents = 0
  try {
    owedFromLastMonthCents = parseOwed(owedText)
  } catch {
    // keep 0 while the box holds invalid text; the error is shown below it
  }

  const pay = calculateMonthlyPay({
    servicesTotalCents,
    commissionRate: settings.commissionRate,
    rentCents: settings.rentCents,
    owedFromLastMonthCents,
    paymentsCents,
  })

  function changeOwed(text: string) {
    onOwedTextChange(text)
    try {
      parseOwed(text)
      setOwedError('')
    } catch (err) {
      setOwedError((err as Error).message)
    }
  }

  return (
    <section>
      <h2 className="text-lg font-semibold">{formatMonth(month)}</h2>

      <dl className="mt-2 rounded-2xl bg-white px-4 py-2 shadow-sm">
        <Row
          label={`Total services (${inMonth.length} service${inMonth.length === 1 ? '' : 's'})`}
          cents={servicesTotalCents}
        />
        <Row label={`Commission (${settings.commissionRate}%)`} cents={pay.commissionCents} />
        <Row label="Rent" cents={-settings.rentCents} />
        <Row label="Net earned" cents={pay.netEarnedCents} strong divider />

        <div className="flex items-center gap-3 py-2">
          <dt className="flex-1">
            <label htmlFor="owed-input">Owed from last month</label>
            {owedError && <span className="block text-xs text-red-600">{owedError}</span>}
          </dt>
          <dd className="flex items-center gap-1">
            <span className={`text-sm ${owedFromLastMonthCents < 0 ? 'text-red-600' : 'text-gray-400'}`}>
              {formatSigned(owedFromLastMonthCents)}
            </span>
            <input
              id="owed-input"
              inputMode="decimal"
              placeholder="0"
              value={owedText}
              onChange={(e) => changeOwed(e.target.value)}
              aria-invalid={!!owedError}
              className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-right text-base outline-none focus:border-pink-600 aria-invalid:border-red-500"
            />
          </dd>
        </div>

        <Row label="Total due from owner" cents={pay.totalDueCents} strong divider large />
        <Row label="Paid by owner" cents={-paymentsCents} />
        <Row label="Balance carried to next month" cents={pay.carryForwardCents} strong divider large />
      </dl>

      <p className="mt-4 text-sm text-gray-600">
        Tips this month: <span className="font-semibold text-green-700">{formatMoney(tipTotal(inMonth))}</span>{' '}
        <span className="text-gray-400">(not part of commission)</span>
      </p>

      <PaymentsSection month={month} payments={payments} setPayments={setPayments} />
    </section>
  )
}

function Row({
  label,
  cents,
  strong,
  divider,
  large,
}: {
  label: string
  cents: number
  strong?: boolean
  divider?: boolean
  large?: boolean
}) {
  return (
    <div
      className={`flex items-baseline gap-3 py-2 ${divider ? 'border-t border-gray-200' : ''} ${
        strong ? 'font-semibold' : ''
      } ${large ? 'text-lg' : ''}`}
    >
      <dt className="flex-1">{label}</dt>
      <dd className={`tabular-nums ${cents < 0 ? 'text-red-600' : ''}`}>{formatMoney(cents)}</dd>
    </div>
  )
}
