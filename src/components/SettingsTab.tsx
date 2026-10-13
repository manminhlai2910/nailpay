import { useState } from 'react'
import { parsePrices } from '../lib/pay'
import { DEFAULT_SETTINGS, type Settings } from '../lib/storage'

interface Props {
  settings: Settings
  onChange: (settings: Settings) => void
}

function centsToInput(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2)
}

/** Each field saves as soon as it holds a valid value; invalid text shows an error and isn't saved. */
export default function SettingsTab({ settings, onChange }: Props) {
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
    <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
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
  )
}
