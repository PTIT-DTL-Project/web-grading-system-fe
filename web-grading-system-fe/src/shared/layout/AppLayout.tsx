import { GlobalOutlined, KeyOutlined, LeftOutlined, LogoutOutlined, ReadOutlined, RightOutlined, TeamOutlined } from '@ant-design/icons'
import { Dropdown, Layout, Menu, Segmented, Space, Tag, Typography } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router'
import { getSession, logout, type Role } from '../auth/keycloak'
import { clearIdentity, getIdentity } from '../auth/identity'
import { ChangePasswordModal } from '../../features/auth/ChangePasswordModal'
import { changeLanguage, type Lang } from '../../locales/i18n'
import { colors } from '../theme/tokens'

const { Sider, Header, Content } = Layout

function menuKeyFor(role: Role): string {
  return role === 'LECTURER' ? '/classes' : '/student/classes'
}

export function AppLayout() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const identity = getIdentity()
  const session = getSession()

  // Hooks must run before the early `!identity` return below (rules of hooks).
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [changePwdOpen, setChangePwdOpen] = useState(false)

  if (!identity) return <Navigate to="/login" replace />

  const menuKey = menuKeyFor(identity.role)
  const items = [
    identity.role === 'LECTURER'
      ? { key: menuKey, icon: <ReadOutlined />, label: t('nav.classes') }
      : { key: menuKey, icon: <TeamOutlined />, label: t('nav.studentClasses') },
  ]
  const selectedKey = location.pathname.startsWith(menuKey) ? menuKey : ''
  const lang: Lang = i18n.language === 'en' ? 'en' : 'vi'

  const handleLogout = () => {
    logout()
    clearIdentity()
    navigate('/login', { replace: true })
  }

  const handleUserMenu = ({ key }: { key: string }) => {
    if (key === 'change-password') setChangePwdOpen(true)
    if (key === 'logout') handleLogout()
  }

  const displayName = session?.email ?? identity.userId

  return (
    <Layout style={{ minHeight: '100vh' }}>
        <Sider
          width={224}
          style={{ background: colors.surface }}
          collapsed={sidebarCollapsed}
          onCollapse={(collapsed: boolean) => setSidebarCollapsed(collapsed)}
        >
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
          <div
            style={{
              background: colors.primary,
              color: colors.textOnPrimary,
              padding: '20px 20px',
              height: 72,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.25 }}>
              {sidebarCollapsed ? t('app.shortName') : t('app.name')}
            </div>
            {!sidebarCollapsed && (
              <div style={{ fontSize: 12, opacity: 0.9 }}>{t('app.tagline')}</div>
            )}
          </div>

          <Menu
            mode="inline"
            selectedKeys={selectedKey ? [selectedKey] : []}
            items={items}
            onClick={({ key }) => navigate(key)}
            style={{ borderInlineEnd: 'none', marginTop: 8 }}
          />

          {/* Bottom-right chevron button — sticky so it never scrolls out of reach (UX review 2026-09-29, Pullfrog PR #?) */}
          <div
            style={{
              marginTop: 'auto',
              position: 'sticky',
              bottom: 16,
              zIndex: 10,
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '8px 8px',
              background: colors.surface,
            }}
          >
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
              aria-label={sidebarCollapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
              style={{
                width: 36,
                height: 36,
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.primary,
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = colors.primaryLight)}
              onMouseOut={(e) => (e.currentTarget.style.background = colors.surface)}
            >
              {sidebarCollapsed ? (
                <RightOutlined style={{ fontSize: 20 }} />
              ) : (
                <LeftOutlined style={{ fontSize: 20 }} />
              )}
            </button>
          </div>
        </div>
      </Sider>

      <Layout>
        <Header
          style={{
            background: colors.surface,
            borderBottom: `1px solid ${colors.border}`,
            paddingInline: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 16,
            height: 72,
          }}
        >
          <Segmented
            value={lang}
            onChange={(value) => void changeLanguage(value as Lang)}
            options={[
              { label: 'VI', value: 'vi' },
              { label: 'EN', value: 'en' },
            ]}
          />

          <Space size={12}>
            <Tag
              style={{
                background: colors.primaryLight,
                color: colors.primary,
                border: 'none',
                fontWeight: 500,
              }}
            >
              {identity.role === 'LECTURER' ? t('auth.lecturer') : t('auth.student')}
            </Tag>

            <Dropdown
              menu={{
                items: [
                  { key: 'change-password', icon: <KeyOutlined />, label: t('nav.changePassword') },
                  { type: 'divider' },
                  { key: 'logout', icon: <LogoutOutlined />, label: t('nav.logout') },
                ],
                onClick: handleUserMenu,
              }}
            >
              <Space style={{ cursor: 'pointer' }}>
                <Typography.Text type="secondary">
                  {displayName.slice(0, 24)}
                </Typography.Text>
                <GlobalOutlined style={{ color: colors.primary }} />
              </Space>
            </Dropdown>
          </Space>

          <ChangePasswordModal open={changePwdOpen} onClose={() => setChangePwdOpen(false)} />
        </Header>

        <Content style={{ padding: 24 }}>
          <div
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              padding: 24,
              minHeight: 360,
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
