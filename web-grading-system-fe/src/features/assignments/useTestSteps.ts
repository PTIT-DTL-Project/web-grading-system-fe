import { useEffect, useState, useCallback } from 'react'
import {
  listSteps,
  createStep,
  updateStep,
  deleteStep,
} from '../../shared/api/endpoints/assignments'
import type { TestStep, StepCreateBody, StepUpdateBody } from '../../shared/types/assignment'

interface UseTestStepsReturn {
  steps: TestStep[]
  loading: boolean
  error: unknown
  refetch: () => void
  create: (body: StepCreateBody) => Promise<TestStep>
  update: (stepId: string, body: StepUpdateBody) => Promise<TestStep>
  remove: (stepId: string) => Promise<void>
}

export function useTestSteps(assignmentId: string, planId: string, enabled = true): UseTestStepsReturn {
  const [steps, setSteps] = useState<TestStep[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [version, setVersion] = useState(0)

  const refetch = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    // Review: 2026-10-05, Pullfrog — only fetch steps after the card is expanded, not for every mounted plan.
    if (!enabled) return
    const controller = new AbortController()
    setLoading(true)
    listSteps(assignmentId, planId)
      .then((data) => {
        if (controller.signal.aborted) return
        setSteps(data)
        setError(null)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setError(err)
      })
      .finally(() => {
        if (controller.signal.aborted) return
        setLoading(false)
      })
    return () => controller.abort()
  }, [assignmentId, planId, enabled, version])

  const create = async (body: StepCreateBody) => {
    const resp = await createStep(assignmentId, planId, body)
    refetch()
    return resp
  }

  const update = async (stepId: string, body: StepUpdateBody) => {
    const resp = await updateStep(assignmentId, planId, stepId, body)
    refetch()
    return resp
  }

  const remove = async (stepId: string) => {
    await deleteStep(assignmentId, planId, stepId)
    refetch()
  }

  return { steps, loading, error, refetch, create, update, remove }
}
