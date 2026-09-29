import { Button, Card, Form, Input, Radio, Typography } from 'antd'
import { IdcardOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { isValidUuid, setIdentity, type Role } from '../../shared/auth/identity'
import { colors } from '../../shared/theme/tokens'

interface LoginFormValues {
  role: Role
  userId: string
}

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const onFinish = (values: LoginFormValues) => {
    setIdentity({ role: values.role, userId: values.userId })
    navigate('/', { replace: true })
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.layoutBg,
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <Card styles={{ body: { padding: 0 } }} style={{ width: 420, overflow: 'hidden' }}>
        <div
          style={{
            background: colors.primary,
            color: colors.textOnPrimary,
            padding: '26px 32px',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>{t('app.name')}</div>
          <div style={{ fontSize: 13, opacity: 0.92 }}>{t('app.tagline')}</div>
        </div>

        <div style={{ padding: '26px 32px 32px' }}>
          <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 4 }}>
            {t('auth.title')}
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
            {t('auth.subtitle')}
          </Typography.Paragraph>

          <Form<LoginFormValues>
            layout="vertical"
            requiredMark={false}
            onFinish={onFinish}
            initialValues={{ role: 'LECTURER', userId: '' }}
          >
            <Form.Item name="role" label={t('auth.role')}>
              <Radio.Group
                optionType="button"
                buttonStyle="solid"
                options={[
                  { label: t('auth.lecturer'), value: 'LECTURER' },
                  { label: t('auth.student'), value: 'STUDENT' },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="userId"
              label={t('auth.userId')}
              validateFirst
              rules={[
                { required: true, message: t('auth.invalidUuid') },
                {
                  validator: (_, value: string) =>
                    isValidUuid(value ?? '')
                      ? Promise.resolve()
                      : Promise.reject(new Error(t('auth.invalidUuid'))),
                },
              ]}
              extra={t('auth.userIdHelp')}
            >
              <Input prefix={<IdcardOutlined />} placeholder={t('auth.userIdPlaceholder')} />
            </Form.Item>

            <Button type="primary" htmlType="submit" block size="large">
              {t('auth.submit')}
            </Button>
          </Form>
        </div>
      </Card>
    </div>
  )
}
