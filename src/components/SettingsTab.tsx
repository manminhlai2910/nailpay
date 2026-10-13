import { useState } from 'react'
import { formatMonth } from '../lib/dates'
import { DEFAULT_SETTINGS, parsePrices, parseSignedAmount, type Settings, type StartingBalance } from '../lib/pay'
import type { Profile } from '../lib/storage'

interface Props {
  month: string // YYYY-MM; rate and rent changes apply from this month onward
  settings: Settings // in effect for `month`
  onChange: (settings: Settings) => void
  startingBalance: StartingBalance
  onStartingBalanceChange: (balance: StartingBalance) => void
  profile: Profile
  onProfileChange: (profile: Profile) => void
}

function centsToInput(cents: number): string {
  const abs = Math.abs(cents)
  const text = abs % 100 === 0 ? String(abs / 100) : (abs / 100).toFixed(2)
  return cents < 0 ? `-${text}` : text
}

/** Each field saves as soon as it holds a valid value; invalid text shows an error and isn't saved. */
export default function SettingsTab({
  month,
  settings,
  onChange,
  startingBalance,
  onStartingBalanceChange,
  profile,
  onProfileChange,
}: Props) {
  const [rate, setRate] = useState(String(settings.commissionRate))
  const [rent, setRent] = useState(centsToInput(settings.rentCents))
  const [rateError, setRateError] = useState('')
  const [rentError, setRentError] = useState('')

  function changeRate(text: string) {
    setRate(text)
    const value = Number(text)
    if (!/^\d+$/.test(text.trim()) || value > 100) {
      setRateError('Enter a whole number from 0 to 100')
      return
    }
    setRateError('')
    onChange({ ...settings, commissionRate: value })
  }

  function changeRent(text: string) {
    setRent(text)
    try {
      const prices = parsePrices(text)
      if (prices.length !== 1) throw new Error('Enter one amount')
      setRentError('')
      onChange({ ...settings, rentCents: prices[0] })
    } catch (err) {
      setRentError((err as Error).message)
    }
  }

  function reset() {
    setRate(String(DEFAULT_SETTINGS.commissionRate))
    setRent(centsToInput(DEFAULT_SETTINGS.rentCents))
    setRateError('')
    setRentError('')
    onChange(DEFAULT_SETTINGS)
  }

  const field =
    'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-base outline-none focus:border-pink-600 aria-invalid:border-red-500'

  return (
    <>
      <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-sm text-gray-500">
          Changes apply from <span className="font-medium text-gray-700">{formatMonth(month)}</span> onward. Earlier
          months keep their own rates. Pick a month at the top to change it.
        </p>

        <label className="block text-sm font-medium text-gray-600">
          Commission (%)
          <input
            inputMode="numeric"
            value={rate}
            onChange={(e) => changeRate(e.target.value)}
            aria-invalid={!!rateError}
            className={field}
          />
          {rateError && <span className="mt-1 block text-sm font-normal text-red-600">{rateError}</span>}
        </label>

        <label className="block text-sm font-medium text-gray-600">
          Monthly rent ($)
          <input
            inputMode="decimal"
            value={rent}
            onChange={(e) => changeRent(e.target.value)}
            aria-invalid={!!rentError}
            className={field}
          />
          {rentError && <span className="mt-1 block text-sm font-normal text-red-600">{rentError}</span>}
        </label>

        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-400">Changes save automatically.</p>
          <button type="button" onClick={reset} className="text-sm text-pink-600">
            Reset to defaults
          </button>
        </div>
      </section>

      <StartingBalanceSettings balance={startingBalance} onChange={onStartingBalanceChange} />
      <ProfileSettings profile={profile} onChange={onProfileChange} />
    </>
  )
}

function StartingBalanceSettings({
  balance,
  onChange,
}: {
  balance: StartingBalance
  onChange: (balance: StartingBalance) => void
}) {
  const [amount, setAmount] = useState(balance.amountCents === 0 ? '' : centsToInput(balance.amountCents))
  const [error, setError] = useState('')

  function changeAmount(text: string) {
    setAmount(text)
    try {
      const amountCents = parseSignedAmount(text)
      setError('')
      onChange({ ...balance, amountCents })
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const field =
    'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-base outline-none focus:border-pink-600 aria-invalid:border-red-500'

  return (
    <section className="mt-4 space-y-4 rounded-2xl bg-white p-4 shadow-sm">
      <div>
        <h2 className="font-semibold">Starting balance</h2>
        <p className="mt-1 text-sm text-gray-500">
          What the owner owed you before you started using NailPay. Use a minus sign if you owed the owner.
        </p>
      </div>

      <label className="block text-sm font-medium text-gray-600">
        Amount ($)
        <input
          inputMode="decimal"
          placeholder="0"
          value={amount}
          onChange={(e) => changeAmount(e.target.value)}
          aria-invalid={!!error}
          className={field}
        />
        {error && <span className="mt-1 block text-sm font-normal text-red-600">{error}</span>}
      </label>

      <label className="block text-sm font-medium text-gray-600">
        Start month
        <input
          type="month"
          value={balance.month ?? ''}
          onChange={(e) => onChange({ ...balance, month: e.target.value || undefined })}
          className={field}
        />
        <span className="mt-1 block text-xs font-normal text-gray-400">
          Leave blank to start from your first month with services or payments.
        </span>
      </label>
    </section>
  )
}

function ProfileSettings({ profile, onChange }: { profile: Profile; onChange: (profile: Profile) => void }) {
  const field = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-base outline-none focus:border-pink-600'

  return (
    <section className="mt-4 space-y-4 rounded-2xl bg-white p-4 shadow-sm">
      <div>
        <h2 className="font-semibold">Your details</h2>
        <p className="mt-1 text-sm text-gray-500">Shown on the printed pay statement.</p>
      </div>

      <label className="block text-sm font-medium text-gray-600">
        Your name
        <input
          autoComplete="name"
          value={profile.name}
          onChange={(e) => onChange({ ...profile, name: e.target.value })}
          className={field}
        />
      </label>

      <label className="block text-sm font-medium text-gray-600">
        Salon name
        <input
          autoComplete="organization"
          value={profile.salonName}
          onChange={(e) => onChange({ ...profile, salonName: e.target.value })}
          className={field}
        />
      </label>
    </section>
  )
}
