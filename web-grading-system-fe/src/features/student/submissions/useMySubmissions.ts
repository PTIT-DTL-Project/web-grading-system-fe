import { useCallback } from 'react'
import { listMySubmissions } from '../../../shared/api/endpoints/submissions'
import type { SubmissionResponse } from '../../../shared/types/submission'
import { useList } from '../../../shared/hooks/useList'
import type { UseListResult } from '../../../shared/hooks/useList'

export function useMySubmissions(): UseListResult<SubmissionResponse, Record<string, never>> {
  const fetcher = useCallback(
    ({ page, size }: { page: number; size: number }) => listMySubmissions(page, size),
    [],
  )
  return useList<SubmissionResponse, Record<string, never>>({
    fetcher,
    filters: {},
    pageSize: 20,
  })
}
