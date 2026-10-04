import { useQuery } from '@tanstack/react-query'
import { listResults } from '../../shared/api/endpoints/assignments'

export function useResults(assignmentId: string, includeSteps = false) {
  return useQuery({
    queryKey: ['results', assignmentId, includeSteps],
    queryFn: () => listResults(assignmentId, includeSteps),
    enabled: !!assignmentId,
    staleTime: 5 * 60 * 1000,
  })
}