import { useTranslation } from 'react-i18next'
import { formatDay, formatMonth } from '../lib/dates'
import { formatMoney, groupByDay, type MonthStatement, type Payment, type Service } from '../lib/pay'
import type { Profile } from '../lib/storage'

interface Props {
  month: string // YYYY-MM
  statement: MonthStatement
  services: Service[] // services in `month`
  payments: Payment[] // payments in `month`
  profile: Profile
  className?: string
}

/** The pay statement laid out for paper, in the chosen language: daily totals left, the pay calculation right. */
export default function PrintStatement({ month, statement, services, payments, profile, className = '' }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const days = groupByDay(services).reverse() // oldest first
  const sortedPayments = [...payments].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  const who = [profile.name.trim(), profile.salonName.trim()].filter(Boolean)
  const generated = new Date().toLocaleDateString(lang, { month: 'long', day: 'numeric', year: 'numeric' })
  const { settings } = statement

  return (
    <article className={`text-sm text-black ${className}`}>
      <header className="border-b-2 border-black pb-2">
        <h1 className="text-2xl font-bold">{t('statement.title', { month: formatMonth(month, lang) })}</h1>
        {who.length > 0 && <p className="mt-1 text-base">{who.join(' · ')}</p>}
      </header>

      <div className="mt-4 grid grid-cols-2 gap-8">
        <section>
          <h2 className="mb-1 font-semibold">{t('statement.daily')}</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b border-black text-left">
                <th className="py-0.5 font-semibold">{t('common.date')}</th>
                <th className="py-0.5 text-right font-semibold">{t('statement.services')}</th>
                <th className="py-0.5 text-right font-semibold">{t('statement.dayTotal')}</th>
              </tr>
            </thead>
            <tbody>
              {days.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-1 text-gray-600">
                    {t('statement.noServices')}
                  </td>
                </tr>
              )}
              {days.map((d) => (
                <tr key={d.date} className="border-b border-gray-300">
                  <td className="py-px">{formatDay(d.date, lang)}</td>
                  <td className="py-px text-right tabular-nums">{d.services.length}</td>
                  <td className="py-px text-right tabular-nums">{formatMoney(d.totalCents)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black font-semibold">
                <td className="py-1">{t('statement.monthTotal')}</td>
                <td className="py-1 text-right tabular-nums">{services.length}</td>
                <td className="py-1 text-right tabular-nums">{formatMoney(statement.servicesTotalCents)}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        <section>
          <h2 className="mb-1 font-semibold">{t('statement.calculation')}</h2>
          <dl>
            <Line label={t('statement.totalServices')} cents={statement.servicesTotalCents} />
            <Line label={t('pay.commission', { rate: settings.commissionRate })} cents={statement.commissionCents} />
            <Line label={t('pay.rent')} cents={-settings.rentCents} />
            <Line label={t('pay.netEarned')} cents={statement.netEarnedCents} total />
            <Line
              label={statement.isFirstMonth ? t('pay.startingBalance') : t('pay.owedLastMonth')}
              cents={statement.owedFromLastMonthCents}
            />
            <Line label={t('statement.totalDue')} cents={statement.totalDueCents} total />
          </dl>

          <h2 className="mt-4 mb-1 font-semibold">{t('statement.payments')}</h2>
          <table className="w-full">
            <tbody>
              {sortedPayments.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-0.5 text-gray-600">
                    {t('statement.none')}
                  </td>
                </tr>
              )}
              {sortedPayments.map((p) => (
                <tr key={p.id} className="border-b border-gray-300">
                  <td className="py-0.5">{formatDay(p.date, lang)}</td>
                  <td className="py-0.5">
                    {t(`method.${p.method}`)}
                    {p.note && <span className="text-gray-600"> · {p.note}</span>}
                  </td>
                  <td className="py-0.5 text-right tabular-nums">{formatMoney(p.amountCents)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td colSpan={2} className="py-1">
                  {t('statement.totalPaid')}
                </td>
                <td className="py-1 text-right tabular-nums">{formatMoney(statement.paymentsCents)}</td>
              </tr>
            </tfoot>
          </table>

          <dl className="mt-3 border-t-2 border-b-2 border-black">
            <Line label={t('statement.carryForward')} cents={statement.carryForwardCents} strong />
          </dl>
        </section>
      </div>

      <footer className="mt-4 border-t border-gray-400 pt-2 text-xs text-gray-600">
        {t('statement.generated', { date: generated })}
      </footer>
    </article>
  )
}

function Line({ label, cents, total, strong }: { label: string; cents: number; total?: boolean; strong?: boolean }) {
  return (
    <div
      className={`flex items-baseline gap-3 py-0.5 ${total ? 'border-t border-black font-semibold' : ''} ${
        strong ? 'py-1 text-base font-bold' : ''
      }`}
    >
      <dt className="flex-1">{label}</dt>
      <dd className="tabular-nums">{formatMoney(cents)}</dd>
    </div>
  )
}
