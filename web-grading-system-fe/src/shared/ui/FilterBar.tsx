import { Button, Input, Select, Space, Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import type { ListFilters } from '../hooks/useList'

export interface FilterConfig<F extends ListFilters> {
  key: keyof F
  type: 'text' | 'select' | 'builder'
  label: string
  placeholder?: string
  options?: { label: string; value: string }[]
  submitOnEnter?: boolean
  fields?: {
    name: string
    label: string
    type: 'text' | 'select'
    options?: { label: string; value: string }[]
  }[]
}

interface FilterBarProps<F extends ListFilters> {
  filters: F
  onFilterChange: <K extends keyof F>(key: K, value: F[K]) => void
  config: FilterConfig<F>[]
  onSubmit?: () => void
  onClear?: () => void
  showActions?: boolean
}

interface FilterRule {
  field: string
  value: string
}

export function FilterBar<F extends ListFilters>({ filters, onFilterChange, config, onSubmit, onClear, showActions }: FilterBarProps<F>) {
  const { t } = useTranslation()
  const hasSubmitMode = config.some((c) => c.submitOnEnter || c.type === 'builder')

  return (
    <Space wrap style={{ marginBottom: 16 }}>
      {config.map(({ key, type, label, placeholder, options, submitOnEnter, fields }) => {
        if (type === 'builder' && fields) {
          const rules = Array.isArray(filters[key]) ? ((filters[key] as unknown) as FilterRule[]) : []
          const selectedField = fields.find((f) => f.name === rules[rules.length - 1]?.field)

          const handleAddRule = (fieldName: string) => {
            onFilterChange(key as keyof F, [...rules, { field: fieldName, value: '' }] as F[keyof F])
          }

          const handleRuleValueChange = (fieldName: string, value: string) => {
            const updated = rules.map((r) => (r.field === fieldName ? { ...r, value } : r))
            onFilterChange(key as keyof F, updated as F[keyof F])
          }

          const handleRemoveRule = (fieldName: string) => {
            const updated = rules.filter((r) => r.field !== fieldName)
            onFilterChange(key as keyof F, updated as F[keyof F])
          }

          const handleSubmitRule = () => {
            onSubmit?.()
          }

          return (
            <Space key={String(key)} direction="vertical" style={{ width: '100%' }}>
              <Space wrap>
                {rules.map((rule) => {
                  const fieldConfig = fields.find((f) => f.name === rule.field)
                  if (!fieldConfig) return null
                  return (
                    <Tag
                      key={rule.field}
                      closable
                      onClose={() => handleRemoveRule(rule.field)}
                      style={{ marginRight: 4 }}
                    >
                      {fieldConfig.label}: {rule.value || <em style={{ opacity: 0.5 }}>...</em>}
                    </Tag>
                  )
                })}
              </Space>
              <Space>
                {rules.length < fields.length && (
                  <Select
                    placeholder={label}
                    value={selectedField?.name || undefined}
                    onChange={(val) => handleAddRule(val)}
                    options={fields
                      .filter((f) => !rules.some((r) => r.field === f.name))
                      .map((f) => ({
                        label: f.label,
                        value: f.name,
                      }))}
                    style={{ width: 180 }}
                    allowClear
                  />
                )}
                {selectedField && selectedField.type === 'text' && (
                  <Input
                    placeholder={selectedField.label}
                    value={rules.find((r) => r.field === selectedField.name)?.value || ''}
                    onChange={(e) => handleRuleValueChange(selectedField.name, e.target.value)}
                    onPressEnter={() => {
                      const val = rules.find((r) => r.field === selectedField.name)?.value
                      if (val) handleSubmitRule()
                    }}
                    style={{ width: 200 }}
                    allowClear
                  />
                )}
                {selectedField && selectedField.type === 'select' && selectedField.options && (
                  <Select
                    placeholder={selectedField.label}
                    value={rules.find((r) => r.field === selectedField.name)?.value || undefined}
                    onChange={(val) => {
                      handleRuleValueChange(selectedField.name, val)
                      handleSubmitRule()
                    }}
                    options={selectedField.options}
                    style={{ width: 180 }}
                    allowClear
                  />
                )}
              </Space>
            </Space>
          )
        }

        const value = (filters[key] as string | undefined) || ''
        if (type === 'text') {
          return (
            <Input
              key={String(key)}
              placeholder={placeholder || label}
              value={value}
              onChange={(e) => onFilterChange(key, e.target.value as F[typeof key])}
              onPressEnter={
                submitOnEnter || hasSubmitMode
                  ? () => {
                      if (value) onSubmit?.()
                    }
                  : undefined
              }
              style={{ width: 260 }}
              allowClear
            />
          )
        }
        if (type === 'select') {
          return (
            <Select
              key={String(key)}
              placeholder={placeholder || label}
              value={value || undefined}
              onChange={(val) => onFilterChange(key, val as F[typeof key])}
              options={options}
              style={{ width: 180 }}
              allowClear
            />
          )
        }
        return null
      })}
      {showActions && hasSubmitMode && (
        <Space>
          <Button type="primary" onClick={onSubmit}>
            {t('common.filter')}
          </Button>
          <Button onClick={onClear}>
            {t('common.clearFilters')}
          </Button>
        </Space>
      )}
    </Space>
  )
}
