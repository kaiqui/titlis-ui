import { describe, expect, it } from 'vitest'
import { isLikelyOidcEndpointUrl, resolvePrimaryRole } from '@/lib/auth'

describe('auth helpers', () => {
  it('mapeia o grupo Jeitto Confia - Admin como admin', () => {
    expect(resolvePrimaryRole(['Jeitto Confia - Admin'])).toBe('admin')
  })

  it('mapeia o grupo Jeitto Confia - Viewer como viewer', () => {
    expect(resolvePrimaryRole(['Jeitto Confia - Viewer'])).toBe('viewer')
  })

  it('rejeita issuer configurado com endpoint oauth final', () => {
    expect(isLikelyOidcEndpointUrl('https://jeitto.okta.com/oauth2/v1/authorize')).toBe(true)
    expect(isLikelyOidcEndpointUrl('https://jeitto.okta.com/oauth2/default')).toBe(false)
  })
})
