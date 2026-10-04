import { useCallback } from 'react'
import { listStudentAssignments } from '../../../shared/api/endpoints/studentAssignments'
import type { AssignmentResponse } from '../../../shared/types/assignment'
import { useList } from '../../../shared/hooks/useList'
import type { UseListResult } from '../../../shared/hooks/useList'

export interface AssignmentFilters {
  search?: string
}

export function useStudentAssignments(): UseListResult<AssignmentResponse, AssignmentFilters> {
  const fetcher = useCallback(
    ({ page, size, search }: { page: number; size: number } & AssignmentFilters) =>
      listStudentAssignments(page, size, search),
    [],
  )
  return useList<AssignmentResponse, AssignmentFilters>({ fetcher, filters: {}, pageSize: 20 })
}
