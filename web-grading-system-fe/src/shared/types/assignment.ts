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
