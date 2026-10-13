import { useState, type FormEvent } from 'react'
import { formatMoney, parsePrices, type Service } from '../lib/pay'

interface Props {
  services: Service[]
  onUpdate: (service: Service) => void
  onRemove: (id: string) => void
}

/** A day's services as removable chips; tapping a chip opens an editor below the list. */
export default function ServiceChips({ services, onUpdate, onRemove }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const editing = services.find((s) => s.id === editingId)

  if (services.length === 0) {
    return <p className="text-sm text-gray-400">No services yet.</p>
  }

  return (
    <div>
      <ul className="flex flex-wrap gap-2">
        {services.map((s) => (
          <li
            key={s.id}
            className={`flex items-center rounded-full border text-sm ${
              s.id === editingId
                ? 'border-pink-600 bg-pink-50'
                : 'border-gray-300 bg-white'
            }`}
          >
            <button
              type="button"
              onClick={() => setEditingId(s.id === editingId ? null : s.id)}
              className="flex items-baseline gap-1.5 py-1.5 pr-1 pl-3"
            >
              <span className="font-semibold">{formatMoney(s.priceCents)}</span>
              {s.name && <span className="max-w-24 truncate text-gray-600">{s.name}</span>}
              {s.tipCents ? (
                <span className="text-xs text-green-700">+{formatMoney(s.tipCents)}</span>
              ) : null}
              {s.note && <span className="text-xs text-gray-400" aria-label="has note">✎</span>}
            </button>
            <button
              type="button"
              onClick={() => {
                if (s.id === editingId) setEditingId(null)
                onRemove(s.id)
              }}
              aria-label={`Remove ${formatMoney(s.priceCents)}`}
              className="px-2.5 py-1.5 text-gray-400 hover:text-red-600"
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      {editing && (
        <ServiceEditor
          key={editing.id}
          service={editing}
          onSave={(updated) => {
            onUpdate(updated)
            setEditingId(null)
          }}
          onCancel={() => setEditingId(null)}
        />
      )}
    </div>
  )
}

function centsToInput(cents: number | undefined): string {
  if (cents === undefined) return ''
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2)
}

/** Parse a single money input; empty -> undefined. Throws on invalid input. */
function parseOne(text: string, label: string): number | undefined {
  const prices = parsePrices(text)
  if (prices.length > 1) throw new Error(`${label}: enter one amount`)
  return prices[0]
}

function ServiceEditor({
  service,
  onSave,
  onCancel,
}: {
  service: Service
  onSave: (service: Service) => void
  onCancel: () => void
}) {
  const [price, setPrice] = useState(centsToInput(service.priceCents))
  const [name, setName] = useState(service.name ?? '')
  const [tip, setTip] = useState(centsToInput(service.tipCents))
  const [note, setNote] = useState(service.note ?? '')
  const [error, setError] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    try {
      const priceCents = parseOne(price, 'Price')
      if (priceCents === undefined) throw new Error('Price is required')
      const tipCents = parseOne(tip, 'Tip')
      onSave({
        id: service.id,
        date: service.date,
        priceCents,
        name: name.trim() || undefined,
        tipCents: tipCents || undefined,
        note: note.trim() || undefined,
      })
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const field = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base outline-none focus:border-pink-600'

  return (
    <form onSubmit={submit} className="mt-3 space-y-2 rounded-xl border border-pink-200 bg-pink-50/50 p-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-gray-600">
          Price ($)
          <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className={field} />
        </label>
        <label className="text-xs text-gray-600">
          Tip ($)
          <input
            inputMode="decimal"
            value={tip}
            onChange={(e) => setTip(e.target.value)}
            placeholder="0"
            className={field}
          />
        </label>
      </div>
      <label className="block text-xs text-gray-600">
        Service name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Gel manicure"
          className={field}
        />
      </label>
      <label className="block text-xs text-gray-600">
        Note
        <input value={note} onChange={(e) => setNote(e.target.value)} className={field} />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-gray-600">
          Cancel
        </button>
        <button type="submit" className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white">
          Save
        </button>
      </div>
    </form>
  )
}
