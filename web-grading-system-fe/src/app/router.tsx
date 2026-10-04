import { createBrowserRouter } from 'react-router'
import { RequireIdentity } from '../shared/auth/RequireIdentity'
import { RequireRole } from '../shared/auth/RequireRole'
import { AppLayout } from '../shared/layout/AppLayout'
import { ClassDetailPage } from '../features/classes/ClassDetailPage'
import { ClassesPage } from '../features/classes/ClassesPage'
import { LoginPage } from '../features/auth/LoginPage'
import { NoRolePage } from '../shared/auth/NoRolePage'
import { NotFoundPage } from '../features/NotFoundPage'
import { StudentClassesPage } from '../features/student/StudentClassesPage'
import { LandingPage } from '../features/landing/LandingPage'
import { DockerImagePage } from '../features/docker/DockerImagePage'
import { AssignmentResultsPage } from '../features/assignments/AssignmentResultsPage'
import { AssignmentSubmissionsPage } from '../features/assignments/AssignmentSubmissionsPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { index: true, element: <LandingPage /> },
  {
    element: <RequireIdentity />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: 'classes',
            element: (
              <RequireRole role="LECTURER">
                <ClassesPage />
              </RequireRole>
            ),
          },
          {
            path: 'classes/:classId',
            element: (
              <RequireRole role="LECTURER">
                <ClassDetailPage />
              </RequireRole>
            ),
          },
          {
            path: 'student/classes',
            element: (
              <RequireRole role="STUDENT">
                <StudentClassesPage />
              </RequireRole>
            ),
          },
          { path: 'classes/:classId/assignments/:assignmentId/results',
            element: (
              <RequireRole role="LECTURER">
                <AssignmentResultsPage />
              </RequireRole>
            ),
          },
          { path: 'classes/:classId/assignments/:assignmentId/submissions',
            element: (
              <RequireRole role="LECTURER">
                <AssignmentSubmissionsPage />
              </RequireRole>
            ),
          },
          { path: 'docker-images',
            element: (
              <RequireRole role="LECTURER">
                <DockerImagePage />
              </RequireRole>
            ),
          },
          { path: 'no-role', element: <NoRolePage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
