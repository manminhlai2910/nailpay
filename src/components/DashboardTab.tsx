import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { addMonths, formatMonth, formatMonthShort } from '../lib/dates'
import {
  formatMoney,
  startMonth,
  statementsBetween,
  tipTotal,
  topServicesByRevenue,
  type PayData,
} from '../lib/pay'

interface Props {
  month: string // YYYY-MM
  data: PayData
}

export default function DashboardTab({ month, data }: Props) {
  const inMonth = data.services.filter((s) => s.date.startsWith(`${month}-`))
  const start = startMonth(data) ?? month
  // history runs from the start of the carryover chain to the selected month; the chart shows its last 12 months
  const history = statementsBetween(data, start < month ? start : month, month)
  const statement = history.at(-1)!
  const chartStart = addMonths(month, -11)
  const chart = statementsBetween(data, chartStart, month).map((s) => ({
    month: s.month,
    label: formatMonthShort(s.month),
    net: s.netEarnedCents / 100,
  }))
  const top = topServicesByRevenue(inMonth, 5)

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{formatMonth(month)}</h2>
        <dl className="mt-2 grid grid-cols-2 gap-2">
          <Card label="Services" value={String(inMonth.length)} />
          <Card label="Gross" value={formatMoney(statement.servicesTotalCents)} />
          <Card label="Net earned so far" cents={statement.netEarnedCents} />
          <Card label="Tips" value={formatMoney(tipTotal(inMonth))} />
          <Card label="Balance owed" cents={statement.carryForwardCents} wide />
        </dl>
      </div>

      <div>
        <h2 className="text-lg font-semibold">Net earned, last 12 months</h2>
        <div className="mt-2 h-56 rounded-2xl bg-white py-3 pr-3 shadow-sm">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                interval={0}
                tick={{ fontSize: 10, fill: '#6b7280' }}
              />
              <YAxis
                width={44}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: '#6b7280' }}
                tickFormatter={compactDollars}
              />
              <ReferenceLine y={0} stroke="#d1d5db" />
              <Tooltip
                cursor={{ fill: '#fdf2f8' }}
                formatter={(value) => [formatMoney(Math.round(Number(value) * 100)), 'Net earned']}
                labelFormatter={(_, payload) => (payload?.[0] ? formatMonth(payload[0].payload.month) : '')}
                contentStyle={{ borderRadius: 8, borderColor: '#e5e7eb', fontSize: 12 }}
              />
              <Bar dataKey="net" fill="#db2777" radius={[4, 4, 0, 0]} maxBarSize={20} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold">Top services this month</h2>
        {top.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No services in {formatMonth(month)} yet.</p>
        ) : (
          <ol className="mt-2 rounded-2xl bg-white px-4 py-1 shadow-sm">
            {top.map((s, i) => (
              <li key={s.name} className="flex items-baseline gap-3 border-gray-100 py-2 not-first:border-t">
                <span className="w-4 text-sm text-gray-400">{i + 1}</span>
                <span className={`flex-1 truncate ${s.name ? '' : 'text-gray-500 italic'}`}>{s.name || 'Unnamed'}</span>
                <span className="text-sm text-gray-500">×{s.count}</span>
                <span className="w-24 text-right font-semibold tabular-nums">{formatMoney(s.totalCents)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold">History</h2>
        <div className="mt-2 overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full text-xs tabular-nums">
            <thead className="text-xs text-gray-500">
              <tr className="border-b border-gray-200">
                <th className="py-2 pr-1 pl-3 text-left font-medium">Month</th>
                <th className="px-1 py-2 text-right font-medium">Services</th>
                <th className="px-1 py-2 text-right font-medium">Net</th>
                <th className="px-1 py-2 text-right font-medium">Paid</th>
                <th className="py-2 pr-3 pl-1 text-right font-medium">Carried</th>
              </tr>
            </thead>
            <tbody>
              {[...history].reverse().map((s) => (
                <tr key={s.month} className={`border-gray-100 not-first:border-t ${s.month === month ? 'font-semibold' : ''}`}>
                  <td className="py-2 pr-1 pl-3 whitespace-nowrap">
                    {formatMonthShort(s.month)} ’{s.month.slice(2, 4)}
                  </td>
                  <Money cents={s.servicesTotalCents} />
                  <Money cents={s.netEarnedCents} />
                  <Money cents={s.paymentsCents} />
                  <Money cents={s.carryForwardCents} last />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

/** 1500 -> "$1.5k", 300 -> "$300", -500 -> "-$500" */
function compactDollars(dollars: number): string {
  const sign = dollars < 0 ? '-' : ''
  const abs = Math.abs(dollars)
  return abs >= 1000 ? `${sign}$${+(abs / 1000).toFixed(1)}k` : `${sign}$${abs}`
}

function Card({ label, value, cents, wide }: { label: string; value?: string; cents?: number; wide?: boolean }) {
  return (
    <div className={`rounded-xl bg-white px-4 py-3 shadow-sm ${wide ? 'col-span-2' : ''}`}>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className={`mt-0.5 text-lg font-semibold tabular-nums ${cents !== undefined && cents < 0 ? 'text-red-600' : ''}`}>
        {value ?? formatMoney(cents!)}
      </dd>
    </div>
  )
}

function Money({ cents, last }: { cents: number; last?: boolean }) {
  return (
    <td className={`py-2 text-right ${last ? 'pr-3 pl-1' : 'px-1'} ${cents < 0 ? 'text-red-600' : ''}`}>
      {formatMoney(cents)}
    </td>
  )
}
