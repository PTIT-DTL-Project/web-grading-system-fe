import { isCancel } from 'axios'
import { useCallback, useEffect, useState } from 'react'
import {
  getStudentAssignment,
  getAssignmentPlans,
} from '../../../shared/api/endpoints/studentAssignments'
import type {
  AssignmentResponse,
  PlanResponse,
} from '../../../shared/types/assignment'

export interface StudentAssignmentState {
  assignment: AssignmentResponse | null
  plans: PlanResponse[]
  loading: boolean
  error: unknown
  reload: () => void
}

export function useStudentAssignment(id: string): StudentAssignmentState {
  const [assignment, setAssignment] = useState<AssignmentResponse | null>(null)
  const [plans, setPlans] = useState<PlanResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    Promise.all([
      getStudentAssignment(id, { signal: controller.signal }),
      getAssignmentPlans(id, { signal: controller.signal }),
    ])
      .then(([a, p]) => {
        if (controller.signal.aborted) return
        setAssignment(a)
        setPlans(p)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || isCancel(err)) return
        setError(err)
      })
      .finally(() => {
        if (controller.signal.aborted) return
        setLoading(false)
      })
    return () => controller.abort()
  }, [id, version])

  return { assignment, plans, loading, error, reload }
}
