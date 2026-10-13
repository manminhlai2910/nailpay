import { useEffect, useState } from 'react'
import MonthlyPayTab from './components/MonthlyPayTab'
import ServicesTab from './components/ServicesTab'
import SettingsTab from './components/SettingsTab'
import { currentMonth } from './lib/dates'
import { changeSettingsFrom, settingsForMonth, type Payment, type Service, type SettingsChange } from './lib/pay'
import {
  loadPayments,
  loadServices,
  loadSettingsHistory,
  loadStartingBalance,
  savePayments,
  saveServices,
  saveSettingsHistory,
  saveStartingBalance,
} from './lib/storage'

const TABS = ['Services', 'Monthly Pay', 'Settings'] as const
type Tab = (typeof TABS)[number]

export default function App() {
  const [month, setMonth] = useState(currentMonth)
  const [tab, setTab] = useState<Tab>('Services')
  const [services, setServices] = useState<Service[]>(() => loadServices())
  const [payments, setPayments] = useState<Payment[]>(() => loadPayments())

  const [settingsHistory, setSettingsHistory] = useState<SettingsChange[]>(() => loadSettingsHistory())
  const [startingBalance, setStartingBalance] = useState(loadStartingBalance)

  useEffect(() => saveServices(services), [services])
  useEffect(() => saveSettingsHistory(settingsHistory), [settingsHistory])
  useEffect(() => saveStartingBalance(startingBalance), [startingBalance])
  useEffect(() => savePayments(payments), [payments])

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
        {tab === 'Services' && (
          <ServicesTab services={services} setServices={setServices} month={month} setMonth={setMonth} />
        )}
        {tab === 'Monthly Pay' && (
          <MonthlyPayTab
            month={month}
            data={{ services, payments, settingsHistory, startingBalance }}
            setPayments={setPayments}
          />
        )}
        {tab === 'Settings' && (
          <SettingsTab
            key={month} // reload the fields with the settings in effect for the newly picked month
            month={month}
            settings={settingsForMonth(settingsHistory, month)}
            onChange={(settings) => setSettingsHistory((prev) => changeSettingsFrom(prev, month, settings))}
            startingBalance={startingBalance}
            onStartingBalanceChange={setStartingBalance}
          />
        )}
      </main>
    </div>
  )
}
