import { getData, http } from '../http'
import type { PresignedUrlResponse, SubmissionResponse } from '../../types/submission'
import type { Page } from '../../types/pagination'
import type {
  SubmissionZipTreeResponse,
  SubmissionZipFileResponse,
  SubmissionZipDownloadResponse,
} from '../../types/submission'

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
  search?: string,
  assignmentId?: string,
  options?: { signal?: AbortSignal },
): Promise<Page<SubmissionResponse>> {
  return getData<Page<SubmissionResponse>>(
    '/api/v1/submissions',
    { page, size, ...(search ? { search } : {}), ...(assignmentId ? { assignmentId } : {}) },
    options,
  )
}

/** GET /api/v1/submissions/{submissionId}/tree — cây thư mục zip */
export async function getSubmissionTree(
  submissionId: string,
): Promise<SubmissionZipTreeResponse> {
  return getData<SubmissionZipTreeResponse>(
    `/api/v1/submissions/${submissionId}/tree`,
  )
}

/** GET /api/v1/submissions/{submissionId}/file?path=... — nội dung một entry */
export async function getSubmissionFile(
  submissionId: string,
  path: string,
): Promise<SubmissionZipFileResponse> {
  return getData<SubmissionZipFileResponse>(
    `/api/v1/submissions/${submissionId}/file`,
    { path },
  )
}

/** GET /api/v1/submissions/{submissionId}/download — presigned URL tải toàn bộ zip */
export async function getSubmissionDownloadUrl(
  submissionId: string,
): Promise<SubmissionZipDownloadResponse> {
  return getData<SubmissionZipDownloadResponse>(
    `/api/v1/submissions/${submissionId}/download`,
  )
}
