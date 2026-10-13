import { createInstance } from 'i18next'
import { describe, expect, it } from 'vitest'
import en from './en.json'
import vi from './vi.json'

type Tree = { [key: string]: string | Tree }

/** Every key path in a translation file, e.g. "count.service_one". */
function keys(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([k, v]) => (typeof v === 'string' ? [prefix + k] : keys(v, `${prefix}${k}.`)))
}

// English has "_one" and "_other" plural forms; Vietnamese only "_other".
const base = (key: string) => key.replace(/_(one|other)$/, '')
const enKeys = new Set(keys(en).map(base))
const viKeys = new Set(keys(vi).map(base))

// the app's source as text, to find the keys it uses
const sources = import.meta.glob<string>(['../**/*.{ts,tsx}', '!../**/*.test.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
})

describe('translations', () => {
  it('Vietnamese has exactly the English keys', () => {
    expect([...viKeys].sort()).toEqual([...enKeys].sort())
  })

  it('every literal key used in the code exists', () => {
    const used = Object.values(sources).flatMap((text) =>
      [...text.matchAll(/\bt\('([a-zA-Z.]+)'|i18nKey="([a-zA-Z.]+)"/g)].map((m) => m[1] ?? m[2]),
    )
    expect(used.length).toBeGreaterThan(50)
    expect(used.filter((k) => !enKeys.has(k))).toEqual([])
  })

  it('nests plural counts in backup errors', async () => {
    const i18n = createInstance()
    await i18n.init({ resources: { en: { translation: en }, vi: { translation: vi } }, lng: 'en' })
    expect(i18n.t('errors.damaged.both', { services: 1, payments: 2 })).toBe(
      "This backup is damaged: 1 service and 2 payments can't be read.",
    )
    expect(i18n.t('errors.damaged.services', { lng: 'vi', services: 3 })).toBe(
      'Bản sao lưu bị hỏng: không đọc được 3 dịch vụ.',
    )
  })
})
