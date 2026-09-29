/**
 * Wire envelope produced by every client-facing backend endpoint
 * (FormatRestResponse in each service): { status, message, data, error }.
 * `data` is omitted when null, `error` is omitted on success — hence optional.
 */
export interface ApiEnvelope<T> {
  status: number
  message: string
  data?: T
  error?: string
}
