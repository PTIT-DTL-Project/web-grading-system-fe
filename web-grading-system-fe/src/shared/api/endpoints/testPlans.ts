import { http } from '../http'

export interface StepValidationError {
  path: string
  message: string
}

export interface StepValidationResponse {
  valid: boolean
  errors?: StepValidationError[]
}

export async function validateStepConfig(stepType: string, config: unknown): Promise<StepValidationResponse> {
  const res = await http.post<StepValidationResponse>('/api/v1/internal/test-plans/validate-step', {
    stepType,
    config,
  })
  return res.data
}
