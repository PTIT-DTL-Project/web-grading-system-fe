import { useQuery } from '@tanstack/react-query'
import { getAssignmentPlans } from '../../../shared/api/endpoints/studentAssignments'
import { ResultScopeBadge } from '../../../shared/ui/ResultScopeBadge'

// Review: 2026-10-10 — history rows span many assignments, and ListPage owns
// its rows, so each cell resolves its own assignment's plans by query key.
// React Query dedupes identical keys: N rows across M assignments cost M calls,
// cached 10 minutes (plans rarely change). A gone assignment/plan renders '—'
// instead of breaking the page.
export function SubmissionScopeCell({
  assignmentId,
  planId,
}: {
  assignmentId: string
  planId: string | null
}) {
  const { data: plans } = useQuery({
    queryKey: ['student-assignment-plans', assignmentId],
    queryFn: () => getAssignmentPlans(assignmentId),
    enabled: !!assignmentId,
    staleTime: 10 * 60 * 1000,
  })
  const name = planId ? (plans?.find((p) => p.id === planId)?.name ?? null) : null
  return <ResultScopeBadge scope={planId === null ? 'FULL' : 'PLAN'} planName={name} />
}
