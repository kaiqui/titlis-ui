import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { parseStepsText } from '@/lib/journeys'
import type { Journey } from '@/types'

const journey = (o: Partial<Journey>): Journey => ({
  journeyKey: 'pix-envio', name: 'Pix 2.0 — envio', tier: 'T0', ownerTeam: 'core-banking', status: 'confirmed', source: 'declared',
  availabilityObjective: 99.5, latencyObjective: null, confidence: null, evidence: null, confirmedBy: 'a',
  steps: [
    { journeyStepId: 1, stepOrder: 1, serviceName: 'bff-pix-payment', resourceName: 'get_/cashout/keys/{key}', subscriptionId: null, kind: 'entry', latencyThresholdMs: null, required: true, drift: null, driftDetail: null },
    { journeyStepId: 2, stepOrder: 2, serviceName: 'pix-management-service', resourceName: null, subscriptionId: null, kind: 'sync', latencyThresholdMs: null, required: true, drift: 'new_dependency', driftDetail: 'depende de ledger' },
  ],
  ...o,
})

vi.mock('@/contexts/useAuth', () => ({ useAuth: () => ({ user: { role: 'admin' }, signOut: vi.fn() }) }))
vi.mock('@/components/layout/Header', () => ({ Header: ({ title }: { title: string }) => <h2>{title}</h2> }))
vi.mock('@/hooks/useApi', () => ({
  useJourneys: () => ({
    isLoading: false, isError: false, refetch: vi.fn(),
    data: [journey({}), journey({ journeyKey: 'fatura', name: 'Fatura 2.0 — pagamento', status: 'suggested', tier: null, confidence: 0.8 })],
  }),
  useJourneyImpact: () => ({
    data: { journeys: [{ key: 'pix-envio', level: 'confirmed', reasons: ['SLI abaixo do objetivo na rota de entrada da jornada'], evidence: [], failedRequests: 9730, responsibleLink: 'pix-management-service', pathServices: [] }] },
  }),
}))

describe('Journeys — J-1/J-3/J-4', () => {
  it('mostra impacto confirmado, elo responsável, drift e contagem por aba', async () => {
    const { Journeys } = await import('@/pages/Journeys')
    render(
      <ThemeProvider>
        <QueryClientProvider client={new QueryClient()}>
          <MemoryRouter><Journeys /></MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>,
    )
    expect(screen.getByText('Confirmadas (1)')).toBeInTheDocument()
    expect(screen.getByText('Sugeridas (1)')).toBeInTheDocument()
    expect(screen.getByText(/Impacto confirmado · 9\.730 requisições falharam/)).toBeInTheDocument()
    expect(screen.getByText('· elo responsável')).toBeInTheDocument()
    expect(screen.getByText('· nova dependência crítica')).toBeInTheDocument()
    expect(screen.getByText(/1 passo\(s\) não batem/)).toBeInTheDocument()
  })

  it('formulário: um passo por linha, 1º passo é entrada, async leva a fila', () => {
    expect(parseStepsText('bff | post_/tx | entry\npix-mgmt\nworker | pix-events-sub | async')).toEqual([
      { serviceName: 'bff', resourceName: 'post_/tx', kind: 'entry' },
      { serviceName: 'pix-mgmt', resourceName: null, kind: 'sync' },
      { serviceName: 'worker', subscriptionId: 'pix-events-sub', kind: 'async' },
    ])
  })
})
