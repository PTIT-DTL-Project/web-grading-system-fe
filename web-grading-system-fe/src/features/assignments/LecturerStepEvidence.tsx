import { Space, Table, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { colors } from '../../shared/theme/tokens'

// Deliberately separate from the student StepEvidence (same content today).
// Lecturer detail is allowed to diverge (raw config, internal IDs, ...) without
// touching student rendering — do not merge without explicit decision.
// Review: 2026-10-12, lecturer detail parity (option b).
interface AssertionDetail {
  kind?: string
  expected?: string | number | boolean | null
  actual?: string | number | boolean | null
  passed?: boolean
  message?: string
}

// All optional: the mirror backend may predate any of these fields, and the
// panel hides absent sections instead of breaking.
interface LecturerStep {
  actualValue?: string | null
  expectedValue?: string | null
  errorMessage?: string | null
  assertionDetails?: string | null
  extractedVars?: string | null
  requestUrl?: string | null
  requestBody?: string | null
}

function parseAssertions(raw: string | null | undefined): AssertionDetail[] | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed.filter(
      (e): e is AssertionDetail => !!e && typeof e === 'object' && !Array.isArray(e),
    )
  } catch {
    return null
  }
}

function prettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

export function LecturerStepEvidence({ step }: { step: LecturerStep }) {
  const { t } = useTranslation()
  const assertions = parseAssertions(step.assertionDetails)
  const shownAssertions = assertions ? assertions.slice(0, 20) : null
  return (
    <Space direction="vertical" style={{ width: '100%' }} size={8}>
      {step.actualValue ? (
        <div>
          <Typography.Text strong style={{ fontSize: 12 }}>
            {t('result.actualValue')}
          </Typography.Text>
          <Typography.Paragraph
            code
            copyable
            style={{ fontSize: 12, whiteSpace: 'pre-wrap', margin: '4px 0 0' }}
          >
            {step.actualValue}
          </Typography.Paragraph>
        </div>
      ) : null}
      {step.expectedValue ? (
        <div>
          <Typography.Text strong style={{ fontSize: 12 }}>
            {t('result.expectedValue')}
          </Typography.Text>
          <Typography.Paragraph
            code
            copyable
            style={{ fontSize: 12, whiteSpace: 'pre-wrap', margin: '4px 0 0' }}
          >
            {step.expectedValue}
          </Typography.Paragraph>
        </div>
      ) : null}
      {step.errorMessage ? (
        <div>
          <Typography.Text strong style={{ fontSize: 12 }}>
            {t('result.errorMessage')}
          </Typography.Text>
          <Typography.Paragraph
            type="danger"
            copyable
            style={{ fontSize: 12, whiteSpace: 'pre-wrap', margin: '4px 0 0' }}
          >
            {step.errorMessage}
          </Typography.Paragraph>
        </div>
      ) : null}
      {shownAssertions && shownAssertions.length > 0 ? (
        <div>
          <Typography.Text strong style={{ fontSize: 12 }}>
            {t('result.assertions')}
          </Typography.Text>
          <Table
            rowKey={(_, index) => String(index)}
            columns={[
              { title: t('result.assertionKind'), dataIndex: 'kind', key: 'kind', width: 130 },
              {
                title: t('result.expectedValue'),
                dataIndex: 'expected',
                key: 'expected',
                render: (v: unknown) =>
                  v === null || v === undefined
                    ? '—'
                    : typeof v === 'object'
                      ? JSON.stringify(v)
                      : String(v),
              },
              {
                title: t('result.actualValue'),
                dataIndex: 'actual',
                key: 'actual',
                render: (v: unknown) =>
                  v === null || v === undefined
                    ? '—'
                    : typeof v === 'object'
                      ? JSON.stringify(v)
                      : String(v),
              },
              {
                title: t('result.passed'),
                dataIndex: 'passed',
                key: 'passed',
                width: 70,
                render: (v: boolean) =>
                  v ? (
                    <CheckCircleOutlined style={{ color: colors.success, fontSize: 16 }} />
                  ) : (
                    <CloseCircleOutlined style={{ color: colors.error, fontSize: 16 }} />
                  ),
              },
            ]}
            dataSource={shownAssertions}
            pagination={false}
            size="small"
            style={{ marginTop: 4 }}
          />
          {assertions && assertions.length > shownAssertions.length ? (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t('result.andMore', { count: assertions.length - shownAssertions.length })}
            </Typography.Text>
          ) : null}
        </div>
      ) : null}
      {step.requestUrl || step.requestBody ? (
        <div>
          <Typography.Text strong style={{ fontSize: 12 }}>
            {t('result.request')}
          </Typography.Text>
          {step.requestUrl ? (
            <Typography.Paragraph
              code
              copyable
              style={{ fontSize: 12, margin: '4px 0 0' }}
            >
              {step.requestUrl}
            </Typography.Paragraph>
          ) : null}
          {step.requestBody ? (
            <Typography.Paragraph
              code
              copyable
              ellipsis={{ rows: 6, expandable: true, symbol: t('result.showMore') }}
              style={{ fontSize: 12, whiteSpace: 'pre-wrap', margin: '4px 0 0' }}
            >
              {step.requestBody}
            </Typography.Paragraph>
          ) : null}
        </div>
      ) : null}
      {step.extractedVars ? (
        <div>
          <Typography.Text strong style={{ fontSize: 12 }}>
            {t('result.extractVars')}
          </Typography.Text>
          <Typography.Paragraph
            code
            copyable
            style={{ fontSize: 12, whiteSpace: 'pre-wrap', margin: '4px 0 0' }}
          >
            {prettyJson(step.extractedVars)}
          </Typography.Paragraph>
        </div>
      ) : null}
    </Space>
  )
}
