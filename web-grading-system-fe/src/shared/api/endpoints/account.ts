import { sendData } from '../http'

/* ------------------------------------------------------------------ account */

export interface ChangePasswordRequest {
  username: string
  currentPassword: string
  newPassword: string
}

/** Gateway-owned password change — the browser never talks to Keycloak Admin. */
export function changePassword(body: ChangePasswordRequest): Promise<void> {
  return sendData<void, ChangePasswordRequest>('/api/v1/account/change-password', 'post', body)
}
