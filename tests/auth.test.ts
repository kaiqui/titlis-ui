import { describe, expect, it } from 'vitest'
import {
  clearPendingOktaTenantSlug,
  getPendingOktaTenantSlug,
  isLikelyOidcEndpointUrl,
  normalizeTenantSlug,
  resolvePrimaryRole,
  writePendingOktaTenantSlug,
} from '@/lib/auth'

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

  it('normaliza e persiste o tenant slug pendente do login okta', () => {
    writePendingOktaTenantSlug(' Jeitto_Confia ')

    expect(normalizeTenantSlug(' Jeitto_Confia ')).toBe('jeitto-confia')
    expect(getPendingOktaTenantSlug()).toBe('jeitto-confia')

    clearPendingOktaTenantSlug()
    expect(getPendingOktaTenantSlug()).toBeNull()
  })
})
