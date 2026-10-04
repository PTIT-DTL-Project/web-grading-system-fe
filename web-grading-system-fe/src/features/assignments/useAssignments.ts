import { useEffect, useState, useCallback } from 'react'
import {
  listAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  publishAssignment,
} from '../../shared/api/endpoints/assignments'
import type { AssignmentResponse, CreateAssignmentRequest, UpdateAssignmentRequest } from '../../shared/types/assignment'
import type { Page } from '../../shared/types/pagination'

interface UseAssignmentsReturn {
  data: Page<AssignmentResponse> | null
  loading: boolean
  error: unknown
  refetch: () => void
  create: (req: CreateAssignmentRequest) => Promise<AssignmentResponse>
  update: (id: string, req: UpdateAssignmentRequest) => Promise<AssignmentResponse>
  remove: (id: string) => Promise<void>
  publish: (id: string) => Promise<AssignmentResponse>
}

export function useAssignments(classId: string): UseAssignmentsReturn {
  const [data, setData] = useState<Page<AssignmentResponse> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [version, setVersion] = useState(0)

  const refetch = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    listAssignments(classId, 0, 20)
      .then((resp) => {
        if (controller.signal.aborted) return
        setData(resp)
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
  }, [classId, version])

  const create = async (req: CreateAssignmentRequest) => {
    const resp = await createAssignment(req)
    refetch()
    return resp
  }

  const update = async (id: string, req: UpdateAssignmentRequest) => {
    const resp = await updateAssignment(id, req)
    refetch()
    return resp
  }

  const remove = async (id: string) => {
    await deleteAssignment(id)
    refetch()
  }

  const publish = async (id: string) => {
    const resp = await publishAssignment(id)
    refetch()
    return resp
  }

  return { data, loading, error, refetch, create, update, remove, publish }
}
