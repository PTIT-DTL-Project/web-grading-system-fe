import { Skeleton } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { getStudentAssignment } from '../../../shared/api/endpoints/studentAssignments'

// Review: 2026-10-10 — submission/result rows carry only assignmentId, so the
// title resolves here per row. React Query dedupes identical keys: a page of
// N rows from the same assignment costs one network call, cached 10 minutes
// (titles rarely change). A gone assignment (deleted/unenrolled) renders '—'
// instead of breaking the page.
export function AssignmentTitle({ assignmentId }: { assignmentId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['student-assignment', assignmentId],
    queryFn: () => getStudentAssignment(assignmentId),
    enabled: !!assignmentId,
    staleTime: 10 * 60 * 1000,
  })
  if (isLoading) return <Skeleton.Input size="small" active />
  return <>{data?.title ?? '—'}</>
}
