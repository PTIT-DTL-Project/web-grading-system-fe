/**
 * Accent- and case-insensitive option search shared by the `FilterBar` selects.
 *
 * Roster labels read "B22DCKH024 — Vũ Công Tuấn Dương", and a lecturer types either
 * the code or a plain-ASCII name ("vu cong tuan duong"). Strips combining marks and
 * folds đ/Đ to d so both spellings match.
 */

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

/** Matches on both the visible label and the submitted value (e.g. studentCode). */
export function filterOptionByLabel(
  input: string,
  option?: { label?: unknown; value?: unknown },
): boolean {
  const needle = fold(input.trim())
  if (!needle) return true
  const label = typeof option?.label === 'string' ? option.label : String(option?.label ?? '')
  const value = typeof option?.value === 'string' ? option.value : String(option?.value ?? '')
  return fold(label).includes(needle) || fold(value).includes(needle)
}
