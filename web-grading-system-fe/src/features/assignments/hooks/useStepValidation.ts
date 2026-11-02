import { useEffect, useState } from 'react'
import { validateStepConfig } from '../../../shared/api/endpoints/testPlans'

export interface StepValidationError {
  path: string
  message: string
}

export interface StepValidationResult {
  valid: boolean
  errors: StepValidationError[]
  loading: boolean
}

export function useStepValidation(stepType?: string, config?: unknown, delay = 500): StepValidationResult {
  const [result, setResult] = useState<StepValidationResult>({ valid: true, errors: [], loading: false })

  useEffect(() => {
    if (!stepType || !config) {
      setResult({ valid: true, errors: [], loading: false })
      return
    }
    setResult((r) => ({ ...r, loading: true }))
    const timer = setTimeout(async () => {
      try {
        const res = await validateStepConfig(stepType, config)
        setResult({ valid: res.valid, errors: res.errors || [], loading: false })
      } catch (e) {
        setResult({ valid: true, errors: [], loading: false })
      }
    }, delay)
    return () => clearTimeout(timer)
  }, [stepType, JSON.stringify(config), delay])

  return result
}
