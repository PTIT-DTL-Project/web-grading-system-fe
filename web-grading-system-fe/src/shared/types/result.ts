/** result-service StepResultResponse — nested in ResultResponse */
export interface StepResultResponse {
  id: string
  planId: string
  stepId: string
  stepOrder: number
  stepName: string
  stepType: string
  passed: boolean
  weight: number
  score: number
  actualValue: string | null
  expectedValue: string | null
  errorMessage: string | null
  durationMs: number | null
}

/** result-service ResultResponse — GET /api/v1/results/{submissionId} */
export interface ResultResponse {
  id: string
  submissionId: string
  assignmentId: string
  studentId: string
  planId: string
  planWeight: number
  score: number
  maxScore: number
  status: string
  summaryLog: string | null
  latest: boolean
  startedAt: string | null
  completedAt: string | null
  steps: StepResultResponse[]
}
