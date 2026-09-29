import { Navigate } from 'react-router'
import { getIdentity } from '../shared/auth/identity'

/** `/` sends each role to its own landing route (lecturer → classes, student → my classes). */
export function HomeRedirect() {
  const identity = getIdentity()
  return (
    <Navigate
      to={identity?.role === 'STUDENT' ? '/student/classes' : '/classes'}
      replace
    />
  )
}
