/** Empty string for missing values; raw string when the date cannot be parsed or formatted. */
export function formatDateTime(iso: string | null | undefined, lang: string): string {
  if (iso === null || iso === undefined) return ''
  try {
    return new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(iso),
    )
  } catch {
    // Invalid date (RangeError from format) or a bad `lang` → show the raw value,
    // never blank the cell.
    return iso
  }
}
