# NailPay

A personal pay tracker for a nail technician paid on commission.

## Rules

- Each service: date, price (USD, excluding tip), service name (optional), tip (optional), note (optional)
- Daily entry: pick a date, type each price one after another; show the daily total
- Services are grouped by day, each day with its own subtotal
- Commission rate: 60% of total service price (setting, default 60)
- Monthly rent: $500 subtracted after commission (setting, default 500)
- Tips are NOT part of commission; shown separately
- Owed from last month = last month's unpaid balance (carries automatically)
- Amount due = services × rate − rent + owed from last month
- Balance carried forward = amount due − payments received this month
- Store all money as integer cents to avoid rounding errors

## Tech

React + Vite + TypeScript, Tailwind CSS, localStorage, Vitest.

Keep calculation logic in `src/lib/pay.ts` as pure functions with tests.

## Test case

Services $6,200, owed last month $150, paid $3,000
→ commission $3,720, net $3,220, due $3,370, carry forward $370
