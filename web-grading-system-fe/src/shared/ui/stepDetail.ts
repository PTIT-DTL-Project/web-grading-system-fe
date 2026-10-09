import type { StepResponse, TestStep } from '../types/assignment'

/**
 * Normalized step model shared by the lecturer and student detail views.
 * Lecturer `TestStep` carries `stepType` + a JSON-string `config`; student
 * `StepResponse` carries `type` + an already-parsed object. Both are reduced
 * here so the renderer never branches on transport shapes.
 */
export interface StepDetailModel {
  order: number
  name: string
  description: string | null
  stepType: string
  weight: number
  timeoutMs: number | null
  required: boolean
  /** Parsed config object, or null when absent/unparseable. */
  config: Record<string, any> | null
}

// Review: 2026-10-09 — mirrors the sensitive-header set in backend
// HttpLogService (authorization, cookie, set-cookie, proxy-authorization,
// x-api-key, x-gateway-secret). The student config keeps headers, so values
// must be masked student-side. Keep the two lists in sync.
const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'proxy-authorization',
  'x-api-key',
  'x-gateway-secret',
])

export function isRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function parseConfig(raw: unknown): Record<string, any> | null {
  if (isRecord(raw)) return raw
  if (typeof raw !== 'string' || !raw.trim()) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return isRecord(parsed) ? parsed : null
  } catch {
    // Unparseable configs render as name-only rows downstream.
    return null
  }
}

export function normalizeLecturerStep(step: TestStep): StepDetailModel {
  return {
    order: step.stepOrder,
    name: step.name,
    description: step.description,
    stepType: step.stepType,
    weight: step.weight,
    timeoutMs: step.timeoutMs,
    required: step.required,
    config: parseConfig(step.config),
  }
}

export function normalizeStudentStep(step: StepResponse): StepDetailModel {
  return {
    order: step.stepOrder,
    name: step.name,
    description: step.description,
    stepType: step.type,
    weight: step.weight,
    timeoutMs: step.timeoutMs,
    required: step.required,
    config: parseConfig(step.config),
  }
}

/** Stringify all values for display tables. */
export function stringPairs(value: unknown): [string, string][] {
  if (!isRecord(value)) return []
  return Object.entries(value).map(([key, entry]) => [
    key,
    typeof entry === 'string' ? entry : JSON.stringify(entry ?? ''),
  ])
}

/** Mask sensitive header values; keys stay visible so the contract reads whole. */
export function maskHeaders(entries: [string, string][]): [string, string][] {
  return entries.map(([key, value]) => [
    key,
    SENSITIVE_HEADERS.has(key.toLowerCase()) ? '***' : value,
  ])
}
