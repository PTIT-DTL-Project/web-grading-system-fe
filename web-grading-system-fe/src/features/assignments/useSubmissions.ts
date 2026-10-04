import { useQuery } from '@tanstack/react-query'
import { listSubmissions } from '../../shared/api/endpoints/assignments'

export function useSubmissions(assignmentId: string) {
  return useQuery({
    queryKey: ['submissions', assignmentId],
    queryFn: () => listSubmissions(assignmentId),
    enabled: !!assignmentId,
    staleTime: 5 * 60 * 1000,
  })
}