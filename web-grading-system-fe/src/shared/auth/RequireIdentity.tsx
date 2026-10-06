import { Navigate, Outlet } from 'react-router'
import { useEffect } from 'react'
import { getIdentity } from './identity'

/** No (or malformed) identity → the login screen. Everything else renders the app shell. */
export function RequireIdentity() {
  const identity = getIdentity()

  // Review: 2026-10-05, Pullfrog — capture the deep link in the redirect commit, not as a render side effect.
  useEffect(() => {
    if (!identity) {
      sessionStorage.setItem('wgs.postLoginUrl', window.location.href)
    }
  }, [identity])

  if (!identity) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
