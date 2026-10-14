# NailPay

NailPay is a pay tracker for nail technicians who work on commission. You log each service as you do it, and NailPay works out what the salon owner owes you each month: your commission, minus booth rent, plus anything still unpaid from last month, minus what you've already been paid. Tips are tracked separately. It runs entirely in the browser with no account and no server. Your data stays on your device. It works offline, and you can add it to your phone's home screen like an app. It's available in English and Tiếng Việt.

## Screenshots

<!-- Replace these placeholders with real screenshots, e.g. docs/screenshots/dashboard.png -->

| Dashboard | Services | Monthly Pay | Settings |
| --- | --- | --- | --- |
| _screenshot coming soon_ | _screenshot coming soon_ | _screenshot coming soon_ | _screenshot coming soon_ |

## Features

- **Fast daily entry**: pick a date and type prices one after another on a number keypad. Each service can have an optional name, tip and note.
- **Services grouped by day**, with a subtotal for each day and totals for the month.
- **Monthly pay breakdown**: commission, rent, amount owed from last month, payments received, and the balance carried forward.
- **Automatic carryover**: each month's unpaid balance rolls into the next month. You can set a starting balance and start month.
- **Settings that change over time**: commission rate and rent changes apply from the chosen month onward, and earlier months keep their old rates.
- **Payments log**: record payments from the owner by cash, check or Zelle.
- **Dashboard**: net earned over the last 12 months, top services this month, and a month-by-month history.
- **Printable pay statement** to give the salon owner.
- **Import from Excel (CSV)** with column mapping, and **export each month to CSV**.
- **Backup and restore** of all data as a single JSON file.
- **Bilingual**: English / Tiếng Việt. The language choice is remembered, and the printed statement follows it.
- **Installable PWA** that works offline after the first visit.

## The pay formula

```
Commission       = total service price × commission rate   (default 60%)
Net earned       = commission − monthly rent                (default $500)
Amount due       = net earned + owed from last month
Carried forward  = amount due − payments received this month
```

Tips are never part of the commission. The carried-forward balance becomes next month's "owed from last month".

**Example:** services $6,200, owed from last month $150, paid $3,000

| | |
| --- | ---: |
| Commission (60% × $6,200) | $3,720 |
| Net earned ($3,720 − $500 rent) | $3,220 |
| Amount due ($3,220 + $150) | $3,370 |
| Carried forward ($3,370 − $3,000) | **$370** |

All money is stored as integer cents to avoid floating-point rounding errors. The calculation logic lives in [`src/lib/pay.ts`](src/lib/pay.ts) as pure functions with unit tests.

## Tech stack

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/), built with [Vite](https://vite.dev/)
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Recharts](https://recharts.org/) for the dashboard chart
- [react-i18next](https://react.i18next.com/) for English / Vietnamese
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) for offline support and installing to the home screen
- `localStorage` for data (no backend)
- [Vitest](https://vitest.dev/) for tests
- Deployed on [Vercel](https://vercel.com/)

## Run locally

You need [Node.js](https://nodejs.org/) 22 or newer.

```bash
git clone <this-repo-url>
cd nailpay
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

To build and preview the production version:

```bash
npm run build
npm run preview
```

To try the CSV import, use [`test-import.csv`](test-import.csv). It's fake data and includes a few bad rows on purpose.

## Run tests

```bash
npm test
```

The tests cover the pay calculations, carryover, CSV import and export, backup and restore, date handling, storage, and a check that `en.json` and `vi.json` have the same keys.

## What I learned

- _TODO_
- _TODO_
- _TODO_
