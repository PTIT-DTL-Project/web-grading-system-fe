/** Empty string for missing values; raw string when the date cannot be parsed or formatted. */
export function formatDateTime(iso: string | null | undefined, lang: string): string {
  if (iso === null || iso === undefined) return ''
  try {
    // Pinned to the system's timezone: the backend stores UTC and browsers
    // render device-local time by default, which shows UTC on UTC devices.
    // Review: 2026-10-10, all FE times must read GMT+7.
    return new Intl.DateTimeFormat(lang, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date(iso))
  } catch {
    // Invalid date (RangeError from format) or a bad `lang` → show the raw value,
    // never blank the cell.
    return iso
  }
}
