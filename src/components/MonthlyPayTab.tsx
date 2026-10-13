import { formatMonth } from '../lib/dates'
import { formatMoney, statementForMonth, tipTotal, type Payment, type PayData } from '../lib/pay'
import PaymentsSection from './PaymentsSection'

interface Props {
  month: string // YYYY-MM
  data: PayData // everything; the statement carries balances forward from the start month
  setPayments: (update: (prev: Payment[]) => Payment[]) => void
}

export default function MonthlyPayTab({ month, data, setPayments }: Props) {
  const inMonth = data.services.filter((s) => s.date.startsWith(`${month}-`))
  const statement = statementForMonth(data, month)
  const { settings } = statement

  return (
    <section>
      <h2 className="text-lg font-semibold">{formatMonth(month)}</h2>

      <BalanceBanner cents={statement.carryForwardCents} />

      <dl className="mt-4 rounded-2xl bg-white px-4 py-2 shadow-sm">
        <Row
          label={`Total services (${inMonth.length} service${inMonth.length === 1 ? '' : 's'})`}
          cents={statement.servicesTotalCents}
        />
        <Row label={`Commission (${settings.commissionRate}%)`} cents={statement.commissionCents} />
        <Row label="Rent" cents={-settings.rentCents} />
        <Row label="Net earned" cents={statement.netEarnedCents} strong divider />
        <Row
          label={statement.isFirstMonth ? 'Starting balance' : 'Owed from last month'}
          cents={statement.owedFromLastMonthCents}
        />
        <Row label="Total due from owner" cents={statement.totalDueCents} strong divider large />
        <Row label="Paid by owner" cents={-statement.paymentsCents} />
        <Row label="Balance carried to next month" cents={statement.carryForwardCents} strong divider large />
      </dl>

      <p className="mt-4 text-sm text-gray-600">
        Tips this month: <span className="font-semibold text-green-700">{formatMoney(tipTotal(inMonth))}</span>{' '}
        <span className="text-gray-400">(not part of commission)</span>
      </p>

      <PaymentsSection month={month} payments={data.payments} setPayments={setPayments} />
    </section>
  )
}

/** Where things stand at the end of the month: settled, owner owes you, or you owe the owner. */
function BalanceBanner({ cents }: { cents: number }) {
  const [text, style] =
    cents === 0
      ? ['Paid in full', 'border-green-200 bg-green-50 text-green-800']
      : cents > 0
        ? [`Owner owes you ${formatMoney(cents)}`, 'border-orange-200 bg-orange-50 text-orange-800']
        : [`You owe the owner ${formatMoney(-cents)}`, 'border-red-200 bg-red-50 text-red-800']
  return (
    <p role="status" className={`mt-2 rounded-2xl border px-4 py-3 text-center text-xl font-bold ${style}`}>
      {text}
    </p>
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
