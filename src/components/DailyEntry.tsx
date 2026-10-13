import { useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { errorText } from '../i18n'
import { KEYPAD_KEYS, pressKey, type KeypadKey } from '../lib/keypad'
import { dayTotal, formatMoney, parsePrices, type Service } from '../lib/pay'
import ServiceChips from './ServiceChips'

interface Props {
  date: string
  onDateChange: (date: string) => void
  services: Service[] // that day's services
  onAdd: (prices: number[]) => void
  onUpdate: (service: Service) => void
  onRemove: (id: string) => void
}

/** Quick add, built for one thumb: an on-screen keypad and a big Add button instead of the phone keyboard. */
export default function DailyEntry({ date, onDateChange, services, onAdd, onUpdate, onRemove }: Props) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  /** Add every price in `raw`. Returns false (and shows an error) if it can't be parsed. */
  function add(raw: string): boolean {
    try {
      const prices = parsePrices(raw)
      if (prices.length > 0) onAdd(prices)
      setText('')
      setError('')
      return true
    } catch (err) {
      setError(errorText(err, t))
      return false
    }
  }

  function press(key: KeypadKey) {
    setText((prev) => pressKey(prev, key))
    if (error) setError('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      add(text)
    }
  }

  // Pasting a list like "35, 55, 70" adds all of them at once.
  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const input = e.currentTarget
    const pasted = e.clipboardData.getData('text')
    const combined =
      input.value.slice(0, input.selectionStart ?? input.value.length) +
      pasted +
      input.value.slice(input.selectionEnd ?? input.value.length)
    if (!/[,\s]/.test(combined.trim())) return // single value: paste normally
    e.preventDefault()
    if (!add(combined)) setText(combined)
  }

  // "Add $35.50" confirms what will be saved; falls back to "Add" while the text isn't one valid price.
  let pending: number | undefined
  try {
    const prices = parsePrices(text)
    if (prices.length === 1) pending = prices[0]
  } catch {
    // shown as an error on Add
  }

  const total = dayTotal(services)

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <label className="block text-sm font-medium text-gray-600">
        {t('common.date')}
        <input
          type="date"
          value={date}
          onChange={(e) => e.target.value && onDateChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-3 text-base outline-none focus:border-pink-600"
        />
      </label>

      <label htmlFor="price-input" className="mt-3 block text-sm font-medium text-gray-600">
        {t('entry.price')}
      </label>
      {/* inputMode="none": the keypad below replaces the phone keyboard; typing and pasting still work. */}
      <input
        id="price-input"
        type="text"
        inputMode="none"
        autoComplete="off"
        placeholder="0"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          if (error) setError('')
        }}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        aria-invalid={!!error}
        aria-describedby={error ? 'price-error' : undefined}
        className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-right text-3xl font-semibold tabular-nums outline-none focus:border-pink-600 aria-invalid:border-red-500"
      />
      {error && (
        <p id="price-error" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}

      <div role="group" aria-label={t('entry.keypad')} className="mt-3 grid grid-cols-3 gap-2">
        {KEYPAD_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => press(key)}
            aria-label={key === 'back' ? t('entry.backspace') : undefined}
            className="h-14 touch-manipulation rounded-xl bg-gray-100 text-2xl font-semibold text-gray-800 select-none active:bg-gray-300"
          >
            {key === 'back' ? '⌫' : key}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => add(text)}
        disabled={text.trim() === ''}
        className="mt-2 h-16 w-full touch-manipulation rounded-xl bg-pink-600 text-xl font-semibold text-white select-none active:bg-pink-700 disabled:opacity-40"
      >
        {pending === undefined ? t('common.add') : t('entry.addAmount', { amount: formatMoney(pending) })}
      </button>

      <div className="mt-4">
        <ServiceChips services={services} onUpdate={onUpdate} onRemove={onRemove} />
      </div>

      <p className="mt-4 border-t border-gray-100 pt-3 font-semibold">
        {t('entry.dayTotal', { amount: formatMoney(total) })}{' '}
        <span className="font-normal text-gray-500">({t('count.service', { count: services.length })})</span>
      </p>
    </section>
  )
}
