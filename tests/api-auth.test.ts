import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'

describe('api auth headers', () => {
  beforeEach(() => {
    localStorage.clear()
    const env = import.meta.env as Record<string, string | undefined>
    env.VITE_AUTH_MODE = 'okta'
  })

  it('envia o tenant slug no header para sessao okta', async () => {
    localStorage.setItem('titlis.auth.session', JSON.stringify({
      provider: 'okta',
      accessToken: 'token',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user: {
        id: 1,
        tenantId: 0,
        tenantSlug: 'jeitto',
        tenantName: 'Jeitto',
        email: 'admin@jeitto.com',
        displayName: 'Admin',
        role: 'admin',
        authProvider: 'okta',
        onboardingCompleted: true,
        canRemediate: true,
      },
    }))

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ user: null }),
    }))

    await api.auth.me()

    expect(fetch).toHaveBeenCalledTimes(1)
    const [, options] = vi.mocked(fetch).mock.calls[0]
    expect(options?.headers).toMatchObject({
      Authorization: 'Bearer token',
      'X-Titlis-Tenant-Slug': 'jeitto',
    })
  })
})
