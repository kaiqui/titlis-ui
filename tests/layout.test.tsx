import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '@/contexts/AuthContext'
import { Layout } from '@/components/layout/Layout'

describe('Layout', () => {
  it('exibe banner quando o modo mock esta ativo', () => {
    render(
      <AuthContext.Provider
        value={{
          authMode: 'mock',
          status: 'authenticated',
          user: {
            id: 1,
            tenantId: 1,
            tenantSlug: 'dev-tenant-1',
            tenantName: 'Tenant 1',
            email: 'dev@titlis.local',
            displayName: 'Dev Bypass',
            role: 'admin',
            authProvider: 'dev_bypass',
            onboardingCompleted: true,
            canRemediate: true,
          },
          session: null,
          bootstrapStatus: {
            bootstrapRequired: false,
            localLoginEnabled: true,
            oktaConfigured: false,
            primaryProvider: 'mock',
          },
          hasOktaConfig: false,
          loginLocal: vi.fn(),
          loginWithOkta: vi.fn(),
          finishOktaLogin: vi.fn(),
          bootstrapSetup: vi.fn(),
          refreshSession: vi.fn(),
          signOut: vi.fn(),
        }}
      >
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<div>Conteudo</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(screen.getByText(/Modo de desenvolvimento ativo/i)).toBeInTheDocument()
    expect(screen.getByText(/dev@titlis.local/i)).toBeInTheDocument()
  })
})
