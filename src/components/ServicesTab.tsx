import { useState } from 'react'
import { today } from '../lib/dates'
import type { Service } from '../lib/pay'
import DailyEntry from './DailyEntry'
import MonthView from './MonthView'

interface Props {
  services: Service[]
  setServices: (update: (prev: Service[]) => Service[]) => void
  month: string
  setMonth: (month: string) => void
}

// crypto.randomUUID only exists on https/localhost; fall back when opened over plain http on a phone.
function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export default function ServicesTab({ services, setServices, month, setMonth }: Props) {
  const [date, setDate] = useState(today)

  function changeDate(next: string) {
    setDate(next)
    setMonth(next.slice(0, 7)) // keep the month view on the day being entered
  }

  function addPrices(prices: number[]) {
    setServices((prev) => [...prev, ...prices.map((priceCents) => ({ id: newId(), date, priceCents }))])
  }

  function updateService(updated: Service) {
    setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
  }

  function removeService(id: string) {
    setServices((prev) => prev.filter((s) => s.id !== id))
  }

  return (
    <>
      <DailyEntry
        date={date}
        onDateChange={changeDate}
        services={services.filter((s) => s.date === date)}
        onAdd={addPrices}
        onUpdate={updateService}
        onRemove={removeService}
      />
      <MonthView month={month} services={services} onUpdate={updateService} onRemove={removeService} />
    </>
  )
}
