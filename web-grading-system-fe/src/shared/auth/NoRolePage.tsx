import { Button } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { clearIdentity } from './identity'
import { logout } from './keycloak'

export function NoRolePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const handleLogout = () => {
    logout()
    clearIdentity()
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
