import { describe, expect, it } from 'vitest'
import { pressKey, type KeypadKey } from './keypad'

const press = (keys: KeypadKey[], start = '') => keys.reduce(pressKey, start)

describe('pressKey', () => {
  it('types digits and a decimal point', () => {
    expect(press(['3', '5'])).toBe('35')
    expect(press(['3', '5', '.', '5', '0'])).toBe('35.50')
  })

  it('allows at most two decimals and one point', () => {
    expect(press(['3', '.', '5', '0', '1'])).toBe('3.50')
    expect(press(['3', '.', '.', '5'])).toBe('3.5')
  })

  it('starts a lone point as "0."', () => {
    expect(press(['.', '5'])).toBe('0.5')
  })

  it('drops a leading zero', () => {
    expect(press(['0', '0', '7'])).toBe('7')
    expect(press(['0', '.', '7'])).toBe('0.7')
  })

  it('caps the dollar digits', () => {
    expect(press(['1', '2', '3', '4', '5', '6'])).toBe('12345')
  })

  it('deletes the last character', () => {
    expect(press(['back'], '35.5')).toBe('35.')
    expect(press(['back'], '')).toBe('')
  })

  it('edits only the last price of a pasted list', () => {
    expect(press(['.', '5'], '35, 55')).toBe('35, 55.5')
    expect(press(['0', '7'], '35, ')).toBe('35, 7')
  })
})
