import { getData, http } from '../http'
import type { PresignedUrlResponse, SubmissionResponse } from '../../types/submission'
import type { Page } from '../../types/pagination'

/**
 * POST /api/v1/submissions/presigned-url
 */
export async function requestUploadUrl(
  assignmentId: string,
  zipFileName: string,
  planId?: string,
): Promise<PresignedUrlResponse> {
  const params = new URLSearchParams({ assignmentId, zipFileName })
  if (planId) params.set('planId', planId)
  const response = await http.post<PresignedUrlResponse>(
    `/api/v1/submissions/presigned-url?${params.toString()}`,
  )
  return response.data
}

/**
 * PUT {uploadUrl} — upload file ZIP lên MinIO/S3 qua presigned URL.
 */
export async function uploadZipToStorage(uploadUrl: string, file: File): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': 'application/zip' },
  })
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
  }
}

/** GET /api/v1/submissions */
export function listMySubmissions(
  page: number,
  size: number,
  options?: { signal?: AbortSignal },
): Promise<Page<SubmissionResponse>> {
  return getData<Page<SubmissionResponse>>('/api/v1/submissions', { page, size }, options)
}

/** GET /api/v1/submissions/{id} */
export function getSubmission(
  id: string,
  options?: { signal?: AbortSignal },
): Promise<SubmissionResponse> {
  return getData<SubmissionResponse>(`/api/v1/submissions/${id}`, undefined, options)
}
