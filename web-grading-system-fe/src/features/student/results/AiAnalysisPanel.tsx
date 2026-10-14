import React from 'react'
import { Card, Tag, Typography, Alert, Space, Row, Col, Divider } from 'antd'
import {
  BulbOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  EnvironmentOutlined,
  BookOutlined,
  DashboardOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { AiExplanationResponse, StepAnalysis } from '../../../shared/types/ai'
import { colors } from '../../../shared/theme/tokens'

interface Props {
  data: AiExplanationResponse
}

export const AiAnalysisPanel: React.FC<Props> = ({ data }) => {
  const { t } = useTranslation()

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <Space>
            <BulbOutlined style={{ color: '#8B5CF6', fontSize: 20 }} />
            <Typography.Title level={5} style={{ margin: 0 }}>
              {t('ai.panelTitle')}
            </Typography.Title>
          </Space>
          {data.fromCache && (
            <Tag color="purple" style={{ margin: 0 }}>
              {t('ai.cachedBadge')}
            </Tag>
          )}
        </div>
      }
      style={{
        borderColor: '#C7D2FE',
        boxShadow: '0 4px 20px -2px rgba(99, 102, 241, 0.1)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
      headStyle={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.08))',
        borderBottom: '1px solid #E0E7FF',
      }}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {data.overallSummary && (
          <Alert
            message={data.overallSummary}
            type="info"
            showIcon
            style={{ borderRadius: 8, borderColor: '#BFDBFE', background: '#EFF6FF' }}
          />
        )}

        {data.stepAnalyses && data.stepAnalyses.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {data.stepAnalyses.map((step: StepAnalysis, index: number) => {
              const isFail = !step.passed || step.category === 'DEBUG_FAIL'

              return (
                <Card
                  key={step.stepId || index}
                  size="small"
                  style={{
                    borderRadius: 8,
                    borderColor: isFail ? '#FECACA' : '#BBF7D0',
                    background: isFail ? '#FFFBFB' : '#F8FCF9',
                  }}
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {step.passed ? (
                        <CheckCircleOutlined style={{ color: colors.success }} />
                      ) : (
                        <CloseCircleOutlined style={{ color: colors.error }} />
                      )}
                      <Typography.Text strong>{step.stepName}</Typography.Text>
                      <Tag color={isFail ? 'error' : 'success'}>
                        {isFail ? t('ai.debugFail') : t('ai.optimizePass')}
                      </Tag>
                    </div>
                  }
                >
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {/* Diagnosis */}
                    <div>
                      <Typography.Text type="secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 4 }}>
                        <SearchOutlined style={{ color: colors.info }} />
                        <strong>{t('ai.diagnosis')}:</strong>
                      </Typography.Text>
                      <Typography.Paragraph style={{ margin: 0, paddingLeft: 22 }}>
                        {step.diagnosis}
                      </Typography.Paragraph>
                    </div>

                    {/* Suspected Location */}
                    {step.suspectedLocation && (
                      <div>
                        <Typography.Text type="secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 4 }}>
                          <EnvironmentOutlined style={{ color: colors.warning }} />
                          <strong>{t('ai.suspectedLocation')}:</strong>
                        </Typography.Text>
                        <div style={{ paddingLeft: 22 }}>
                          <Typography.Text code copyable>
                            {step.suspectedLocation}
                          </Typography.Text>
                        </div>
                      </div>
                    )}

                    {/* Actionable Hints */}
                    {step.actionableHints && step.actionableHints.length > 0 && (
                      <div>
                        <Typography.Text type="secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 4 }}>
                          <BulbOutlined style={{ color: '#8B5CF6' }} />
                          <strong>{t('ai.actionableHints')}:</strong>
                        </Typography.Text>
                        <ol style={{ margin: '4px 0 0 22px', paddingLeft: 16 }}>
                          {step.actionableHints.map((hint, hIdx) => (
                            <li key={hIdx} style={{ marginBottom: 4 }}>
                              <Typography.Text>{hint}</Typography.Text>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Learning Keywords */}
                    {step.learningKeywords && step.learningKeywords.length > 0 && (
                      <div>
                        <Typography.Text type="secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 4 }}>
                          <BookOutlined style={{ color: '#0EA5E9' }} />
                          <strong>{t('ai.learningKeywords')}:</strong>
                        </Typography.Text>
                        <div style={{ paddingLeft: 22, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {step.learningKeywords.map((kw, kwIdx) => (
                            <Tag key={kwIdx} color="blue">
                              {kw}
                            </Tag>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Telemetry Audit */}
                    {step.telemetryAudit && (
                      <div>
                        <Divider style={{ margin: '8px 0' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <DashboardOutlined style={{ color: colors.info }} />
                          <Typography.Text strong style={{ fontSize: 13 }}>
                            {t('ai.telemetryAudit')}
                          </Typography.Text>
                        </div>
                        <Row gutter={[12, 8]} style={{ paddingLeft: 22 }}>
                          {step.telemetryAudit.durationMs != null && (
                            <Col xs={24} sm={12} md={8}>
                              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                {t('ai.duration', {
                                  ms: step.telemetryAudit.durationMs,
                                  threshold: step.telemetryAudit.expectedThresholdMs ?? 200,
                                })}
                              </Typography.Text>
                            </Col>
                          )}
                          {step.telemetryAudit.queryCount != null && (
                            <Col xs={24} sm={12} md={8}>
                              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                {t('ai.queryCount', { count: step.telemetryAudit.queryCount })}
                              </Typography.Text>
                            </Col>
                          )}
                          {step.telemetryAudit.peakMemoryMb != null && (
                            <Col xs={24} sm={12} md={8}>
                              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                {t('ai.peakMemory', { mb: step.telemetryAudit.peakMemoryMb })}
                              </Typography.Text>
                            </Col>
                          )}
                          {step.telemetryAudit.nPlusOneDetected && (
                            <Col xs={24}>
                              <Tag icon={<WarningOutlined />} color="warning">
                                {t('ai.nPlusOneWarning')}
                              </Tag>
                            </Col>
                          )}
                        </Row>
                      </div>
                    )}
                  </Space>
                </Card>
              )
            })}
          </div>
        )}
      </Space>
    </Card>
  )
}
