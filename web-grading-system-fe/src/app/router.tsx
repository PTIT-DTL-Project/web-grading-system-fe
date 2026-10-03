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
import { HomeRedirect } from './HomeRedirect'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireIdentity />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <HomeRedirect /> },
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
          { path: 'no-role', element: <NoRolePage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
