import type { FormRule } from 'antd'
import type { TFunction } from 'i18next'

/**
 * Shared `newPassword` rules mirroring the Keycloak realm policy
 * `length(8) and specialChars(1) and upperCase(1) and digits(1) and notUsername`.
 * `notUsername` cannot be evaluated in the browser — the realm enforces it server-side.
 * Imported by the voluntary `ChangePasswordModal` (Keycloak renders its own
 * UPDATE_PASSWORD page for the forced flow since Phase 3, D10).
 * Review: 2026-10-03, Phase 2 plan; 2026-10-04, Pullfrog (stale comment)
 */
export function newPasswordRules(t: TFunction): FormRule[] {
  return [
    { required: true, whitespace: true, message: t('auth.invalidField') },
    { min: 8, message: t('auth.passwordTooShort') },
    {
      // antd renders every failing rule's message, so this rule stays silent while the
      // length rule still applies — otherwise one bad password shows two stacked errors.
      validator: (_, value: string) => {
        if (!value || value.length < 8) return Promise.resolve()
        if (/[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value)) {
          return Promise.resolve()
        }
        return Promise.reject(new Error(t('auth.passwordTooWeak')))
      },
    },
  ]
}
