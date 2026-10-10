/** submission-service PresignedUrlResponse — POST /api/v1/submissions/presigned-url */
export interface PresignedUrlResponse {
  submissionId: string
  uploadUrl: string
  objectName: string
  expiresInMinutes: number
}

/** submission-service SubmissionStatus — PENDING, GRADING, DONE, FAILED only.
 * The executor writes DONE on success; no GRADED/QUEUED/UPLOADED exists
 * backend-side (SubmissionStatus.valueOf would reject them).
 *
 * <p>Review: 2026-10-10, DONE-status mismatch locked students out of results.
 */
export type SubmissionStatus =
  | 'PENDING'
  | 'GRADING'
  | 'DONE'
  | 'FAILED'

/** submission-service SubmissionResponse — GET /api/v1/submissions[/{id}] */
export interface SubmissionResponse {
  id: string
  assignmentId: string
  studentId: string
  zipFileName: string
  status: SubmissionStatus
  latest: boolean
  createdAt: string | null
  /** Null = whole-assignment submission; set when one plan was picked.
   * Absent entirely on backends pre-#38 (field added 2026-10-10). */
  planId?: string | null
}
