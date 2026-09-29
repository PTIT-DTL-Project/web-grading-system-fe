"use client"

import { Alert, Button, Form, InputNumber, Modal, Select, Space, Tooltip, Typography, message } from 'antd'
import { QuestionCircleOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { useApiErrorMessage } from '../../../shared/api/errors'
import { colors } from '../../../shared/theme/tokens'
import { useScoreComponents } from '../useScoreComponents'
import type { ScoreComponentType } from '../../../shared/types/score'
import type { ScoreComponentResponse } from '../../../shared/types/score'

interface ScoreComponentsTabProps {
  classId: string
  archived?: boolean
  refreshToken?: number
  onSaved?: () => void
}

export function ScoreComponentsTab({ classId, archived = false, refreshToken, onSaved }: ScoreComponentsTabProps) {
  const { t } = useTranslation()
  const toMessage = useApiErrorMessage()
  const { rows, loading, error, reload, save } = useScoreComponents(classId)
  const [draftRows, setDraftRows] = useState<ScoreComponentResponse[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [addType, setAddType] = useState<ScoreComponentType | null>(null)
  const [addWeight, setAddWeight] = useState<number>(0.1)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading) {
      setDraftRows(rows)
    }
  }, [loading, rows])

  useEffect(() => {
    if (refreshToken !== undefined && refreshToken > 0) {
      reload()
    }
  }, [refreshToken, reload])

  const availableTypes = (used: ScoreComponentType[]): ScoreComponentType[] => {
    const all: ScoreComponentType[] = ['ATTENDANCE', 'EXERCISE', 'FINAL_EXAM', 'ASSIGNMENT']
    return all.filter(type => !used.includes(type))
  }

  const handleAdd = () => {
    setAddType(null)
    setAddWeight(0.1)
    setAddOpen(true)
  }

  const handleCreate = () => {
    if (!addType) {
      message.warning(t('components.allTypesUsed'))
      return
    }
    const newRow: ScoreComponentResponse = { type: addType, weight: Number(addWeight) }
    setDraftRows([...draftRows, newRow])
    message.success(t('components.created'))
    setAddOpen(false)
  }

  const handleWeightChange = (type: ScoreComponentType, weight: number | null) => {
    setDraftRows(draftRows.map(r => r.type === type ? { ...r, weight: weight !== null ? Number(weight) : 0.1 } : r))
  }

  const handleDelete = (type: ScoreComponentType) => {
    setDraftRows(draftRows.filter(r => r.type !== type))
  }

  const validateDraft = (): string | null => {
    const finalExam = draftRows.find(r => r.type === 'FINAL_EXAM')
    if (!finalExam) {
      return t('components.validation.finalExamRequired')
    }
    if (finalExam.weight !== undefined && finalExam.weight < 0.4) {
      return t('components.validation.finalExamWeight', { weight: 0.4 })
    }
    const sum = draftRows.reduce((s, r) => s + r.weight, 0)
    if (Math.abs(sum - 1) > 0.001) {
      return t('components.validation.sumNotOne', { sum: sum.toFixed(3) })
    }
    for (const row of draftRows) {
      if (row.weight < 0.001 || row.weight > 1) {
        return t('components.validation.weightRange')
      }
    }
    return null
  }

  const handleSave = async () => {
    const clientError = validateDraft()
    if (clientError) {
      message.error(clientError)
      return
    }
    setSubmitting(true)
    try {
      await save(draftRows)
      message.success(t('components.saved'))
      onSaved?.()
    } catch (err) {
      message.error(toMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const usedTypes = draftRows.map(r => r.type)
  const types = availableTypes(usedTypes)
  const hasError = Boolean(error)
  const sum = draftRows.reduce((s, r) => s + r.weight, 0)
  const sumValid = draftRows.length > 0 && Math.abs(sum - 1) <= 0.001

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={24}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>{t('components.title')}</Typography.Title>
      </div>

      {hasError && (
        <Alert type="error" showIcon message={t('components.loadFailed')} description={error instanceof Error ? error.message : String(error)} action={<Button onClick={reload}>{t('common.retry')}</Button>} style={{ marginBottom: 16 }} />
      )}

      {!loading && !hasError && draftRows.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, background: colors.surface, borderRadius: 8, border: `1px solid ${colors.border}` }}>
          <Typography.Text type="secondary">{t('components.empty')}</Typography.Text>
          <div style={{ marginTop: 16 }}>
            <Button type="primary" onClick={handleAdd} disabled={archived}>
              {t('components.addFirst')}
            </Button>
          </div>
        </div>
      )}

      {!loading && !hasError && draftRows.length > 0 && (
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          {draftRows.map((row) => (
            <Space key={row.type} align="center" style={{ width: '100%', justifyContent: 'space-between', padding: 16, background: colors.surface, borderRadius: 8, border: `1px solid ${colors.border}` }}>
              <Typography.Text style={{ minWidth: 160 }}>
                {t(`components.typeLabel.${row.type}`)}
                {row.type === 'EXERCISE' && (
                  <Tooltip title={t('components.autoGraded')} placement="top">
                    <QuestionCircleOutlined style={{ marginLeft: 4, color: '#8c8c8c', fontSize: 14, cursor: 'help' }} />
                  </Tooltip>
                )}
              </Typography.Text>
              <InputNumber
                min={0.001}
                max={1}
                step={0.001}
                value={row.weight}
                onChange={(v) => handleWeightChange(row.type, v === null ? null : Number(v))}
                disabled={archived}
                style={{ width: 120 }}
              />
              <Typography.Text type="secondary">{t('components.weightPercent', { weight: (row.weight * 100).toFixed(0) })}</Typography.Text>
              <Button type="text" danger onClick={() => handleDelete(row.type)} disabled={archived}>
                {t('common.delete')}
              </Button>
            </Space>
          ))}
          <div style={{ marginTop: 16, padding: 16, background: colors.surface, borderRadius: 8, border: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button onClick={handleAdd} disabled={archived || types.length === 0}>
              {t('components.add')}
            </Button>
            <Space>
              <Typography.Text type={sumValid ? undefined : 'danger'} style={{ color: sumValid ? colors.success : colors.error }}>
                {t('components.totalWeight', { sum: sum.toFixed(3) })}
              </Typography.Text>
              <Button type="primary" onClick={handleSave} disabled={archived || !draftRows.length} loading={submitting}>
                {t('common.save')}
              </Button>
            </Space>
          </div>
        </Space>
      )}

      <Modal
        open={addOpen}
        title={t('components.addTitle')}
        okText={t('components.create')}
        cancelText={t('common.cancel')}
        confirmLoading={submitting}
        onOk={handleCreate}
        onCancel={() => setAddOpen(false)}
      >
        <Form layout="vertical" requiredMark={false}>
          <Form.Item label={t('components.type')} required>
            <Select
              placeholder={t('components.type')}
              value={addType}
              onChange={(v) => setAddType(v)}
              options={types.map((type) => ({
                label: t(`components.typeLabel.${type}`),
                value: type,
              }))}
            />
          </Form.Item>
          <Form.Item label={t('components.weight')} required>
            <InputNumber
              min={0.001}
              max={1}
              step={0.001}
              value={addWeight}
              onChange={(v) => setAddWeight(v ?? 0.1)}
              style={{ width: '100%' }}
              placeholder={t('components.weightPlaceholder')}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}
