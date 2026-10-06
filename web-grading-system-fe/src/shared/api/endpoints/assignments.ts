import { getData, sendData, http } from '../http'
import type { AssignmentResponse, CreateAssignmentRequest, UpdateAssignmentRequest, TestPlan, TestStep, StepType, StepResponseDto, StepCreateBody, StepUpdateBody, StudentResultResponse, SubmissionResponse, DockerImageResponse } from '../../types/assignment'
import type { Page } from '../../types/pagination'

export function listAssignments(
  classId: string,
  page: number,
  size: number,
  search?: string,
  published?: boolean,
  options?: { signal?: AbortSignal },
): Promise<Page<AssignmentResponse>> {
  return getData<Page<AssignmentResponse>>('/api/v1/assignments', {
    classId,
    page,
    size,
    ...(search ? { search } : {}),
    ...(published !== undefined ? { published } : {}),
  }, { signal: options?.signal })
}

export function getAssignment(id: string): Promise<AssignmentResponse> {
  return getData<AssignmentResponse>(`/api/v1/assignments/${id}`)
}

export function createAssignment(body: CreateAssignmentRequest): Promise<AssignmentResponse> {
  return sendData<AssignmentResponse, CreateAssignmentRequest>('/api/v1/assignments', 'post', body)
}

export function updateAssignment(id: string, body: UpdateAssignmentRequest): Promise<AssignmentResponse> {
  return sendData<AssignmentResponse, UpdateAssignmentRequest>(`/api/v1/assignments/${id}`, 'put', body)
}

export function deleteAssignment(id: string): Promise<void> {
  return http.delete(`/api/v1/assignments/${id}`).then((response) => response.data)
}

export function publishAssignment(id: string): Promise<AssignmentResponse> {
  return sendData<AssignmentResponse, undefined>(`/api/v1/assignments/${id}/publish`, 'post')
}

export function assignDockerImages(id: string, imageIds: string[]): Promise<void> {
  return sendData<void, string[]>(`/api/v1/assignments/${id}/docker-images`, 'put', imageIds)
}

/* ---------------------------------------------------------------- test plans */

export function listPlans(assignmentId: string): Promise<TestPlan[]> {
  return getData<TestPlan[]>(`/api/v1/assignments/${assignmentId}/plans`)
}

export function createPlan(assignmentId: string, body: { name: string; description?: string; sequenceOrder: number; weight?: number }): Promise<TestPlan> {
  return sendData<TestPlan, typeof body>(`/api/v1/assignments/${assignmentId}/plans`, 'post', body)
}

export function updatePlan(assignmentId: string, planId: string, body: { name?: string; description?: string; sequenceOrder?: number; weight?: number }): Promise<TestPlan> {
  return sendData<TestPlan, typeof body>(`/api/v1/assignments/${assignmentId}/plans/${planId}`, 'put', body)
}

export function deletePlan(assignmentId: string, planId: string): Promise<void> {
  return http.delete(`/api/v1/assignments/${assignmentId}/plans/${planId}`).then((response) => response.data)
}

function toJsonText(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return null
  }
}

// Review: 2026-10-05 — backend StepResponse uses `type` and JSON values; normalize once at the API boundary.
function toTestStep(dto: StepResponseDto, planId: string): TestStep {
  return {
    id: dto.id,
    planId,
    stepOrder: dto.stepOrder,
    name: dto.name,
    description: dto.description,
    stepType: dto.type as StepType,
    config: toJsonText(dto.config) ?? '{}',
    expectedResult: toJsonText(dto.expectedResult),
    weight: dto.weight,
    timeoutMs: dto.timeoutMs,
    required: dto.required,
  }
}

export function listSteps(assignmentId: string, planId: string): Promise<TestStep[]> {
  return getData<StepResponseDto[]>(`/api/v1/assignments/${assignmentId}/plans/${planId}/steps`)
    .then((dtos) => dtos.map((dto) => toTestStep(dto, planId)))
}

export function createStep(assignmentId: string, planId: string, body: StepCreateBody): Promise<TestStep> {
  return sendData<StepResponseDto, StepCreateBody>(`/api/v1/assignments/${assignmentId}/plans/${planId}/steps`, 'post', body)
    .then((dto) => toTestStep(dto, planId))
}

export function updateStep(assignmentId: string, planId: string, stepId: string, body: StepUpdateBody): Promise<TestStep> {
  return sendData<StepResponseDto, StepUpdateBody>(`/api/v1/assignments/${assignmentId}/plans/${planId}/steps/${stepId}`, 'put', body)
    .then((dto) => toTestStep(dto, planId))
}

export function deleteStep(assignmentId: string, planId: string, stepId: string): Promise<void> {
  return http.delete(`/api/v1/assignments/${assignmentId}/plans/${planId}/steps/${stepId}`).then((response) => response.data)
}

/* --------------------------------------------------------------- results */

export function listResults(assignmentId: string, includeSteps?: boolean): Promise<StudentResultResponse[]> {
  return getData<StudentResultResponse[]>(`/api/v1/assignments/${assignmentId}/results`, {
    ...(includeSteps !== undefined ? { includeSteps } : {}),
  })
}

/* ------------------------------------------------------------- submissions */

export function listSubmissions(assignmentId: string): Promise<SubmissionResponse[]> {
  return getData<SubmissionResponse[]>(`/api/v1/assignments/${assignmentId}/submissions`)
}

/* ---------------------------------------------------------------- docker */

export function listDockerImages(name?: string, page?: number, size?: number, options?: { signal?: AbortSignal }): Promise<Page<DockerImageResponse>> {
  return getData<Page<DockerImageResponse>>('/api/v1/docker-images', {
    ...(name ? { name } : {}),
    ...(page !== undefined ? { page } : {}),
    ...(size !== undefined ? { size } : {}),
  }, { signal: options?.signal })
}

export function createDockerImage(body: { name: string; imageUrl: string; description?: string }): Promise<DockerImageResponse> {
  return sendData<DockerImageResponse, typeof body>('/api/v1/docker-images', 'post', body)
}

export function updateDockerImage(id: string, body: { name?: string; imageUrl?: string; description?: string }): Promise<DockerImageResponse> {
  return sendData<DockerImageResponse, typeof body>(`/api/v1/docker-images/${id}`, 'put', body)
}

export function deleteDockerImage(id: string): Promise<void> {
  return http.delete(`/api/v1/docker-images/${id}`).then((response) => response.data)
}
