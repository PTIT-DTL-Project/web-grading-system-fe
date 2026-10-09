/** course-service ClassResponse — GET/POST /api/v1/classes, GET /api/v1/classes/{id}. */
export type ClassStatus = 'ACTIVE' | 'ARCHIVED'

export interface ClassResponse {
  id: string
  ownerId: string
  name: string
  semester: string
  status: ClassStatus
  createdAt: string | null
}

/** course-service ClassStudentResponse — GET /api/v1/classes/{id}/students. */
export interface ClassStudentResponse {
  id: string
  studentCode: string
  studentName: string
  email: string | null
}

/** course-service StudentRosterResponse — GET /api/v1/student/classes/{id}/students. Codes and names only, no contact details. */
export interface StudentRoster {
  studentCode: string
  studentName: string
}

/** POST /api/v1/classes */
export interface CreateClassRequest {
  name: string
  semester: string
}

/** POST /api/v1/classes/{id}/students/import — body is multipart form-data (field `file`). */
export interface ImportStudentsResponse {
  imported: number
  skipped: number
}
