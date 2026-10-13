// Pure logic for the on-screen price keypad.

export const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'] as const
export type KeypadKey = (typeof KEYPAD_KEYS)[number]

const MAX_DOLLAR_DIGITS = 5 // up to $99,999.99 per service

/**
 * The price text after pressing `key`. Only the last price in the text is edited, so a pasted
 * list like "35, 55" still works. Allows one decimal point, two decimals and no leading zeros.
 */
export function pressKey(text: string, key: KeypadKey): string {
  if (key === 'back') return text.slice(0, -1)
  const last = /[^,\s]*$/.exec(text)![0]
  const head = text.slice(0, text.length - last.length)
  const [dollars, decimals] = last.split('.')

  if (key === '.') {
    if (decimals !== undefined) return text
    return head + (last === '' ? '0.' : `${last}.`)
  }
  if (decimals !== undefined) return decimals.length >= 2 ? text : text + key
  if (last === '0') return head + key
  if (dollars.length >= MAX_DOLLAR_DIGITS) return text
  return text + key
}
