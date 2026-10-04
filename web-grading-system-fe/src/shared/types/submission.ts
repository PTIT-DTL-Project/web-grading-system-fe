/** submission-service PresignedUrlResponse — POST /api/v1/submissions/presigned-url */
export interface PresignedUrlResponse {
  submissionId: string
  uploadUrl: string
  objectName: string
  expiresInMinutes: number
}

export type SubmissionStatus =
  | 'PENDING'
  | 'UPLOADED'
  | 'QUEUED'
  | 'GRADING'
  | 'GRADED'
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
}
