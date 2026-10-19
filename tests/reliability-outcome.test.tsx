import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReliabilityOutcome } from '@/components/sre/ReliabilityOutcome'
import { formatPct, routeLabel } from '@/lib/outcome'
import type { ApplicationOutcome } from '@/types'

function outcome(over: Partial<ApplicationOutcome> = {}): ApplicationOutcome {
  return {
    uid: 'service:bff-pix-payment', service: 'bff-pix-payment', team: 'core-banking', product: 'Pix 2.0',
    window: { from: '2026-09-09', to: '2026-10-08', days: 30 },
    objectives: { availabilityPct: 99.5, latencyPct: 99, latencyThresholdMs: 1000 },
    state: 'degraded', stateLabel: 'Degradado', reasons: ['1 rota(s) de entrada abaixo do objetivo'],
    result: { requests: 2_200_000, failures: 12_300, availabilityPct: 99.57, latencyPct: 99.44, availabilityBudgetConsumed: 0.87, latencyBudgetConsumed: 0.56, lastDay: '2026-10-08' },
    routes: [
      { resource: 'get_/cashout/keys/{key}', requests: 1_060_000, failures: 11_342, client4xx: 0, failurePct: 1.07, availabilityPct: 98.93, latencyPct: 99.0, p95MsWorstDay: 722, status: 'below_objective' },
      { resource: 'post_/cashout/transfers', requests: 1_140_000, failures: 1140, client4xx: 0, failurePct: 0.1, availabilityPct: 99.9, latencyPct: 99.6, p95MsWorstDay: 1380, status: 'ok' },
    ],
    daily: [],
    dependencies: {
      measured: true, isEntrypoint: true, upstreamCount: 0, probableCause: 'pix-management-service',
      downstream: [
        { target: 'pix-management-service', external: false, calls: 900_000, errorPct: 1.15, status: 'degraded', state: 'degraded' },
        { target: 'app.unleash.io', external: true, calls: 5000, errorPct: 0, status: 'ok', state: null },
      ],
    },
    posture: { trustScore: 71, confidence: 'alta', fragileDimensions: [] },
    actions: [{ code: 'OBS-019', severity: 'warning', message: '❌ SLO com definição inválida', dimension: 'observabilidade',
      evidence: [{ source: 'datadog.slo', locator: 'abc', detail: 'Jornada do PIX 2.0: CLIENT_ERRORS_AS_FAILURE', link: 'https://us5.datadoghq.com/slo?slo_id=abc' }] }],
    ...over,
  }
}

describe('ReliabilityOutcome — V-1', () => {
  it('mostra estado, rota que dói, causa provável e ação com evidência', () => {
    render(<ReliabilityOutcome outcome={outcome()} />)
    expect(screen.getByText('Degradado')).toBeInTheDocument()
    expect(screen.getByText('GET /cashout/keys/{key}')).toBeInTheDocument()
    expect(screen.getByText('fora do objetivo')).toBeInTheDocument()
    expect(screen.getByText('causa provável')).toBeInTheDocument()
    expect(screen.getByText('Ponto de entrada: nenhum serviço interno chama este.')).toBeInTheDocument()
    expect(screen.getByText('SLO com definição inválida')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver evidência/ })).toHaveAttribute('href', 'https://us5.datadoghq.com/slo?slo_id=abc')
  })

  it('"Não medido" explica que a postura não diz se o cliente foi atendido', () => {
    render(<ReliabilityOutcome outcome={outcome({ state: 'not_measured', stateLabel: 'Não medido', result: null, routes: [], actions: [] })} />)
    expect(screen.getByText('Não medido')).toBeInTheDocument()
    expect(screen.getByText(/Sem tráfego de entrada medido/)).toBeInTheDocument()
    expect(screen.queryByText(/Onde dói/)).not.toBeInTheDocument()
  })

  it('formatação pt-BR', () => {
    expect(formatPct(99.57)).toBe('99,57%')
    expect(formatPct(null)).toBe('N/D')
    expect(routeLabel('post_/a/b')).toBe('POST /a/b')
    expect(routeLabel('GrpcService.Method')).toBe('GrpcService.Method')
  })
})

