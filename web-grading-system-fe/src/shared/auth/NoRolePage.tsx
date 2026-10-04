import { Button } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { logout } from './keycloak'

export function NoRolePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const handleLogout = () => {
    // No clearSession()/clearIdentity() before logout(): it would drop
    // keycloak-js's idToken and leave id_token_hint empty (logout()'s documented
    // invariant). The navigation that follows discards the in-memory session.
    // Review: 2026-10-04, Pullfrog (logout() invariant)
    logout()
    navigate('/login', { replace: true })
  }
  return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <p>{t('auth.noRole')}</p>
      <Button type="primary" onClick={handleLogout}>
        {t('auth.logout')}
      </Button>
    </div>
  )
}
