import { fireEvent, render, screen } from '@testing-library/react'
import type { ContextType } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '@/contexts/AuthContext'
import { Login } from '@/pages/Login'

function buildAuthContext(overrides?: Partial<ContextType<typeof AuthContext>>): ContextType<typeof AuthContext> {
  return {
    authMode: 'okta',
    status: 'anonymous',
    user: null,
    session: null,
    bootstrapStatus: {
      bootstrapRequired: false,
      localLoginEnabled: true,
      oktaConfigured: true,
      primaryProvider: 'okta',
    },
    hasOktaConfig: true,
    loginLocal: vi.fn(),
    loginWithOkta: vi.fn(),
    finishOktaLogin: vi.fn(),
    bootstrapSetup: vi.fn(),
    refreshSession: vi.fn(),
    signOut: vi.fn(),
    ...overrides,
  }
}

describe('Login page', () => {
  it('exibe a opcao de login com Okta quando a configuracao existe', () => {
    render(
      <AuthContext.Provider value={buildAuthContext()}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(screen.getByRole('button', { name: 'Entrar com Okta' })).toBeInTheDocument()
  })

  it('esconde a opcao de login com Okta quando o frontend nao foi configurado', () => {
    render(
      <AuthContext.Provider value={buildAuthContext({ hasOktaConfig: false })}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(screen.queryByRole('button', { name: 'Entrar com Okta' })).not.toBeInTheDocument()
  })

  it('inicia login com Okta sem exigir o tenant digitado na tela', () => {
    const loginWithOkta = vi.fn()

    render(
      <AuthContext.Provider value={buildAuthContext({ loginWithOkta })}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Entrar com Okta' }))

    expect(loginWithOkta).toHaveBeenCalledWith('/')
  })
})
