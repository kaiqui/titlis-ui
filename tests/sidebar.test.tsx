import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '@/contexts/AuthContext'
import { Sidebar } from '@/components/layout/Sidebar'

describe('Sidebar', () => {
  it('renderiza a navegação principal com a nova identidade Jeitto', () => {
    render(
      <AuthContext.Provider
        value={{
          authMode: 'okta',
          status: 'authenticated',
          user: {
            id: 1,
            tenantId: 1,
            tenantSlug: 'jeitto',
            tenantName: 'Jeitto',
            email: 'admin@jeitto.com',
            displayName: 'Admin',
            role: 'admin',
            authProvider: 'local',
            onboardingCompleted: false,
            canRemediate: true,
          },
          session: null,
          bootstrapStatus: null,
          hasOktaConfig: false,
          loginLocal: vi.fn(),
          loginWithOkta: vi.fn(),
          finishOktaLogin: vi.fn(),
          bootstrapSetup: vi.fn(),
          refreshSession: vi.fn(),
          signOut: vi.fn(),
        }}
      >
        <MemoryRouter initialEntries={['/applications']}>
          <Sidebar collapsed={false} onToggle={vi.fn()} />
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(screen.getByText('Titlis')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Workloads' })).toHaveAttribute('href', '/applications')
    expect(screen.getByRole('link', { name: 'Scorecards' })).toBeInTheDocument()
  })

  it('esconde o texto expandido quando o menu está recolhido', () => {
    render(
      <AuthContext.Provider
        value={{
          authMode: 'okta',
          status: 'authenticated',
          user: {
            id: 1,
            tenantId: 1,
            tenantSlug: 'jeitto',
            tenantName: 'Jeitto',
            email: 'admin@jeitto.com',
            displayName: 'Admin',
            role: 'admin',
            authProvider: 'local',
            onboardingCompleted: false,
            canRemediate: true,
          },
          session: null,
          bootstrapStatus: null,
          hasOktaConfig: false,
          loginLocal: vi.fn(),
          loginWithOkta: vi.fn(),
          finishOktaLogin: vi.fn(),
          bootstrapSetup: vi.fn(),
          refreshSession: vi.fn(),
          signOut: vi.fn(),
        }}
      >
        <MemoryRouter>
          <Sidebar collapsed onToggle={vi.fn()} />
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(screen.queryByText('Titlis')).not.toBeInTheDocument()
    expect(screen.getByTitle('Expandir menu')).toBeInTheDocument()
  })
})
