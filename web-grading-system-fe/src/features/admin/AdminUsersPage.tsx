"use client"

import { Alert, App, Button, Space, Table, Typography, Upload } from 'antd'
import type { TableColumnsType } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { importUsers } from '../../shared/api/endpoints/admin'
import type { ImportRowResult, ImportSummary } from '../../shared/api/endpoints/admin'
import { useApiErrorMessage } from '../../shared/api/errors'
import { ErrorState } from '../../shared/ui/ErrorState'

const SAMPLE_CSV_URL = '/samples/users-import.csv'

const REASON_KEYS: Record<string, string> = {
  duplicate_username: 'admin.reasonDuplicateUsername',
  duplicate_email: 'admin.reasonDuplicateEmail',
  unknown_role: 'admin.reasonUnknownRole',
  not_enough_columns: 'admin.reasonNotEnoughColumns',
  blank_username_or_email: 'admin.reasonBlankUsernameOrEmail',
  invalid_input: 'admin.reasonInvalidInput',
  weak_password: 'admin.reasonWeakPassword',
  provider_error: 'admin.reasonProviderError',
  role_not_assigned: 'admin.reasonRoleNotAssigned',
}

export function AdminUsersPage() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const toMessage = useApiErrorMessage()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [summary, setSummary] = useState<ImportSummary | null>(null)

  // error is unknown (hook contract) — derive a boolean first; `{error && ...}`
  // does not typecheck under strict TS (skill §20).
  const hasError = Boolean(error)

  const reasonText = (reason: string | null): string => {
    if (!reason) return '—'
    const key = REASON_KEYS[reason]
    return key ? t(key) : reason
  }

  // Client-side mirrors of UserImportService.MAX_BYTES / MAX_ROWS: fail fast
  // without an upload. The server stays the source of truth — keep both sides
  // in sync when either changes.
  const MAX_BYTES = 2 * 1024 * 1024
  const MAX_ROWS = 2000

  // Mirrors the server header heuristic (ClassService.parseCsv discipline):
  // a leading row whose first column names the username field is not data.
  const isHeaderRow = (line: string): boolean => {
    const first = line.split(',')[0]?.trim().toLowerCase() ?? ''
    return first === 'username' || first === 'studentcode' || first === 'code'
  }

  const handleImport = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      message.error(t('students.importInvalidFile'))
      return
    }
    if (file.size > MAX_BYTES) {
      message.error(t('admin.fileTooLarge'))
      return
    }
    const text = await file.text()
    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '')
    const dataRows = lines.length > 0 && isHeaderRow(lines[0]) ? lines.length - 1 : lines.length
    if (dataRows > MAX_ROWS) {
      message.error(t('admin.tooManyRows'))
      return
    }
    setUploading(true)
    setError(null)
    try {
      const result = await importUsers(file)
      setSummary(result)
    } catch (err: unknown) {
      setError(err)
    } finally {
      setUploading(false)
    }
  }

  const failedColumns: TableColumnsType<ImportRowResult> = [
    { title: t('admin.colRow'), dataIndex: 'row', key: 'row', width: 80 },
    { title: t('admin.colUsername'), dataIndex: 'username', key: 'username', ellipsis: true },
    { title: t('admin.colRole'), dataIndex: 'role', key: 'role', width: 120 },
    {
      title: t('admin.colReason'),
      dataIndex: 'reason',
      key: 'reason',
      render: (reason: string | null) => reasonText(reason),
    },
  ]

  return (
    <Space orientation="vertical" style={{ width: '100%' }} size={24}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>{t('admin.title')}</Typography.Title>
        <Space size={12}>
          <Upload
            accept=".csv"
            showUploadList={false}
            customRequest={() => {}}
            maxCount={1}
            onChange={({ file }) => {
              if (file && file.originFileObj) {
                void handleImport(file.originFileObj)
              }
            }}
          >
            <Button loading={uploading}>
              {t('admin.import')}
            </Button>
          </Upload>
          <a href={SAMPLE_CSV_URL} download="users-import.csv" target="_blank" rel="noreferrer">
            {t('admin.downloadTemplate')}
          </a>
        </Space>
      </div>

      <Alert
        type="info"
        showIcon
        message={t('admin.hint')}
      />

      {hasError && (
        <ErrorState
          title={t('common.error')}
          message={toMessage(error) as string}
          onRetry={() => setError(null)}
        />
      )}

      {summary && (
        <Space orientation="vertical" style={{ width: '100%' }} size={16}>
          <Space size={24}>
            <Typography.Text>
              {t('admin.createdStudents')}: <strong>{summary.created.STUDENT ?? 0}</strong>
            </Typography.Text>
            <Typography.Text>
              {t('admin.createdLecturers')}: <strong>{summary.created.LECTURER ?? 0}</strong>
            </Typography.Text>
            <Typography.Text type="secondary">
              {t('admin.skipped')}: {summary.skipped}
            </Typography.Text>
          </Space>
          {summary.failed.length > 0 && (
            <>
              <Typography.Title level={5} style={{ margin: 0 }}>
                {t('admin.failedTitle')}
              </Typography.Title>
              <Table<ImportRowResult>
                rowKey={(row) => `${row.row}-${row.username}`}
                columns={failedColumns}
                dataSource={summary.failed}
                pagination={false}
                size="small"
              />
            </>
          )}
        </Space>
      )}
    </Space>
  )
}
