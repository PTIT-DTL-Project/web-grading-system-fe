import { Navigate, Outlet } from 'react-router'
import { getIdentity } from './identity'

/** No (or malformed) identity → the login screen. Everything else renders the app shell. */
export function RequireIdentity() {
  if (!getIdentity()) {
    sessionStorage.setItem('wgs.postLoginUrl', window.location.href)
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
