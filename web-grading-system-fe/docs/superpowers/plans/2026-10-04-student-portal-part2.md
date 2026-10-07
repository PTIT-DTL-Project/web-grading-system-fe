# Student Portal Implementation Plan - Part 2

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Task 5: SubmitAssignmentModal

**Files:**
- Create: `src/features/student/assignments/SubmitAssignmentModal.tsx`

**Interface props:** `{ assignmentId: string, plans: PlanResponse[], images: DockerImageResponse[], open: boolean, onClose: () => void, onSuccess: (submissionId: string) => void }`

- [ ] **Step 1: Tạo `src/features/student/assignments/SubmitAssignmentModal.tsx`**

```tsx
import { useState, useRef } from 'react'
import { Modal, Form, Select, Button, Alert, Typography, Space } from 'antd'
import { InboxOutlined, LoadingOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { requestUploadUrl, uploadZipToStorage } from '../../../shared/api/endpoints/submissions'
import type { PlanResponse, DockerImageResponse } from '../../../shared/types/assignment'
import { colors } from '../../../shared/theme/tokens'

interface SubmitAssignmentModalProps {
  assignmentId: string
  plans: PlanResponse[]
  images: DockerImageResponse[]
  open: boolean
  onClose: () => void
  onSuccess: (submissionId: string) => void
}

type SubmitStep = 'idle' | 'uploading' | 'done' | 'error'

export function SubmitAssignmentModal({
  assignmentId,
  plans,
  images,
  open,
  onClose,
  onSuccess,
}: SubmitAssignmentModalProps) {
  const { t } = useTranslation()
  const [form] = Form.useForm()
  const [file, setFile] = useState<File | null>(null)
  const [step, setStep] = useState<SubmitStep>('idle')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [doneSubmissionId, setDoneSubmissionId] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    form.resetFields()
    setFile(null)
    setStep('idle')
    setErrorMsg('')
    setDoneSubmissionId('')
  }

  const handleClose = () => { reset(); onClose() }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null)
  }

  const handleSubmit = async () => {
    try { await form.validateFields() } catch { return }
    if (!file) { setErrorMsg(t('submitModal.fileRequired')); return }

    const planId: string | undefined = form.getFieldValue('planId')
    setStep('uploading')
    setErrorMsg('')
    try {
      const presigned = await requestUploadUrl(assignmentId, file.name, planId)
      await uploadZipToStorage(presigned.uploadUrl, file)
      setDoneSubmissionId(presigned.submissionId)
      setStep('done')
    } catch (err: unknown) {
      setStep('error')
      setErrorMsg(err instanceof Error ? err.message : t('submitModal.failed'))
    }
  }

  const isLoading = step === 'uploading'

  return (
    <Modal
      title={t('submitModal.title')}
      open={open}
      onCancel={handleClose}
      footer={
        step === 'done'
          ? [
              <Button key="close" onClick={handleClose}>{t('common.cancel')}</Button>,
              <Button
                key="result"
                type="primary"
                style={{ background: colors.primary, borderColor: colors.primary }}
                onClick={() => { handleClose(); onSuccess(doneSubmissionId) }}
              >
                {t('submitModal.viewResult')}
              </Button>,
            ]
          : [
              <Button key="cancel" onClick={handleClose} disabled={isLoading}>{t('common.cancel')}</Button>,
              <Button
                key="submit"
                type="primary"
                loading={isLoading}
                style={{ background: colors.primary, borderColor: colors.primary }}
                onClick={handleSubmit}
              >
                {isLoading ? t('submitModal.uploading') : t('submitModal.submit')}
              </Button>,
            ]
      }
      destroyOnHide
    >
      {step === 'done' ? (
        <Alert
          type="success"
          message={t('submitModal.success')}
          description={t('submitModal.successHint')}
          showIcon
        />
      ) : (
        <Form form={form} layout="vertical">
          {plans.length > 0 && (
            <Form.Item
              name="planId"
              label={t('submitModal.selectPlan')}
              rules={[{ required: true, message: t('submitModal.planRequired') }]}
            >
              <Select placeholder={t('submitModal.selectPlanPlaceholder')}>
                {plans.map((p) => (
                  <Select.Option key={p.id} value={p.id}>
                    {p.name} — {t('assignments.planWeight', { weight: p.weight })}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}
          {images.length > 0 && (
            <Form.Item name="imageId" label={t('submitModal.selectImage')}>
              <Select placeholder={t('submitModal.selectImagePlaceholder')} allowClear>
                {images.map((img) => (
                  <Select.Option key={img.id} value={img.id}>
                    {img.name}:{img.tag}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}
          <Form.Item label={t('submitModal.uploadFile')} required>
            <div
              style={{
                border: `1px dashed ${colors.border}`,
                borderRadius: 8, padding: 24,
                textAlign: 'center', cursor: 'pointer',
                background: colors.layoutBg,
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              {isLoading
                ? <LoadingOutlined style={{ fontSize: 32, color: colors.primary }} />
                : <InboxOutlined style={{ fontSize: 32, color: colors.primary }} />
              }
              <Typography.Paragraph style={{ margin: '8px 0 0' }}>
                {file ? file.name : t('submitModal.uploadHint')}
              </Typography.Paragraph>
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>
          </Form.Item>
          {errorMsg && <Alert type="error" message={errorMsg} showIcon />}
        </Form>
      )}
    </Modal>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/student/assignments/SubmitAssignmentModal.tsx
git commit -m "feat(student): add SubmitAssignmentModal with presigned URL upload"
```

