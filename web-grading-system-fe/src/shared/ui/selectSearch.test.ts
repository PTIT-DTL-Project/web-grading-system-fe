import { describe, expect, it } from 'vitest'
import { filterOptionByLabel } from './selectSearch'

/** Roster labels are "B22DCKH024 — Vũ Công Tuấn Dương"; searching must work either way. */
const option = { label: 'B22DCKH024 — Vũ Công Tuấn Dương', value: 'B22DCKH024' }

describe('filterOptionByLabel', () => {
  it('matches the student code, case-insensitively', () => {
    expect(filterOptionByLabel('b22dckh024', option)).toBe(true)
    expect(filterOptionByLabel('DCKH', option)).toBe(true)
  })

  it('matches the name with or without Vietnamese diacritics', () => {
    expect(filterOptionByLabel('Vũ Công', option)).toBe(true)
    expect(filterOptionByLabel('vu cong tuan duong', option)).toBe(true)
    expect(filterOptionByLabel('DUONG', option)).toBe(true)
  })

  it('matches the submitted value even when the label is missing', () => {
    expect(filterOptionByLabel('B22DCKH024', { value: 'B22DCKH024' })).toBe(true)
    expect(filterOptionByLabel('B22DCKH024', { label: undefined, value: 'B22DCKH024' })).toBe(true)
  })

  it('rejects a non-matching query and treats blank input as "show all"', () => {
    expect(filterOptionByLabel('B22DCKH099', option)).toBe(false)
    expect(filterOptionByLabel('', option)).toBe(true)
    expect(filterOptionByLabel('   ', option)).toBe(true)
  })
})