describe('OutcomeMix — V-2', () => {
  it('lista os estados com serviço, pior primeiro, e a folha só o seu estado', async () => {
    const { OutcomeMix } = await import('@/components/sre/OutcomeMix')
    const { rerender } = render(<OutcomeMix mix={{ healthy: 10, at_risk: 0, degraded: 1, not_measured: 4 }} />)
    expect(screen.getByTestId('outcome-mix').textContent).toBe('Resultado:1 degradado10 saudáveis4 não medidos')
    rerender(<OutcomeMix mix={{ healthy: 0, at_risk: 1, degraded: 0, not_measured: 0 }} single="at_risk" />)
    expect(screen.getByTestId('outcome-mix').textContent).toBe('Resultado:em risco')
  })
})

describe('TeamReport — V-3', () => {
  it('mostra dados insuficientes, conflito de dono e rota recorrente', async () => {
    const { vi } = await import('vitest')
    vi.resetModules()
    vi.doMock('@/hooks/useApi', () => ({
      useTeamReport: () => ({
        isLoading: false, isError: false, refetch: () => {},
        data: {
          team: 'core-banking', generatedAt: '2026-10-09T00:00:00Z',
          window: { from: '2026-09-09', to: '2026-10-08', days: 30 }, previousWindow: { from: '2026-08-10', to: '2026-09-08', days: 30 },
          objectives: { availabilityPct: 99.5, latencyPct: 99, latencyThresholdMs: 1000 }, dataStatus: 'insufficient_data',
          indicators: { journeyAttainment: null, worstJourney: null, weightedRisk: 0.0123, postureWeighted: 65, postureWorst: 50, coveragePct: 33, measuredServices: 1, totalServices: 3 },
          services: [{
            service: 'bff', uid: 'service:bff', product: 'Pix 2.0', tier: '1', ownership: 'conflict', conflictWith: 'platform',
            state: 'degraded', stateLabel: 'Degradado', availabilityPct: 98, previousAvailabilityPct: 97, latencyPct: null, budgetConsumed: 4,
            trustScore: 70, previousTrustScore: 65, slos: { valid: 1, invalid: 2 }, routesBelowObjective: ['get_/keys'], recurringRoutes: ['get_/keys'], topFinding: null,
          }],
          journeysOwned: [], journeysDependingOnTeam: [], slos: { valid: 1, invalid: 2 },
          findings: [{ service: 'bff', code: 'OBS-019', severity: 'warning', message: 'SLO inválido', priority: 'P0' }],
          recurring: [{ service: 'bff', resource: 'get_/keys' }], recommendations: ['Corrigir a definição de 2 SLO(s).'],
        },
      }),
    }))
    const { MemoryRouter, Route, Routes } = await import('react-router-dom')
    const { ThemeProvider } = await import('@/contexts/ThemeContext')
    const { TeamReport } = await import('@/pages/TeamReport')
    vi.doMock('@/components/layout/Header', () => ({ Header: ({ title }: { title: string }) => <h2>{title}</h2> }))
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/teams/core-banking']}>
          <Routes><Route path="/teams/:team" element={<TeamReport />} /></Routes>
        </MemoryRouter>
      </ThemeProvider>,
    )
    expect(screen.getByText(/Dados insuficientes/)).toBeInTheDocument()
    expect(screen.getByText(/dono em conflito com platform/)).toBeInTheDocument()
    expect(screen.getByText('· recorrente')).toBeInTheDocument()
    expect(screen.getByText('P0')).toBeInTheDocument()
  })
})

describe('ReliabilityOutcome — impacto no cliente (J-4)', () => {
  it('lista as jornadas afetadas com nível e elo responsável', async () => {
    const { MemoryRouter } = await import('react-router-dom')
    render(
      <MemoryRouter>
        <ReliabilityOutcome outcome={outcome({ impact: [{ key: 'pix', name: 'Pix 2.0 — envio', tier: 'T0', level: 'confirmed', levelLabel: 'Confirmado', reasons: [], failedRequests: 9730, responsibleLink: 'bff-pix-payment', isResponsible: true }] })} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Impacto no cliente')).toBeInTheDocument()
    expect(screen.getByText('CONFIRMADO')).toBeInTheDocument()
    expect(screen.getByText('este serviço é o elo responsável')).toBeInTheDocument()
  })
})