---

## Task 6: StudentAssignmentDetailPage

**Files:**
- Create: `src/features/student/assignments/StudentAssignmentDetailPage.tsx`

- [ ] **Step 1: Tạo `src/features/student/assignments/StudentAssignmentDetailPage.tsx`**

```tsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  Button, Card, Col, Collapse, Descriptions, Empty,
  Result, Row, Space, Spin, Tag, Typography,
} from 'antd'
import {
  ArrowLeftOutlined, CheckCircleOutlined, ClockCircleOutlined,
  CodeOutlined, HistoryOutlined, RobotOutlined, UploadOutlined,
} from '@ant-design/icons'
import { useStudentAssignment } from './useStudentAssignment'
import { SubmitAssignmentModal } from './SubmitAssignmentModal'
import { useApiErrorMessage } from '../../../shared/api/errors'
import { colors } from '../../../shared/theme/tokens'

export function StudentAssignmentDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const toMessage = useApiErrorMessage()
  const { assignment, plans, images, loading, error, reload } = useStudentAssignment(id ?? '')
  const [submitOpen, setSubmitOpen] = useState(false)

  useEffect(() => {
    if (searchParams.get('submit') === '1') {
      setSubmitOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}><Spin size="large" /></div>
  }
  if (error) {
    return (
      <Result status="error" title={t('assignments.detailLoadFailed')} subTitle={toMessage(error)}
        extra={<Space><Button onClick={reload}>{t('common.retry')}</Button><Button onClick={() => navigate('/student/assignments')}>{t('assignments.back')}</Button></Space>}
      />
    )
  }
  if (!assignment) return <Result status="404" title={t('assignments.notFound')} />

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={24}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/student/assignments')}>
            {t('assignments.back')}
          </Button>
          <Typography.Title level={4} style={{ margin: 0 }}>{assignment.title}</Typography.Title>
          <Tag color={assignment.published ? colors.success : colors.neutral}>
            {assignment.published ? t('assignments.published') : t('assignments.unpublished')}
          </Tag>
        </div>
        <Space>
          <Button icon={<HistoryOutlined />} onClick={() => navigate('/student/submissions')}>
            {t('assignments.viewSubmissions')}
          </Button>
          <Button type="primary" icon={<UploadOutlined />}
            style={{ background: colors.primary, borderColor: colors.primary }}
            onClick={() => setSubmitOpen(true)}
          >
            {t('assignments.submit')}
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title={<Space><CodeOutlined style={{ color: colors.primary }} />{t('assignments.description')}</Space>} style={{ borderColor: colors.border }}>
            {assignment.description
              ? <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{assignment.description}</Typography.Paragraph>
              : <Typography.Text type="secondary">{t('assignments.noDescription')}</Typography.Text>
            }
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title={<Space><ClockCircleOutlined style={{ color: colors.primary }} />{t('assignments.details')}</Space>} style={{ borderColor: colors.border }}>
            <Descriptions column={1} size="small">
              {assignment.executionTimeoutMs && <Descriptions.Item label="Execution timeout">{assignment.executionTimeoutMs} ms</Descriptions.Item>}
              {assignment.startupTimeoutMs && <Descriptions.Item label="Startup timeout">{assignment.startupTimeoutMs} ms</Descriptions.Item>}
              {assignment.maxMemoryMb && <Descriptions.Item label="Max memory">{assignment.maxMemoryMb} MB</Descriptions.Item>}
              {assignment.maxCpu && <Descriptions.Item label="Max CPU">{assignment.maxCpu} cores</Descriptions.Item>}
              {assignment.dockerComposePort && <Descriptions.Item label="Port">{assignment.dockerComposePort}</Descriptions.Item>}
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Card title={<Space><CheckCircleOutlined style={{ color: colors.primary }} />{t('assignments.testPlans')}</Space>} style={{ borderColor: colors.border }}>
        {plans.length === 0 ? <Empty description={t('assignments.noPlans')} /> : (
          <Collapse items={plans.map((plan) => ({
            key: plan.id,
            label: (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span>{plan.name}</span>
                <Tag color={colors.info}>{t('assignments.planWeight', { weight: plan.weight })}</Tag>
                <Tag>{t('assignments.planSteps', { count: plan.steps.length })}</Tag>
              </div>
            ),
            children: plan.description ? <Typography.Text type="secondary">{plan.description}</Typography.Text> : null,
          }))} />
        )}
      </Card>

      {images.length > 0 && (
        <Card title={<Space><RobotOutlined style={{ color: colors.primary }} />{t('assignments.dockerImages')}</Space>} style={{ borderColor: colors.border }}>
          <Space wrap>
            {images.map((img) => <Tag key={img.id} style={{ padding: '4px 12px' }}>{img.name}:{img.tag}</Tag>)}
          </Space>
        </Card>
      )}

      <SubmitAssignmentModal
        assignmentId={assignment.id}
        plans={plans}
        images={images}
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onSuccess={(submissionId) => navigate(`/student/submissions/${submissionId}/results`)}
      />
    </Space>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/student/assignments/StudentAssignmentDetailPage.tsx
git commit -m "feat(student): add StudentAssignmentDetailPage"
```

