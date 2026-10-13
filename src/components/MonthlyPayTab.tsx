import { useTranslation } from 'react-i18next'
import { formatMonth } from '../lib/dates'
import { formatMoney, statementForMonth, tipTotal, type Payment, type PayData } from '../lib/pay'
import type { Profile } from '../lib/storage'
import PaymentsSection from './PaymentsSection'
import PrintStatement from './PrintStatement'

interface Props {
  month: string // YYYY-MM
  data: PayData // everything; the statement carries balances forward from the start month
  setPayments: (update: (prev: Payment[]) => Payment[]) => void
  profile: Profile // name and salon for the printed statement
}

export default function MonthlyPayTab({ month, data, setPayments, profile }: Props) {
  const inMonth = data.services.filter((s) => s.date.startsWith(`${month}-`))
  const statement = statementForMonth(data, month)
  const { settings } = statement
  const { t, i18n } = useTranslation()

  return (
    <>
      <section className="print:hidden">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">{formatMonth(month, i18n.language)}</h2>
          <button type="button" onClick={() => window.print()} className="text-sm font-medium text-pink-600">
            {t('pay.print')}
          </button>
        </div>
        {!profile.name.trim() && !profile.salonName.trim() && (
          <p className="text-xs text-gray-400">{t('pay.profileHint')}</p>
        )}

        <BalanceBanner cents={statement.carryForwardCents} />

        <dl className="mt-4 rounded-2xl bg-white px-4 py-2 shadow-sm">
          <Row label={t('pay.totalServices', { count: inMonth.length })} cents={statement.servicesTotalCents} />
          <Row label={t('pay.commission', { rate: settings.commissionRate })} cents={statement.commissionCents} />
          <Row label={t('pay.rent')} cents={-settings.rentCents} />
          <Row label={t('pay.netEarned')} cents={statement.netEarnedCents} strong divider />
          <Row
            label={statement.isFirstMonth ? t('pay.startingBalance') : t('pay.owedLastMonth')}
            cents={statement.owedFromLastMonthCents}
          />
          <Row label={t('pay.totalDueFromOwner')} cents={statement.totalDueCents} strong divider large />
          <Row label={t('pay.paidByOwner')} cents={-statement.paymentsCents} />
          <Row label={t('pay.carryNext')} cents={statement.carryForwardCents} strong divider large />
        </dl>

        <p className="mt-4 text-sm text-gray-600">
          {t('pay.tipsThisMonth')}{' '}
          <span className="font-semibold text-green-700">{formatMoney(tipTotal(inMonth))}</span>{' '}
          <span className="text-gray-400">{t('pay.tipsNote')}</span>
        </p>

        <PaymentsSection month={month} payments={data.payments} setPayments={setPayments} />
      </section>

      <PrintStatement
        className="hidden print:block"
        month={month}
        statement={statement}
        services={inMonth}
        payments={data.payments.filter((p) => p.date.startsWith(`${month}-`))}
        profile={profile}
      />
    </>
  )
}

/** Where things stand at the end of the month: settled, owner owes you, or you owe the owner. */
function BalanceBanner({ cents }: { cents: number }) {
  const { t } = useTranslation()
  const [text, style] =
    cents === 0
      ? [t('pay.paidInFull'), 'border-green-200 bg-green-50 text-green-800']
      : cents > 0
        ? [t('pay.ownerOwes', { amount: formatMoney(cents) }), 'border-orange-200 bg-orange-50 text-orange-800']
        : [t('pay.youOwe', { amount: formatMoney(-cents) }), 'border-red-200 bg-red-50 text-red-800']
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
