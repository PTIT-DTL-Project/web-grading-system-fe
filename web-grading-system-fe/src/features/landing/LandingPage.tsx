import { BookOutlined, CheckCircleOutlined, FileTextOutlined, LoginOutlined, LogoutOutlined, TeamOutlined } from '@ant-design/icons'
import { Button, Col, Flex, Row, Space, Typography } from 'antd'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { getIdentity } from '../../shared/auth/identity'
import { logout, redirectToKeycloakLogin } from '../../shared/auth/keycloak'
import { colors } from '../../shared/theme/tokens'

const FEATURES = [
  { icon: <BookOutlined />, titleKey: 'landing.features.classes', descKey: 'landing.features.classesDesc' },
  { icon: <TeamOutlined />, titleKey: 'landing.features.import', descKey: 'landing.features.importDesc' },
  { icon: <CheckCircleOutlined />, titleKey: 'landing.features.grading', descKey: 'landing.features.gradingDesc' },
  { icon: <FileTextOutlined />, titleKey: 'landing.features.transcript', descKey: 'landing.features.transcriptDesc' },
]

export function LandingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const identity = getIdentity()

  const handleLogin = useCallback(() => {
    void redirectToKeycloakLogin().catch((e: unknown) => {
      console.error('Keycloak login redirect failed:', e)
    })
  }, [])

  const handleLogout = useCallback(() => {
    logout()
    navigate('/login', { replace: true })
  }, [navigate])

  const handleEnterClasses = useCallback(() => {
    navigate(identity?.role === 'STUDENT' ? '/student/classes' : '/classes')
  }, [identity?.role, navigate])

  if (identity) {
    return (
      <Flex style={{ minHeight: '100vh', background: colors.layoutBg }} vertical>
        <Flex justify="center" align="center" style={{ background: colors.primary, color: colors.textOnPrimary, padding: '16px 24px', minHeight: 72 }}>
          <Typography.Title level={3} style={{ color: colors.textOnPrimary, margin: 0, fontWeight: 700 }}>{t('app.name')}</Typography.Title>
        </Flex>

        <Flex vertical align="center" justify="center" style={{ padding: '80px 24px 48px', textAlign: 'center' }}>
          <Typography.Title level={3} style={{ marginBottom: 8 }}>
            {t('landing.welcome', { name: identity.email || identity.userId })}
          </Typography.Title>
          <Typography.Title level={5} type="secondary" style={{ marginBottom: 32, fontWeight: 400 }}>
            {identity.role === 'LECTURER' ? t('auth.lecturer') : t('auth.student')}
          </Typography.Title>
          <Space size={16}>
            <Button type="primary" size="large" onClick={handleEnterClasses} style={{ minWidth: 200 }}>
              {identity.role === 'STUDENT' ? t('landing.myClasses') : t('landing.enterClasses')}
            </Button>
            <Button size="large" icon={<LogoutOutlined />} onClick={handleLogout}>
              {t('landing.logout')}
            </Button>
          </Space>
        </Flex>

        <Flex justify="center" style={{ padding: '0 24px 80px' }}>
          <Row gutter={[24, 24]} style={{ maxWidth: 960, width: '100%' }}>
            {FEATURES.map((f) => (
              <Col xs={24} sm={12} lg={6} key={f.titleKey}>
                <Flex vertical align="center" style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '32px 24px', textAlign: 'center', height: '100%' }}>
                  <div style={{ fontSize: 40, color: colors.primary, marginBottom: 16 }}>{f.icon}</div>
                  <Typography.Title level={5} style={{ marginBottom: 8 }}>{t(f.titleKey)}</Typography.Title>
                  <Typography.Text type="secondary">{t(f.descKey)}</Typography.Text>
                </Flex>
              </Col>
            ))}
          </Row>
        </Flex>
      </Flex>
    )
  }

  return (
    <Flex style={{ minHeight: '100vh', background: colors.layoutBg }} vertical>
      <Flex justify="center" align="center" style={{ background: colors.primary, color: colors.textOnPrimary, padding: '16px 24px', minHeight: 72 }}>
        <Typography.Title level={3} style={{ color: colors.textOnPrimary, margin: 0, fontWeight: 700 }}>{t('app.name')}</Typography.Title>
      </Flex>

      <Flex vertical align="center" justify="center" style={{ padding: '80px 24px 48px', textAlign: 'center' }}>
        <Typography.Title level={1} style={{ marginBottom: 8 }}>{t('landing.hero')}</Typography.Title>
        <Typography.Title level={3} type="secondary" style={{ marginBottom: 32, fontWeight: 400 }}>{t('landing.hero')}</Typography.Title>
        <Button type="primary" size="large" icon={<LoginOutlined />} onClick={handleLogin} style={{ minWidth: 200 }}>
          {t('landing.login')}
        </Button>
      </Flex>

      <Flex justify="center" style={{ padding: '0 24px 80px' }}>
        <Row gutter={[24, 24]} style={{ maxWidth: 960, width: '100%' }}>
          {FEATURES.map((f) => (
            <Col xs={24} sm={12} lg={6} key={f.titleKey}>
              <Flex vertical align="center" style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '32px 24px', textAlign: 'center', height: '100%' }}>
                <div style={{ fontSize: 40, color: colors.primary, marginBottom: 16 }}>{f.icon}</div>
                <Typography.Title level={5} style={{ marginBottom: 8 }}>{t(f.titleKey)}</Typography.Title>
                <Typography.Text type="secondary">{t(f.descKey)}</Typography.Text>
              </Flex>
            </Col>
          ))}
        </Row>
      </Flex>
    </Flex>
  )
}