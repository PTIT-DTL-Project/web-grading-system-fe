/**
 * ai-assistant-service DTOs — raw (this service does not wrap responses in an
 * ApiResponse envelope, unlike the other services).
 * Mirror: AiExplanationResponse / StepAnalysis / TelemetryAudit.
 */

/** Inert placeholder telemetry today; rendered nowhere in v1 (tracked separately). */
export interface TelemetryAudit {
  durationMs: number | null
  expectedThresholdMs: number | null
  nPlusOneDetected: boolean | null
  queryCount: number | null
  sensitiveFieldsExposed: string[] | null
  peakMemoryMb: number | null
}

export interface StepAnalysis {
  stepId: string | null
  stepName: string | null
  stepType: string | null
  passed: boolean | null
  category: 'DEBUG_FAIL' | 'OPTIMIZE_PASS' | null
  diagnosis: string | null
  suspectedLocation: string | null
  actionableHints: string[] | null
  learningKeywords: string[] | null
  telemetryAudit: TelemetryAudit | null
}

/** GET/POST /api/v1/ai/submissions/{submissionId}/explain */
export interface AiExplanationResponse {
  id: string
  submissionId: string
  category: string
  fromCache: boolean
  overallSummary: string | null
  stepAnalyses: StepAnalysis[]
  createdAt: string
}
