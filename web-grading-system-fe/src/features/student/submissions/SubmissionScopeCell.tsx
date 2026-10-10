import { useQuery } from '@tanstack/react-query'
import { getAssignmentPlans } from '../../../shared/api/endpoints/studentAssignments'
import { ResultScopeBadge } from '../../../shared/ui/ResultScopeBadge'

// Review: 2026-10-10 — history rows span many assignments, and ListPage owns
// its rows, so each cell resolves its own assignment's plans by query key.
// React Query dedupes identical keys: N rows across M assignments cost M calls,
// cached 10 minutes (plans rarely change). A gone assignment/plan renders '—'
// instead of breaking the page.
// An absent planId (backend pre-#38 omits the field) reads as FULL — the
// default submit path — via explicit === undefined (not ==, lint-clean), and
// self-corrects once the backend ships the field. Review: Pullfrog pre-#38 order.
export function SubmissionScopeCell({
  assignmentId,
  planId,
}: {
  assignmentId: string
  planId: string | null | undefined
}) {
  const { data: plans } = useQuery({
    queryKey: ['student-assignment-plans', assignmentId],
    queryFn: () => getAssignmentPlans(assignmentId),
    enabled: !!assignmentId,
    staleTime: 10 * 60 * 1000,
  })
  const name = planId ? (plans?.find((p) => p.id === planId)?.name ?? null) : null
  return (
    <ResultScopeBadge scope={planId === null || planId === undefined ? 'FULL' : 'PLAN'} planName={name} />
  )
}
