// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// keycloak-js is mocked so the test observes the init options and can simulate
// the third-party-cookie probe timing out without a real Keycloak server.
const state = vi.hoisted(() => ({
  initCalls: [] as Array<Record<string, unknown>>,
  outcomes: [] as Array<boolean | Error>,
}))

vi.mock('keycloak-js', () => {
  class KeycloakMock {
    authenticated = false
    token: string | undefined
    refreshToken: string | undefined
    tokenParsed: Record<string, unknown> | undefined

    init(options: Record<string, unknown>): Promise<boolean> {
      state.initCalls.push({ ...options })
      const outcome = state.outcomes.shift()
      if (outcome instanceof Error) return Promise.reject(outcome)
      this.authenticated = outcome ?? false
      return Promise.resolve(outcome ?? false)
    }
  }
  return { default: KeycloakMock }
})

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('VITE_KEYCLOAK_AUTHORITY', 'https://kc.example/realms/test')
  state.initCalls.length = 0
  state.outcomes.length = 0
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('initAuth third-party-cookie probe', () => {
  it('waits longer than the adapter default and retries without silent SSO on timeout', async () => {
    state.outcomes.push(
      new Error('Timeout when waiting for 3rd party check iframe message.'),
      false,
    )
    const { initAuth } = await import('./keycloak')

    await initAuth()

    expect(state.initCalls).toHaveLength(2)
    expect(state.initCalls[0].messageReceiveTimeout).toBe(15_000)
    expect(state.initCalls[0].silentCheckSsoRedirectUri).toBe(
      `${window.location.origin}/silent-check-sso.html`,
    )
    // The fallback must not configure silent SSO: with checkLoginIframe off and
    // no silentCheckSsoRedirectUri the adapter skips the probe and uses a
    // full-page prompt=none check instead, which works without 3P cookies.
    expect(state.initCalls[1].messageReceiveTimeout).toBe(15_000)
    expect(state.initCalls[1]).not.toHaveProperty('silentCheckSsoRedirectUri')
  })

  it('does not retry other init failures', async () => {
    state.outcomes.push(new Error('network down'))
    const { initAuth } = await import('./keycloak')

    await expect(initAuth()).rejects.toThrow('network down')

    expect(state.initCalls).toHaveLength(1)
  })
})
