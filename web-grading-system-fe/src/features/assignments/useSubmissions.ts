import { useQuery } from '@tanstack/react-query'
import { listSubmissions } from '../../shared/api/endpoints/assignments'

export function useSubmissions(assignmentId: string) {
  // Review: 2026-10-05, Pullfrog — keep this snapshot cached briefly, with the page owning manual refresh for in-flight grading runs.
  return useQuery({
    queryKey: ['submissions', assignmentId],
    queryFn: () => listSubmissions(assignmentId),
    enabled: !!assignmentId,
    staleTime: 5 * 60 * 1000,
  })
}