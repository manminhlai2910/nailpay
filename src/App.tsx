import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import BackupSection from './components/BackupSection'
import DashboardTab from './components/DashboardTab'
import ImportCsv from './components/ImportCsv'
import LanguageToggle from './components/LanguageToggle'
import MonthlyPayTab from './components/MonthlyPayTab'
import ServicesTab from './components/ServicesTab'
import SettingsTab from './components/SettingsTab'
import type { BackupData } from './lib/backup'
import { currentMonth } from './lib/dates'
import { changeSettingsFrom, settingsForMonth, type Payment, type Service, type SettingsChange } from './lib/pay'
import {
  loadPayments,
  loadProfile,
  loadServices,
  loadSettingsHistory,
  loadStartingBalance,
  savePayments,
  saveProfile,
  saveServices,
  saveSettingsHistory,
  saveStartingBalance,
} from './lib/storage'

const TABS = ['dashboard', 'services', 'pay', 'settings'] as const
type Tab = (typeof TABS)[number]

export default function App() {
  const { t } = useTranslation()
  const [month, setMonth] = useState(currentMonth)
  const [tab, setTab] = useState<Tab>('dashboard')
  const [services, setServices] = useState<Service[]>(() => loadServices())
  const [payments, setPayments] = useState<Payment[]>(() => loadPayments())

  const [settingsHistory, setSettingsHistory] = useState<SettingsChange[]>(() => loadSettingsHistory())
  const [startingBalance, setStartingBalance] = useState(loadStartingBalance)
  const [profile, setProfile] = useState(loadProfile)
  const [restores, setRestores] = useState(0) // bumped on restore so the settings fields reload

  useEffect(() => saveServices(services), [services])
  useEffect(() => saveSettingsHistory(settingsHistory), [settingsHistory])
  useEffect(() => saveStartingBalance(startingBalance), [startingBalance])
  useEffect(() => savePayments(payments), [payments])
  useEffect(() => saveProfile(profile), [profile])

  function restore(data: BackupData) {
    setServices(data.services)
    setPayments(data.payments)
    setSettingsHistory(data.settingsHistory)
    setStartingBalance(data.startingBalance)
    setProfile(data.profile)
    setRestores((n) => n + 1)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-gray-50 text-gray-900 print:min-h-0 print:max-w-none print:bg-white">
      <div className="sticky top-0 z-10 shadow print:hidden">
        <header className="bg-pink-600 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 text-white">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold tracking-tight">NailPay</h1>
            <LanguageToggle />
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <span className="sr-only">{t('month')}</span>
            <input
              type="month"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              className="w-full rounded-lg bg-white/15 px-3 py-2 text-base text-white outline-none focus:bg-white/25 [color-scheme:dark]"
            />
          </label>
        </header>

        <nav className="grid grid-cols-4 border-b border-gray-200 bg-white">
          {TABS.map((id) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-1 py-3 text-sm leading-tight font-medium transition-colors ${
                tab === id ? 'border-b-2 border-pink-600 text-pink-600' : 'text-gray-500'
              }`}
            >
              {t(`tabs.${id}`)}
            </button>
          ))}
        </nav>
      </div>

      <main className="flex-1 p-4 print:p-0">
        {tab === 'dashboard' && (
          <DashboardTab month={month} data={{ services, payments, settingsHistory, startingBalance }} />
        )}
        {tab === 'services' && (
          <ServicesTab services={services} setServices={setServices} month={month} setMonth={setMonth} />
        )}
        {tab === 'pay' && (
          <MonthlyPayTab
            month={month}
            data={{ services, payments, settingsHistory, startingBalance }}
            setPayments={setPayments}
            profile={profile}
          />
        )}
        {tab === 'settings' && (
          <SettingsTab
            key={`${month}-${restores}`} // reload the fields for the newly picked month, or after a restore
            month={month}
            settings={settingsForMonth(settingsHistory, month)}
            onChange={(settings) => setSettingsHistory((prev) => changeSettingsFrom(prev, month, settings))}
            startingBalance={startingBalance}
            onStartingBalanceChange={setStartingBalance}
            profile={profile}
            onProfileChange={setProfile}
          />
        )}
        {tab === 'settings' && (
          <>
            <ImportCsv services={services} setServices={setServices} />
            <BackupSection
              data={{ services, payments, settingsHistory, startingBalance, profile }}
              onRestore={restore}
            />
          </>
        )}
      </main>
    </div>
  )
}
