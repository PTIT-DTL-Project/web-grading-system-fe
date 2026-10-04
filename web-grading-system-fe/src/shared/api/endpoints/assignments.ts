import { getData, sendData, http } from '../http'
import type { AssignmentResponse, CreateAssignmentRequest, UpdateAssignmentRequest, TestPlan, TestStep, StepType } from '../../types/assignment'
import type { Page } from '../../types/pagination'

export function listAssignments(
  classId: string,
  page: number,
  size: number,
  search?: string,
  published?: boolean,
): Promise<Page<AssignmentResponse>> {
  return getData<Page<AssignmentResponse>>('/api/v1/assignments', {
    classId,
    page,
    size,
    ...(search ? { search } : {}),
    ...(published !== undefined ? { published } : {}),
  })
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

export function createPlan(assignmentId: string, body: { name: string; description?: string; sequenceOrder?: number; weight?: number }): Promise<TestPlan> {
  return sendData<TestPlan, typeof body>(`/api/v1/assignments/${assignmentId}/plans`, 'post', body)
}

export function updatePlan(assignmentId: string, planId: string, body: { name?: string; description?: string; sequenceOrder?: number; weight?: number }): Promise<TestPlan> {
  return sendData<TestPlan, typeof body>(`/api/v1/assignments/${assignmentId}/plans/${planId}`, 'put', body)
}

export function deletePlan(assignmentId: string, planId: string): Promise<void> {
  return http.delete(`/api/v1/assignments/${assignmentId}/plans/${planId}`).then((response) => response.data)
}

export function listSteps(assignmentId: string, planId: string): Promise<TestStep[]> {
  return getData<TestStep[]>(`/api/v1/assignments/${assignmentId}/plans/${planId}/steps`)
}

export function createStep(assignmentId: string, planId: string, body: { name: string; stepType: StepType; config?: string; expectedResult?: string; weight?: number; timeoutMs?: number; required?: boolean }): Promise<TestStep> {
  return sendData<TestStep, typeof body>(`/api/v1/assignments/${assignmentId}/plans/${planId}/steps`, 'post', body)
}

export function updateStep(assignmentId: string, planId: string, stepId: string, body: { name?: string; stepType?: StepType; config?: string; expectedResult?: string; weight?: number; timeoutMs?: number; required?: boolean }): Promise<TestStep> {
  return sendData<TestStep, typeof body>(`/api/v1/assignments/${assignmentId}/plans/${planId}/steps/${stepId}`, 'put', body)
}

export function deleteStep(assignmentId: string, planId: string, stepId: string): Promise<void> {
  return http.delete(`/api/v1/assignments/${assignmentId}/plans/${planId}/steps/${stepId}`).then((response) => response.data)
}
