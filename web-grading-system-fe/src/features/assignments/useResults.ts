import { useQuery } from '@tanstack/react-query'
import { listResults } from '../../shared/api/endpoints/assignments'

export function useResults(assignmentId: string, includeSteps = false) {
  // Review: 2026-10-05, Pullfrog — keep this snapshot cached briefly, with the page owning manual refresh for in-flight grading runs.
  return useQuery({
    queryKey: ['results', assignmentId, includeSteps],
    queryFn: () => listResults(assignmentId, includeSteps),
    enabled: !!assignmentId,
    staleTime: 5 * 60 * 1000,
  })
}