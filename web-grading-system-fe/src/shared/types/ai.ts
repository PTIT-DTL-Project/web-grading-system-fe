export interface TelemetryAudit {
  durationMs?: number
  expectedThresholdMs?: number
  nPlusOneDetected?: boolean
  queryCount?: number
  sensitiveFieldsExposed?: string[]
  peakMemoryMb?: number
}

export interface StepAnalysis {
  stepId: string
  stepName: string
  stepType: string
  passed: boolean
  category: 'DEBUG_FAIL' | 'OPTIMIZE_PASS' | string
  diagnosis: string
  suspectedLocation?: string
  actionableHints: string[]
  learningKeywords?: string[]
  telemetryAudit?: TelemetryAudit
}

export interface AiExplanationResponse {
  id: string
  submissionId: string
  category: string
  fromCache: boolean
  overallSummary: string
  stepAnalyses: StepAnalysis[]
  createdAt: string
}
