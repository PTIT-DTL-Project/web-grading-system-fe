import { useCallback, useMemo, useState } from 'react'
import type { StepType } from '../../shared/types/assignment'
import type { HttpFormValues, DbFormValues } from './stepBuilder'
import { buildHttpConfig, buildDbConfig, isGuidedType } from './stepBuilder'

export interface UseStepBuilderOptions {
  stepType?: StepType
  initialValues?: Record<string, any>
  onSave: (body: { config: unknown; expectedResult?: unknown; [key: string]: any }) => Promise<unknown>
  saving?: boolean
  availableVariables?: string[]
}

export function useStepBuilder({
  stepType,
  initialValues,
  onSave,
  saving = false,
  availableVariables = [],
}: UseStepBuilderOptions) {
  const [values, setValues] = useState<Record<string, any>>(initialValues ?? {})
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const guided = isGuidedType(stepType ?? 'HTTP_REQUEST')

  const setField = useCallback((name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }))
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }, [errors])

  const setValuesBatch = useCallback((batch: Record<string, any>) => {
    setValues((prev) => ({ ...prev, ...batch }))
  }, [])

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string[] | undefined> = {}
    let valid = true

    if (!values.name?.trim()) {
      newErrors.name = ['Tên bước là bắt buộc']
      valid = false
    }
    if (!guided && !values.configRaw) {
      newErrors.configRaw = ['Cấu hình JSON là bắt buộc']
      valid = false
    }
    if (guided && stepType === 'HTTP_REQUEST') {
      if (!values.httpPath?.trim() || !values.httpPath.startsWith('/')) {
        newErrors.httpPath = ['Đường dẫn phải bắt đầu bằng /']
        valid = false
      }
      if (values.assertions?.length === 0 && values.httpExpectedStatus == null) {
        // Warning only, not error — handled separately
      }
    }

    setErrors(newErrors)
    return valid
  }, [values, guided, stepType])

  const handleSave = useCallback(async () => {
    if (!validate()) return

    setSubmitError(null)
    try {
      let config: unknown
      let expectedResult: unknown

      if (guided && stepType === 'HTTP_REQUEST') {
        config = buildHttpConfig(values as HttpFormValues)
      } else if (guided && stepType === 'DB_QUERY') {
        const built = buildDbConfig(values as DbFormValues)
        config = built.config
        expectedResult = built.expectedResult
      } else if (guided && stepType === 'DB_SCHEMA_CHECK') {
        const built = buildDbConfig(values as DbFormValues)
        config = built.config
      } else if (guided && stepType === 'DB_MIGRATION') {
        const built = buildDbConfig(values as DbFormValues)
        config = built.config
      } else {
        config = parseJsonOrUndefined(values.configRaw)
        expectedResult = parseJsonOrUndefined(values.expectedRaw)
      }

      await onSave({
        ...values,
        config,
        expectedResult: expectedResult === undefined ? undefined : expectedResult,
      })
    } catch (err: any) {
      setSubmitError(err?.message ?? 'Lỗi không xác định khi lưu bước')
    }
  }, [values, guided, stepType, validate, onSave])

  const reset = useCallback(() => {
    setValues(initialValues ?? {})
    setErrors({})
    setSubmitError(null)
  }, [initialValues])

  const parsedConfig = useMemo(() => {
    if (!values.configRaw) return undefined
    try {
      return JSON.parse(values.configRaw)
    } catch {
      return null
    }
  }, [values.configRaw])

  return {
    values,
    setValues: setValuesBatch,
    setField,
    errors,
    submitError,
    guided,
    validate,
    handleSave,
    reset,
    saving,
    availableVariables,
    parsedConfig,
  }
}

function parseJsonOrUndefined(raw: unknown): unknown {
  if (raw === undefined || raw === null || (typeof raw === 'string' && !raw.trim())) return undefined
  if (typeof raw !== 'string') return raw
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}
