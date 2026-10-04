export type GradingStrategy = 'STUDENT_DOCKER_COMPOSE' | 'LECTURER_DOCKER_COMPOSE'
export type StepType = 'HTTP_REQUEST' | 'DB_QUERY' | 'DB_SCHEMA_CHECK' | 'DB_MIGRATION' | 'EXTRACT' | 'DELAY'

export interface TestPlan {
  id: string
  assignmentId: string
  name: string
  description: string | null
  sequenceOrder: number
  weight: number
}

export interface TestStep {
  id: string
  planId: string
  stepOrder: number
  name: string
  description: string | null
  stepType: StepType
  config: string
  expectedResult: string | null
  weight: number
  timeoutMs: number | null
  required: boolean
}

export interface AssignmentResponse {
  id: string
  classId: string
  ownerId: string
  title: string
  description: string | null
  gradingStrategy: GradingStrategy
  dockerComposeTemplate: string | null
  dockerComposePort: number
  startupTimeoutMs: number
  executionTimeoutMs: number
  maxMemoryMb: number
  maxCpu: number
  published: boolean
  createdAt: string | null
}

export interface AssignmentResultStepResponse {
  id: string
  planId: string
  stepId: string
  stepOrder: number
  stepName: string
  stepType: string
  passed: boolean | null
  weight: number | null
  score: number | null
  actualValue: string | null
  expectedValue: string | null
  errorMessage: string | null
  durationMs: number | null
}

export interface AssignmentResultResponse {
  id: string
  submissionId: string
  assignmentId: string
  studentId: string
  planId: string
  planWeight: number | null
  score: number | null
  maxScore: number | null
  status: string
  summaryLog: string | null
  latest: boolean | null
  startedAt: string | null
  completedAt: string | null
  steps: AssignmentResultStepResponse[]
}

export interface StudentResultResponse {
  studentUserId: string
  studentCode: string
  studentName: string
  exerciseScore: number | null
  results: AssignmentResultResponse[]
}

export interface SubmissionResponse {
  id: string
  assignmentId: string
  studentId: string
  zipFileName: string
  status: string
  latest: boolean | null
  createdAt: string | null
}

export interface DockerImageResponse {
  id: string
  name: string
  imageUrl: string
  description: string | null
}

export interface CreateAssignmentRequest {
  classId: string
  ownerId: string
  title: string
  description?: string
  gradingStrategy: GradingStrategy
  dockerComposeTemplate?: string
  dockerComposePort?: number
  startupTimeoutMs?: number
  executionTimeoutMs?: number
  maxMemoryMb?: number
  maxCpu?: number
}

export interface UpdateAssignmentRequest {
  title?: string
  description?: string
  dockerComposeTemplate?: string
  dockerComposePort?: number
  startupTimeoutMs?: number
  executionTimeoutMs?: number
  maxMemoryMb?: number
  maxCpu?: number
}
