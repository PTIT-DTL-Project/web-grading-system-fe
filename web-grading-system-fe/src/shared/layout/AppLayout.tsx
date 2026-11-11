import { CodeOutlined, GlobalOutlined, HistoryOutlined, KeyOutlined, LeftOutlined, LogoutOutlined, ReadOutlined, RightOutlined, RobotOutlined, TeamOutlined, UserAddOutlined } from '@ant-design/icons'
import { Button, Drawer, Dropdown, Grid, Layout, Menu, Segmented, Space, Tag, Typography } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router'
import { getSession, logout, type Role } from '../auth/keycloak'
import { getIdentity } from '../auth/identity'
import { ChangePasswordModal } from '../../features/auth/ChangePasswordModal'
import { AiChatSidebar } from '../../features/ai-chat/AiChatSidebar'
import { changeLanguage, type Lang } from '../../locales/i18n'
import { colors } from '../theme/tokens'
import './app-layout.css'

const { Sider, Header, Content } = Layout

function menuKeyFor(role: Role): string {
  if (role === 'LECTURER') return '/classes'
  if (role === 'ADMIN') return '/admin/users'
  return '/student/classes'
}

export function AppLayout() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const identity = getIdentity()
  const session = getSession()

  // Hooks must run before the early `!identity` return below (rules of hooks).
  const screens = Grid.useBreakpoint()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [changePwdOpen, setChangePwdOpen] = useState(false)
  const [aiChatOpen, setAiChatOpen] = useState(false)

  if (!identity) return <Navigate to="/login" replace />

  const menuKey = menuKeyFor(identity.role)
  const items =
    identity.role === 'LECTURER'
      ? [
        { key: '/classes', icon: <ReadOutlined />, label: t('nav.classes') },
        { key: '/practice', icon: <CodeOutlined />, label: t('nav.practiceExercises') },
      ]
      : identity.role === 'ADMIN'
        ? [{ key: '/admin/users', icon: <UserAddOutlined />, label: t('nav.adminUsers') }]
        : [
          { key: '/student/classes', icon: <TeamOutlined />, label: t('nav.studentClasses') },
          { key: '/student/assignments', icon: <ReadOutlined />, label: t('nav.studentAssignments') },
          { key: '/student/practice', icon: <CodeOutlined />, label: t('nav.practice') },
          { key: '/student/submissions', icon: <HistoryOutlined />, label: t('nav.studentMySubmissions') },
        ]
  const selectedKey = items.find((item) => location.pathname.startsWith(item.key))?.key ?? ''
  const lang: Lang = i18n.language === 'en' ? 'en' : 'vi'

  const handleLogout = () => {
    // Nothing is cleared before logout(): clearSession() would drop keycloak-js's
    // idToken and leave id_token_hint empty — Keycloak then renders its own
    // logout-confirmation screen instead of returning to /login (the invariant
    // documented on logout() itself). The navigation after it wipes the
    // in-memory session anyway, so no clearing call is needed for correctness.
    // Review: 2026-10-04, Pullfrog (logout() invariant)
    logout()
    navigate('/login', { replace: true })
  }

  const handleUserMenu = ({ key }: { key: string }) => {
    if (key === 'change-password') setChangePwdOpen(true)
    if (key === 'logout') handleLogout()
  }

  // `||` not `??`: sessionFromTokens defaults a missing claim to '', and
  // `??` only falls back on null/undefined — an empty claim would render a blank
  // header instead of the fallback. Review: 2026-10-04, Pullfrog (empty displayName)
  const fullName = [session?.lastName, session?.firstName]
    .filter(Boolean)
    .join(' ')
    .trim()
  const displayName = fullName || session?.email || identity.userId

  return (
    <Layout style={{ minHeight: '100vh' }}>
        <Sider
          width={224}
          breakpoint="lg"
          collapsedWidth={0}
          trigger={null}
          style={{ background: colors.surface }}
          collapsed={sidebarCollapsed}
          onCollapse={(collapsed: boolean) => setSidebarCollapsed(collapsed)}
        >
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
          {/* Review: 2026-10-05, Pullfrog — keep signed-in users inside the app shell instead of ejecting them to the public landing page. */}
          <Link
            to={menuKey}
            aria-label={t('app.name')}
            style={{
              background: colors.primary,
              color: colors.textOnPrimary,
              padding: '20px 20px',
              height: 72,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              textDecoration: 'none',
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.25 }}>
              {sidebarCollapsed ? t('app.shortName') : t('app.name')}
            </div>
            {!sidebarCollapsed && (
              <div style={{ fontSize: 12, opacity: 0.9 }}>{t('app.tagline')}</div>
            )}
          </Link>

          <Menu
            mode="inline"
            selectedKeys={selectedKey ? [selectedKey] : []}
            items={items}
            onClick={({ key }) => navigate(key)}
            style={{ borderInlineEnd: 'none', marginTop: 8 }}
          />
        </div>
      </Sider>

      <Layout className={aiChatOpen ? 'app-main-layout app-main-layout--chat-open' : 'app-main-layout'}>
        <Header
          style={{
            background: colors.surface,
            borderBottom: `1px solid ${colors.border}`,
            paddingInline: screens.md ? 24 : 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: screens.lg ? 'flex-end' : 'space-between',
            gap: screens.md ? 16 : 8,
            flexWrap: 'wrap',
            minHeight: 72,
            height: 'auto',
          }}
        >
          {!screens.lg && (
            <Button
              aria-label={t('nav.openMenu')}
              icon={<ReadOutlined />}
              onClick={() => setMobileNavOpen(true)}
            />
          )}
          {screens.lg && (
            <Button
              type="text"
              aria-label={sidebarCollapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
              title={sidebarCollapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
              icon={sidebarCollapsed ? <RightOutlined /> : <LeftOutlined />}
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{
                width: 36,
                height: 36,
                border: `1px solid ${colors.border}`,
                borderRadius: '50%',
                color: colors.primary,
              }}
            />
          )}
          <Button
            type="primary"
            ghost
            icon={<RobotOutlined />}
            onClick={() => setAiChatOpen(true)}
            style={{ borderRadius: 6 }}
          >
            {screens.md ? t('ai.assistant', 'Trợ lý AI') : null}
          </Button>

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
              {identity.role === 'LECTURER'
                ? t('auth.lecturer')
                : identity.role === 'ADMIN'
                  ? t('auth.admin')
                  : t('auth.student')}
            </Tag>

            <Dropdown
              menu={{
                items: [
                  {
                    key: 'user-name',
                    label: (
                      <div style={{ padding: '8px 16px', fontWeight: 600 }}>
                        {fullName}
                      </div>
                    ),
                    disabled: true,
                  },
                  {
                    key: 'user-email',
                    label: (
                      <Typography.Text type="secondary" style={{ fontSize: 12, padding: '0 16px' }}>
                        {session?.email}
                      </Typography.Text>
                    ),
                    disabled: true,
                  },
                  { type: 'divider' },
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

        <Content
          style={{
            padding: screens.md ? 24 : 12,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              padding: screens.md ? 24 : 12,
              minWidth: 0,
              // Flex column so route content (e.g. the zip viewer) fills the
              // available height instead of relying on a magic calc() value.
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 360,
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
      <Drawer
        title={t('app.name')}
        placement="left"
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        width={280}
        styles={{ body: { padding: 0 } }}
      >
        <Menu
          mode="inline"
          selectedKeys={selectedKey ? [selectedKey] : []}
          items={items}
          onClick={({ key }) => {
            setMobileNavOpen(false)
            navigate(key)
          }}
          style={{ borderInlineEnd: 'none' }}
        />
      </Drawer>
      <AiChatSidebar open={aiChatOpen} onClose={() => setAiChatOpen(false)} />
    </Layout>
  )
}