---

## Task 7: MySubmissionsPage + SubmissionResultPage

**Files:**
- Create: `src/features/student/submissions/useMySubmissions.ts`
- Create: `src/features/student/submissions/MySubmissionsPage.tsx`
- Create: `src/features/student/results/useSubmissionResult.ts`
- Create: `src/features/student/results/SubmissionResultPage.tsx`

- [ ] **Step 1: Tạo `src/features/student/submissions/useMySubmissions.ts`**

```typescript
import { useCallback } from 'react'
import { listMySubmissions } from '../../../shared/api/endpoints/submissions'
import type { SubmissionResponse } from '../../../shared/types/submission'
import { useList } from '../../../shared/hooks/useList'
import type { UseListResult } from '../../../shared/hooks/useList'

export function useMySubmissions(): UseListResult<SubmissionResponse, Record<string, never>> {
  const fetcher = useCallback(
    ({ page, size }: { page: number; size: number }) => listMySubmissions(page, size),
    [],
  )
  return useList<SubmissionResponse, Record<string, never>>({ fetcher, filters: {}, pageSize: 20 })
}
```

- [ ] **Step 2: Tạo `src/features/student/submissions/MySubmissionsPage.tsx`**

```tsx
import { Badge, Button, Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import type { TableColumnsType } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import { ListPage } from '../../../shared/ui/ListPage'
import { listMySubmissions } from '../../../shared/api/endpoints/submissions'
import type { SubmissionResponse, SubmissionStatus } from '../../../shared/types/submission'
import { colors } from '../../../shared/theme/tokens'
import { useCallback } from 'react'

function statusColor(status: SubmissionStatus): string {
  const map: Record<SubmissionStatus, string> = {
    GRADED: colors.success,
    GRADING: colors.info,
    FAILED: colors.error,
    QUEUED: colors.warning,
    UPLOADED: colors.info,
    PENDING: colors.neutral,
  }
  return map[status] ?? colors.neutral
}

export function MySubmissionsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const fetcher = useCallback(
    ({ page, size }: { page: number; size: number }) => listMySubmissions(page, size),
    [],
  )

  const columns: TableColumnsType<SubmissionResponse> = [
    { title: t('submission.fileName'), dataIndex: 'zipFileName', key: 'zipFileName' },
    {
      title: t('submission.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: SubmissionStatus, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Tag color={statusColor(status)}>{t(`submission.status${status}`)}</Tag>
          {record.latest && <Badge color={colors.success} text={t('submission.latest')} />}
        </div>
      ),
    },
    {
      title: t('submission.submittedAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string | null) => (v ? new Date(v).toLocaleString('vi-VN') : '—'),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/student/submissions/${record.id}/results`)}
          disabled={record.status !== 'GRADED'}
        >
          {t('submission.viewResult')}
        </Button>
      ),
    },
  ]

  return (
    <ListPage<SubmissionResponse, Record<string, never>>
      fetcher={fetcher}
      filters={[]}
      initialFilters={{}}
      columns={columns}
      rowKey="id"
      headerTitle={t('submission.title')}
      emptyTitle={t('submission.empty')}
      emptyHint={t('submission.emptyHint')}
      showTotal={(total) => t('submission.total', { total })}
    />
  )
}
```

- [ ] **Step 3: Tạo `src/features/student/results/useSubmissionResult.ts`**

```typescript
import { isCancel } from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getResultsBySubmission } from '../../../shared/api/endpoints/results'
import type { ResultResponse } from '../../../shared/types/result'

