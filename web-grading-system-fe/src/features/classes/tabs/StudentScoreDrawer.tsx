"use client"

import { Button, Drawer, InputNumber, Space, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import { getStudentScores, setStudentScores } from '../../../shared/api/endpoints/classes'
import type { StudentScoreEntryResponse, ScoreComponentType } from '../../../shared/types/score'
import { useTranslation } from 'react-i18next'
import { colors } from '../../../shared/theme/tokens'
import { useApiErrorMessage } from '../../../shared/api/errors'

interface StudentScoreDrawerProps {
  classId: string
  studentCode: string
  studentName: string
  visible: boolean
  onClose: () => void
  onSave?: () => void
  entries?: StudentScoreEntryResponse[] // all component types
}

export function StudentScoreDrawer({ classId, studentCode, studentName, visible, onClose, onSave, entries = [] }: StudentScoreDrawerProps) {
  const { t } = useTranslation()
  const toMessage = useApiErrorMessage()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [scoreMap, setScoreMap] = useState<Record<ScoreComponentType, number | null>>(() => {
    const m: Record<ScoreComponentType, number | null> = {} as any
    entries.forEach(e => {
      if (e.type !== 'EXERCISE') m[e.type] = e.score
    })
    return m
  })

  useEffect(() => {
    if (!visible) return
    const controller = new AbortController()
    setLoading(true)
    getStudentScores(classId, studentCode, { signal: controller.signal })
      .then(data => {
        const m: Record<ScoreComponentType, number | null> = {} as any
        data.entries.forEach(e => {
          if (e.type !== 'EXERCISE') m[e.type] = e.score
        })
        setScoreMap(m)
        setError(null)
      })
      .catch(err => {
        setError(err)
      })
      .finally(() => {
        setLoading(false)
      })
    return () => controller.abort()
  }, [visible, classId, studentCode])

  const handleSave = async () => {
    const controller = new AbortController()
    setLoading(true)
    try {
      const payload = Object.entries(scoreMap)
        .filter(([_, v]) => v !== null && v !== undefined)
        .map(([k, v]) => ({ componentType: k as ScoreComponentType, score: Number(v) }))
      await setStudentScores(classId, studentCode, payload, { signal: controller.signal })
      message.success(t('scores.saved'))
      onSave?.()
      onClose()
    } catch (err) {
      message.error(toMessage(err))
    } finally {
      setLoading(false)
      controller.abort()
    }
  }

  const nonExerciseEntries = entries.filter(e => e.type !== 'EXERCISE')
  const hasData = nonExerciseEntries.length > 0
  const hasError = Boolean(error)

  return (
    <Drawer
      title={`${t('scores.title', { name: studentName }) || `Nhập điểm – ${studentName}`}`}
      placement="right"
      onClose={onClose}
      open={visible}
      width={480}
      destroyOnHidden
    >
      {loading && !hasData && (
        <div style={{ padding: 24, textAlign: 'center' }}>{t('common.loading')}</div>
      )}
      {hasError && !hasData && (
        <div style={{ padding: 24 }}>
          <Typography.Text type="danger">{toMessage(error)}</Typography.Text>
          <Button onClick={() => window.location.reload()} style={{ marginTop: 12 }} block>
            {t('common.retry')}
          </Button>
        </div>
      )}
      {!loading && !error && hasData && (
        <Space direction="vertical" style={{ width: '100%', padding: 24 }} size={16}>
          {nonExerciseEntries.map(entry => (
            <Space key={entry.type} align="baseline" style={{ width: '100%', justifyContent: 'space-between' }}>
            <Typography.Text style={{ minWidth: 120 }}>
              {entry.type === 'ATTENDANCE' && t('components.typeAttendance')}
              {entry.type === 'FINAL_EXAM' && t('components.typeFinalExam')}
              {entry.type === 'ASSIGNMENT' && t('components.typeAssignment')}
              {entry.type === 'EXERCISE' && t('components.typeExercise')}
              {' '}({entry.weight * 100}%)
            </Typography.Text>
            {entry.type === 'EXERCISE' ? (
              <Typography.Text type="secondary">
                {entry.score !== null && entry.score !== undefined ? entry.score : t('components.unavailable')}
                {entry.score !== null && entry.score !== undefined && <Typography.Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>({t('scores.autoNote')})</Typography.Text>}
              </Typography.Text>
            ) : (
              <InputNumber
                min={0}
                max={10}
                precision={2}
                value={scoreMap[entry.type as ScoreComponentType] ?? null}
                onChange={(v) => setScoreMap(m => ({ ...m, [entry.type]: v === null ? null : Number(v) }))}
                placeholder="—"
                style={{ width: 120 }}
                disabled={loading}
              />
            )}
          </Space>
          ))}
          <Space style={{ marginTop: 'auto', width: '100%' }}>
            <Button onClick={onClose} style={{ flex: 1 }}>{t('common.cancel')}</Button>
            <Button type="primary" loading={loading} onClick={handleSave} style={{ flex: 1 }}>{t('common.save')}</Button>
          </Space>
        </Space>
      )}
      {!loading && !error && !hasData && entries.length > 0 && (
        <div style={{ padding: 24, textAlign: 'center', color: colors.textOnPrimary }}>
          <Typography.Text>{t('scores.unavailable')}</Typography.Text>
        </div>
      )}
    </Drawer>
  )
}