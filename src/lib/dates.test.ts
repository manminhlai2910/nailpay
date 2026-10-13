import { describe, expect, it } from 'vitest'
import { addMonths, formatDay, formatMonth, formatMonthShort, formatMonthYearShort } from './dates'

describe('date formatting', () => {
  it('formats in English', () => {
    expect(formatMonth('2026-10', 'en')).toBe('October 2026')
    expect(formatMonthShort('2026-10', 'en')).toBe('Oct')
    expect(formatMonthYearShort('2026-10', 'en')).toBe('Oct 2026')
    expect(formatDay('2026-10-01', 'en')).toBe('Thu, Oct 1')
  })

  it('formats in Vietnamese', () => {
    expect(formatMonth('2026-10', 'vi')).toBe('Tháng 10 năm 2026')
    expect(formatMonthShort('2026-10', 'vi')).toBe('T10')
    expect(formatMonthYearShort('2026-10', 'vi')).toBe('10/2026')
    expect(formatDay('2026-10-01', 'vi')).toBe('Thứ 5, 1 thg 10')
  })
})

describe('addMonths', () => {
  it('rolls over the year', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
  })
})