const POLL_INTERVAL_MS = 3000

export interface SubmissionResultState {
  results: ResultResponse[]
  loading: boolean
  error: unknown
  isReady: boolean
}

export function useSubmissionResult(submissionId: string): SubmissionResultState {
  const [results, setResults] = useState<ResultResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasResultRef = useRef(false)

  const fetch = useCallback(
    (controller: AbortController) => {
      getResultsBySubmission(submissionId, { signal: controller.signal })
        .then((data) => {
          if (controller.signal.aborted) return
          setResults(data)
          setError(null)
          setLoading(false)
          if (data.length > 0) {
            hasResultRef.current = true
            if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
          }
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted || isCancel(err)) return
          setError(err)
          setLoading(false)
        })
    },
    [submissionId],
  )

  useEffect(() => {
    if (!submissionId) return
    const controller = new AbortController()
    hasResultRef.current = false
    fetch(controller)
    pollingRef.current = setInterval(() => { if (!hasResultRef.current) fetch(controller) }, POLL_INTERVAL_MS)
    return () => {
      controller.abort()
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [submissionId, fetch])

  return { results, loading, error, isReady: results.length > 0 }
}
```

- [ ] **Step 4: Tạo `src/features/student/results/SubmissionResultPage.tsx`**

```tsx
import { useParams, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Button, Card, Col, Result, Row, Spin, Statistic, Table, Tag, Typography, Space, Alert } from 'antd'
import { ArrowLeftOutlined, CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { useSubmissionResult } from './useSubmissionResult'
import { useApiErrorMessage } from '../../../shared/api/errors'
import { colors } from '../../../shared/theme/tokens'
import type { ResultResponse, StepResultResponse } from '../../../shared/types/result'

export function SubmissionResultPage() {
  const { t } = useTranslation()
  const { submissionId } = useParams<{ submissionId: string }>()
  const navigate = useNavigate()
  const toMessage = useApiErrorMessage()
  const { results, loading, error, isReady } = useSubmissionResult(submissionId ?? '')

  if (loading && !isReady) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}><Spin size="large" indicator={<LoadingOutlined style={{ fontSize: 40 }} spin />} /></div>
  }

  if (error) {
    return <Result status="error" title={t('result.loadFailed')} subTitle={toMessage(error)} extra={<Button onClick={() => navigate('/student/submissions')}>{t('result.backToSubmissions')}</Button>} />
  }

  if (!isReady) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Space direction="vertical" size={16}>
          <Spin size="large" indicator={<LoadingOutlined style={{ fontSize: 40 }} spin />} />
          <Typography.Title level={4}>{t('result.notReady')}</Typography.Title>
          <Typography.Text type="secondary">{t('result.notReadyHint')}</Typography.Text>
        </Space>
      </div>
    )
  }

  const totalScore = results.reduce((sum, r) => sum + r.score, 0)
  const totalMax = results.reduce((sum, r) => sum + r.maxScore, 0)

  const stepColumns: TableColumnsType<StepResultResponse> = [
    { title: t('result.stepName'), dataIndex: 'stepName', key: 'stepName' },
    { title: t('result.stepType'), dataIndex: 'stepType', key: 'stepType', width: 120 },
    {
      title: t('result.passed'), dataIndex: 'passed', key: 'passed', width: 90,
      render: (passed: boolean) => passed
        ? <CheckCircleOutlined style={{ color: colors.success, fontSize: 18 }} />
        : <CloseCircleOutlined style={{ color: colors.error, fontSize: 18 }} />,
    },
    { title: t('result.score'), key: 'score', width: 100, render: (_, r) => `${r.score}/${r.weight}` },
    { title: t('result.durationMs'), dataIndex: 'durationMs', key: 'durationMs', width: 120, render: (v: number | null) => v != null ? `${v} ms` : '—' },
    {
      title: t('result.errorMessage'), dataIndex: 'errorMessage', key: 'errorMessage',
      render: (v: string | null) => v ? <Typography.Text type="danger" style={{ fontSize: 12 }}>{v}</Typography.Text> : '—',
    },
  ]

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={24}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/student/submissions')}>
          {t('result.backToSubmissions')}
        </Button>
        <Typography.Title level={4} style={{ margin: 0 }}>{t('result.title')}</Typography.Title>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card style={{ borderColor: colors.border, textAlign: 'center' }}>
            <Statistic
              title={t('result.totalScore', { score: totalScore.toFixed(2), max: totalMax.toFixed(2) })}
              value={totalScore.toFixed(2)}
              suffix={`/ ${totalMax.toFixed(2)}`}
              valueStyle={{ color: totalScore / totalMax >= 0.5 ? colors.success : colors.error, fontSize: 32, fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {results.map((result: ResultResponse) => (
        <Card
          key={result.id}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span>{t('result.plan')}</span>
              <Tag color={colors.info}>{t('assignments.planWeight', { weight: result.planWeight })}</Tag>
              <Tag color={result.score >= result.maxScore * 0.5 ? 'green' : 'red'}>
                {result.score.toFixed(2)} / {result.maxScore.toFixed(2)}
              </Tag>
            </div>
          }
          style={{ borderColor: colors.border }}
        >
          {result.summaryLog && (
            <Alert
              type="info" message={t('result.summaryLog')}
              description={<Typography.Text code style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{result.summaryLog}</Typography.Text>}
              style={{ marginBottom: 16 }}
            />
          )}
          <Typography.Title level={5}>{t('result.steps')}</Typography.Title>
          <Table<StepResultResponse>
            rowKey="id" columns={stepColumns} dataSource={result.steps} pagination={false} size="small"
          />
        </Card>
      ))}
    </Space>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/features/student/submissions/ src/features/student/results/
git commit -m "feat(student): add MySubmissionsPage and SubmissionResultPage with polling"
```

---

## Task 8: Router + Sidebar Update

**Files:**
- Modify: `src/app/router.tsx`
- Modify: `src/shared/layout/AppLayout.tsx`

- [ ] **Step 1: Thay thế `src/app/router.tsx`**

```tsx
import { createBrowserRouter } from 'react-router'
import { RequireIdentity } from '../shared/auth/RequireIdentity'
import { RequireRole } from '../shared/auth/RequireRole'
import { AppLayout } from '../shared/layout/AppLayout'
import { ClassDetailPage } from '../features/classes/ClassDetailPage'
import { ClassesPage } from '../features/classes/ClassesPage'
import { LoginPage } from '../features/auth/LoginPage'
import { NoRolePage } from '../shared/auth/NoRolePage'
import { NotFoundPage } from '../features/NotFoundPage'
import { StudentClassesPage } from '../features/student/StudentClassesPage'
import { StudentAssignmentsPage } from '../features/student/assignments/StudentAssignmentsPage'
import { StudentAssignmentDetailPage } from '../features/student/assignments/StudentAssignmentDetailPage'
import { MySubmissionsPage } from '../features/student/submissions/MySubmissionsPage'
import { SubmissionResultPage } from '../features/student/results/SubmissionResultPage'
import { HomeRedirect } from './HomeRedirect'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireIdentity />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <HomeRedirect /> },
          { path: 'classes', element: <RequireRole role="LECTURER"><ClassesPage /></RequireRole> },
          { path: 'classes/:classId', element: <RequireRole role="LECTURER"><ClassDetailPage /></RequireRole> },
          { path: 'student/classes', element: <RequireRole role="STUDENT"><StudentClassesPage /></RequireRole> },
          { path: 'student/assignments', element: <RequireRole role="STUDENT"><StudentAssignmentsPage /></RequireRole> },
          { path: 'student/assignments/:id', element: <RequireRole role="STUDENT"><StudentAssignmentDetailPage /></RequireRole> },
          { path: 'student/submissions', element: <RequireRole role="STUDENT"><MySubmissionsPage /></RequireRole> },
          { path: 'student/submissions/:submissionId/results', element: <RequireRole role="STUDENT"><SubmissionResultPage /></RequireRole> },
          { path: 'no-role', element: <NoRolePage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
```

- [ ] **Step 2: Cập nhật `src/shared/layout/AppLayout.tsx`**

Thêm `HistoryOutlined` vào import icons (dòng 1):
```tsx
import { GlobalOutlined, HistoryOutlined, KeyOutlined, LeftOutlined, LogoutOutlined, ReadOutlined, RightOutlined, TeamOutlined } from '@ant-design/icons'
```

Thay thế phần tính `items` (tìm đoạn `const items = [`):
```tsx
  const items =
    identity.role === 'LECTURER'
      ? [{ key: '/classes', icon: <ReadOutlined />, label: t('nav.classes') }]
      : [
          { key: '/student/classes', icon: <TeamOutlined />, label: t('nav.studentClasses') },
          { key: '/student/assignments', icon: <ReadOutlined />, label: t('nav.studentAssignments') },
          { key: '/student/submissions', icon: <HistoryOutlined />, label: t('nav.studentMySubmissions') },
        ]
```

Thay thế dòng `const selectedKey`:
```tsx
  const selectedKey = items.find((item) => location.pathname.startsWith(item.key))?.key ?? ''
```

- [ ] **Step 3: Commit**

```bash
git add src/app/router.tsx src/shared/layout/AppLayout.tsx
git commit -m "feat(student): add student routes and update sidebar"
```

---

## Task 9: Verify Build

- [ ] **Step 1: Run i18n check**

```bash
cd D:\Project\DATN\web-grading-system-fe\web-grading-system-fe
npm run i18n:check
```

Expected: exit 0

- [ ] **Step 2: Run dev server**

```bash
npm run dev
```

Kiểm tra thủ công:
1. Đăng nhập STUDENT → sidebar có "Bài tập" + "Bài nộp của tôi"
2. `/student/assignments` load danh sách
3. Click bài tập → detail page hiển thị
4. Click "Nộp bài" → modal mở, chọn file .zip được
5. `/student/submissions` hiển thị danh sách

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(student): complete student portal"
```

---

## API Gaps — Đề xuất bổ sung backend

### 1. `GET /api/v1/student/assignments/{id}/my-latest-submission`
**Thêm vào:** `StudentAssignmentController` (course-service)  
**Mục đích:** Hiển thị status nộp bài mới nhất trong trang detail mà không cần sang trang submissions.  
**Response:** `SubmissionResponse | null`

### 2. `GET /api/v1/student/classes`  
**Thêm vào:** `StudentAssignmentController` hoặc class mới (course-service)  
**Mục đích:** Danh sách lớp sinh viên đang enrolled.  
**Response:** `Page<ClassResponse>`
