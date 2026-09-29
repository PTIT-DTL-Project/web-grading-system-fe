import { getData, http, sendData } from '../http'
import type {
  ClassResponse,
  ClassStudentResponse,
  CreateClassRequest,
  ImportStudentsResponse,
} from '../../types/class'
import type { Page } from '../../types/pagination'
import type {
  ScoreComponentResponse,
  StudentScoreRequest,
  StudentScoresResponse,
  TranscriptEntryResponse,
} from '../../types/score'

/* ------------------------------------------------------------------ classes */

export function listClasses(
  page: number,
  size: number,
  search?: string,
  status?: string,
  options?: { signal?: AbortSignal },
): Promise<Page<ClassResponse>> {
  return getData<Page<ClassResponse>>('/api/v1/classes', { page, size, ...(search ? { search } : {}), ...(status ? { status } : {}) }, options)
}

export function getClass(classId: string, options?: { signal?: AbortSignal }): Promise<ClassResponse> {
  return getData<ClassResponse>(`/api/v1/classes/${classId}`, undefined, options)
}

export function createClass(body: CreateClassRequest): Promise<ClassResponse> {
  return sendData<ClassResponse, CreateClassRequest>('/api/v1/classes', 'post', body)
}

export function archiveClass(classId: string): Promise<ClassResponse> {
  return sendData<ClassResponse, undefined>(`/api/v1/classes/${classId}/archive`, 'put')
}

/* ------------------------------------------------------------------ students */

export function listStudents(
  classId: string,
  page: number,
  size: number,
  options?: { signal?: AbortSignal },
): Promise<Page<ClassStudentResponse>> {
  return getData<Page<ClassStudentResponse>>(`/api/v1/classes/${classId}/students`, { page, size }, options)
}

export function importStudents(classId: string, file: File, options?: { signal?: AbortSignal }): Promise<ImportStudentsResponse> {
  const form = new FormData()
  form.append('file', file)
  return http
    .post<ImportStudentsResponse>(`/api/v1/classes/${classId}/students/import`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal: options?.signal,
    })
    .then((response) => response.data)
}

/* ------------------------------------------------------------------ scores */

export function getScoreComponents(classId: string, options?: { signal?: AbortSignal }): Promise<ScoreComponentResponse[]> {
  return getData<ScoreComponentResponse[]>(`/api/v1/classes/${classId}/score-components`, undefined, options)
}

export function saveScoreComponents(
  classId: string,
  body: ScoreComponentResponse[],
  options?: { signal?: AbortSignal },
): Promise<ScoreComponentResponse[]> {
  return sendData<ScoreComponentResponse[], ScoreComponentResponse[]>(
    `/api/v1/classes/${classId}/score-components`,
    'put',
    body,
    options,
  )
}

export function getStudentScores(
  classId: string,
  studentCode: string,
  options?: { signal?: AbortSignal },
): Promise<StudentScoresResponse> {
  return getData<StudentScoresResponse>(
    `/api/v1/classes/${classId}/students/${encodeURIComponent(studentCode)}/scores`,
    undefined,
    options,
  )
}

export function setStudentScores(
  classId: string,
  studentCode: string,
  body: StudentScoreRequest[],
  options?: { signal?: AbortSignal },
): Promise<void> {
  return sendData<void, StudentScoreRequest[]>(
    `/api/v1/classes/${classId}/students/${encodeURIComponent(studentCode)}/scores`,
    'put',
    body,
    options,
  )
}

export function getTranscript(classId: string, options?: { signal?: AbortSignal }): Promise<TranscriptEntryResponse[]> {
  return getData<TranscriptEntryResponse[]>(`/api/v1/classes/${classId}/transcript`, undefined, options)
}
