import { describe, expect, it } from 'vitest'
import { assertAuthEnv, validateAuthEnv } from '../scripts/auth-env-guard.mjs'

describe('auth env guard', () => {
  it('allows mock auth in local environment', () => {
    const result = validateAuthEnv({ appEnv: 'local', authMode: 'mock' })
    expect(result.ok).toBe(true)
    expect(result.code).toBe('ok')
  })

  it('blocks mock auth in protected environments', () => {
    const result = validateAuthEnv({ appEnv: 'dev', authMode: 'mock' })
    expect(result.ok).toBe(false)
    expect(result.code).toBe('mock_auth_not_allowed')
  })

  it('allows okta auth in protected environments', () => {
    const result = validateAuthEnv({ appEnv: 'prod', authMode: 'okta' })
    expect(result.ok).toBe(true)
  })

  it('throws when assert receives forbidden combination', () => {
    expect(() => assertAuthEnv({ appEnv: 'staging', authMode: 'mock' }))
      .toThrow(/VITE_AUTH_MODE=mock/)
  })
})
