import { useState } from 'react'
import { formatDay, formatMonth } from '../lib/dates'
import { downloadFile } from '../lib/download'
import { servicesToCsv } from '../lib/exportCsv'
import { formatMoney, groupByDay, monthTotal, tipTotal, type Service } from '../lib/pay'
import ServiceChips from './ServiceChips'

interface Props {
  month: string // YYYY-MM
  services: Service[] // all services; filtered to `month` here
  onUpdate: (service: Service) => void
  onRemove: (id: string) => void
}

export default function MonthView({ month, services, onUpdate, onRemove }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const days = groupByDay(services, month)
  const inMonth = days.flatMap((d) => d.services)

  function toggle(date: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  return (
    <section className="mt-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">{formatMonth(month)}</h2>
        <button
          type="button"
          onClick={() => downloadFile(`nailpay-services-${month}.csv`, servicesToCsv(services, month), 'text/csv')}
          disabled={inMonth.length === 0}
          className="text-sm font-medium text-pink-600 disabled:text-gray-300"
        >
          Export CSV
        </button>
      </div>

      <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
        <Stat label="Services" value={String(inMonth.length)} />
        <Stat label="Total price" value={formatMoney(monthTotal(inMonth))} />
        <Stat label="Total tips" value={formatMoney(tipTotal(inMonth))} />
      </dl>

      {days.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">No services in {formatMonth(month)} yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {days.map((day) => {
            const open = expanded.has(day.date)
            return (
              <li key={day.date} className="rounded-xl bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => toggle(day.date)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <span className="flex-1 font-medium">{formatDay(day.date)}</span>
                  <span className="text-sm text-gray-500">
                    {day.services.length} service{day.services.length === 1 ? '' : 's'}
                  </span>
                  <span className="w-24 text-right font-semibold">{formatMoney(day.totalCents)}</span>
                  <span className={`text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
                </button>
                {open && (
                  <div className="border-t border-gray-100 px-4 py-3">
                    <ServiceChips services={day.services} onUpdate={onUpdate} onRemove={onRemove} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-2 py-3 shadow-sm">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5 font-semibold">{value}</dd>
    </div>
  )
}
