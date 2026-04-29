import { beforeEach, describe, expect, it, vi } from 'vitest'

let mockClient: {
  getOriginalUri: ReturnType<typeof vi.fn>
  storeTokensFromRedirect: ReturnType<typeof vi.fn>
  removeOriginalUri: ReturnType<typeof vi.fn>
  tokenManager: {
    getTokens: ReturnType<typeof vi.fn>
  }
  getUser: ReturnType<typeof vi.fn>
}

vi.mock('@okta/okta-auth-js', () => ({
  OktaAuth: vi.fn(() => mockClient),
}))

function setOktaEnv() {
  const env = import.meta.env as Record<string, string | undefined>
  env.VITE_OKTA_ISSUER = 'https://jeitto.okta.com/oauth2/default'
  env.VITE_OKTA_CLIENT_ID = 'client-id'
  env.VITE_OKTA_AUDIENCE = 'api://titlis'
  env.VITE_OKTA_REDIRECT_URI = 'http://localhost/login/callback'
  env.VITE_OKTA_POST_LOGOUT_REDIRECT_URI = 'http://localhost/login'
  env.VITE_OKTA_TENANT_SLUG = 'jeitto'
}

describe('okta auth helpers', () => {
  beforeEach(() => {
    vi.resetModules()
    setOktaEnv()
    window.history.replaceState({}, '', '/login/callback?code=abc&state=xyz')

    mockClient = {
      getOriginalUri: vi.fn(() => `${window.location.origin}/applications`),
      storeTokensFromRedirect: vi.fn().mockResolvedValue(undefined),
      removeOriginalUri: vi.fn(),
      tokenManager: {
        getTokens: vi.fn().mockResolvedValue({
          accessToken: {
            accessToken: 'access-token',
            expiresAt: Math.floor(Date.now() / 1000) + 3600,
          },
          idToken: {
            idToken: 'id-token',
          },
          refreshToken: {
            refreshToken: 'refresh-token',
          },
        }),
      },
      getUser: vi.fn(),
    }
  })

  it('usa a claim group para montar sessao admin', async () => {
    localStorage.setItem('titlis.auth.okta.pendingTenantSlug', 'jeitto')
    mockClient.getUser.mockResolvedValue({
      email: 'admin@jeitto.com',
      titlis_tenant_id: '42',
      group: ['Jeitto Confia - Admin'],
    })

    const { completeOktaLogin } = await import('@/lib/okta')
    const result = await completeOktaLogin(window.location.href)

    expect(result.returnPath).toBe('/applications')
    expect(result.session.provider).toBe('okta')
    expect(result.session.user.role).toBe('admin')
    expect(result.session.user.canRemediate).toBe(true)
    expect(result.session.user.tenantSlug).toBe('jeitto')
  })

  it('usa a claim groups para montar sessao viewer', async () => {
    mockClient.getUser.mockResolvedValue({
      email: 'viewer@jeitto.com',
      titlis_tenant_id: '42',
      groups: 'Jeitto Confia - Viewer',
    })

    const { completeOktaLogin } = await import('@/lib/okta')
    const result = await completeOktaLogin(window.location.href)

    expect(result.session.user.role).toBe('viewer')
    expect(result.session.user.canRemediate).toBe(false)
  })
})
