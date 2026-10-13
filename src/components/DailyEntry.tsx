import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react'
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

export default function DailyEntry({ date, onDateChange, services, onAdd, onUpdate, onRemove }: Props) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  /** Add every price in `raw`. Returns false (and shows an error) if it can't be parsed. */
  function add(raw: string): boolean {
    try {
      const prices = parsePrices(raw)
      if (prices.length > 0) onAdd(prices)
      setText('')
      setError('')
      return true
    } catch (err) {
      setError((err as Error).message)
      return false
    } finally {
      inputRef.current?.focus()
    }
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

  const total = dayTotal(services)
  const count = services.length

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <label className="block text-sm font-medium text-gray-600">
        Date
        <input
          type="date"
          value={date}
          onChange={(e) => e.target.value && onDateChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-base outline-none focus:border-pink-600"
        />
      </label>

      <label htmlFor="price-input" className="mt-3 block text-sm font-medium text-gray-600">
        Price ($)
      </label>
      <div className="mt-1 flex gap-2">
        <input
          id="price-input"
          ref={inputRef}
          type="text"
          inputMode="decimal"
          enterKeyHint="enter"
          autoComplete="off"
          placeholder="e.g. 35 — or paste 35, 55, 70"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            if (error) setError('')
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          aria-invalid={!!error}
          aria-describedby={error ? 'price-error' : undefined}
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-lg outline-none focus:border-pink-600 aria-invalid:border-red-500"
        />
        {/* Phone number keypads have no Enter key, so offer a button. preventDefault keeps the keyboard open. */}
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => add(text)}
          className="rounded-lg bg-pink-600 px-5 font-medium text-white active:bg-pink-700"
        >
          Add
        </button>
      </div>
      {error && (
        <p id="price-error" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-4">
        <ServiceChips services={services} onUpdate={onUpdate} onRemove={onRemove} />
      </div>

      <p className="mt-4 border-t border-gray-100 pt-3 font-semibold">
        Day total: {formatMoney(total)}{' '}
        <span className="font-normal text-gray-500">
          ({count} service{count === 1 ? '' : 's'})
        </span>
      </p>
    </section>
  )
}
