/**
 * ScoreComponentType (course-service enum). Only EXERCISE is auto-graded from
 * results and therefore rejected by PUT .../scores — every other type is manual.
 */
export type ScoreComponentType = 'ATTENDANCE' | 'EXERCISE' | 'FINAL_EXAM' | 'ASSIGNMENT'

/** ScoreComponentResponse — GET/PUT /api/v1/classes/{id}/score-components. */
export interface ScoreComponentResponse {
  type: ScoreComponentType
  weight: number
}

/** StudentScoreEntryResponse — nested in StudentScoresResponse and TranscriptEntryResponse. */
export interface StudentScoreEntryResponse {
  type: ScoreComponentType
  weight: number
  score: number | null
}

/** StudentScoresResponse — GET /api/v1/classes/{id}/students/{code}/scores. */
export interface StudentScoresResponse {
  studentCode: string
  entries: StudentScoreEntryResponse[]
  /** null while any component is still missing a score (EXERCISE chain incomplete). */
  total: number | null
  letterGrade: string | null
  gpa: number | null
}

/** TranscriptEntryResponse — GET /api/v1/classes/{id}/transcript. */
export interface TranscriptEntryResponse {
  studentCode: string
  studentName: string
  entries: StudentScoreEntryResponse[]
  total: number | null
  letterGrade: string | null
  gpa: number | null
}

/** PUT /api/v1/classes/{id}/students/{code}/scores — EXERCISE must never be sent (400). */
export interface StudentScoreRequest {
  componentType: ScoreComponentType
  score: number
}
