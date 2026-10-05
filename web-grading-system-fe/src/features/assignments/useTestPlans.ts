import { useEffect, useState, useCallback } from 'react'
import { listPlans, createPlan, updatePlan, deletePlan } from '../../shared/api/endpoints/assignments'
import type { TestPlan } from '../../shared/types/assignment'

interface UseTestPlansReturn {
  plans: TestPlan[]
  loading: boolean
  error: unknown
  refetch: () => void
  create: (body: { name: string; description?: string; sequenceOrder: number; weight?: number }) => Promise<TestPlan>
  update: (planId: string, body: { name?: string; description?: string; sequenceOrder?: number; weight?: number }) => Promise<TestPlan>
  remove: (planId: string) => Promise<void>
}

export function useTestPlans(assignmentId: string): UseTestPlansReturn {
  const [plans, setPlans] = useState<TestPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [version, setVersion] = useState(0)

  const refetch = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    listPlans(assignmentId)
      .then((data) => {
        if (controller.signal.aborted) return
        setPlans(data)
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
  }, [assignmentId, version])

  const create = async (body: { name: string; description?: string; sequenceOrder: number; weight?: number }) => {
    const resp = await createPlan(assignmentId, body)
    refetch()
    return resp
  }

  const update = async (planId: string, body: { name?: string; description?: string; sequenceOrder?: number; weight?: number }) => {
    const resp = await updatePlan(assignmentId, planId, body)
    refetch()
    return resp
  }

  const remove = async (planId: string) => {
    await deletePlan(assignmentId, planId)
    refetch()
  }

  return { plans, loading, error, refetch, create, update, remove }
}
