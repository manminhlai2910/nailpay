import { useState } from 'react'

const TABS = ['Services', 'Monthly Pay', 'Settings'] as const
type Tab = (typeof TABS)[number]

/** Current month as "YYYY-MM" in local time. */
function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export default function App() {
  const [month, setMonth] = useState(currentMonth)
  const [tab, setTab] = useState<Tab>('Services')

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-gray-50 text-gray-900">
      <div className="sticky top-0 z-10 shadow">
        <header className="bg-pink-600 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 text-white">
          <h1 className="text-2xl font-bold tracking-tight">NailPay</h1>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <span className="sr-only">Month</span>
            <input
              type="month"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              className="w-full rounded-lg bg-white/15 px-3 py-2 text-base text-white outline-none focus:bg-white/25 [color-scheme:dark]"
            />
          </label>
        </header>

        <nav className="grid grid-cols-3 border-b border-gray-200 bg-white">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 text-sm font-medium transition-colors ${
                tab === t ? 'border-b-2 border-pink-600 text-pink-600' : 'text-gray-500'
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      <main className="flex-1 p-4">
        <p className="text-gray-500">
          {tab} for {formatMonth(month)} — coming soon.
        </p>
      </main>
    </div>
  )
}
