import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { useDashboardWorkloads, useWorkloadRemediation, useWorkloadScorecard } from '@/hooks/useApi'
import { Applications } from '@/pages/Applications'
import type { RemediationDetail, WorkloadDetail, WorkloadSummary } from '@/types'

vi.mock('@/hooks/useApi', () => ({
  useDashboardWorkloads: vi.fn(),
  useWorkloadScorecard: vi.fn(),
  useWorkloadRemediation: vi.fn(),
}))

const mockedUseDashboardWorkloads = vi.mocked(useDashboardWorkloads)
const mockedUseWorkloadScorecard = vi.mocked(useWorkloadScorecard)
const mockedUseWorkloadRemediation = vi.mocked(useWorkloadRemediation)

const workloads: WorkloadSummary[] = [
  {
    id: 'payments-api',
    name: 'payments-api',
    cluster: 'cluster-a',
    environment: 'production',
    namespace: 'payments',
    overallScore: 71,
    complianceStatus: 'NON_COMPLIANT',
    remediationStatus: 'OPEN',
    githubPrUrl: null,
  },
  {
    id: 'catalog-worker',
    name: 'catalog-worker',
    cluster: 'cluster-b',
    environment: 'staging',
    namespace: 'catalog',
    overallScore: 96,
    complianceStatus: 'COMPLIANT',
    remediationStatus: null,
    githubPrUrl: null,
  },
]

const paymentDetail: WorkloadDetail = {
  ...workloads[0],
  kind: 'deployment',
  version: 4,
  evaluatedAt: '2026-03-31T10:00:00.000Z',
  totalRules: 12,
  passedRules: 8,
  failedRules: 4,
  criticalFailures: 1,
  errorCount: 2,
  warningCount: 1,
  pillarScores: [
    { pillar: 'security', score: 61, passedChecks: 2, failedChecks: 1, weightedScore: 18 },
  ],
  validationResults: [
    {
      ruleId: 'tls-enabled',
      ruleName: 'TLS habilitado',
      pillar: 'security',
      severity: 'critical',
      ruleType: 'policy',
      weight: 10,
      passed: false,
      message: 'Ingress sem TLS configurado.',
      actualValue: null,
      remediable: true,
      remediationCategory: 'security',
      evaluatedAt: '2026-03-31T10:00:00.000Z',
    },
  ],
}

const catalogDetail: WorkloadDetail = {
  ...workloads[1],
  kind: 'deployment',
  version: 2,
  evaluatedAt: '2026-03-31T09:00:00.000Z',
  totalRules: 10,
  passedRules: 10,
  failedRules: 0,
  criticalFailures: 0,
  errorCount: 0,
  warningCount: 0,
  pillarScores: [
    { pillar: 'resilience', score: 95, passedChecks: 4, failedChecks: 0, weightedScore: 30 },
  ],
  validationResults: [],
}

const remediation: RemediationDetail = {
  status: 'OPEN',
  version: 3,
  githubPrUrl: 'https://example.com/pr/101',
  githubPrNumber: 101,
  triggeredAt: '2026-03-31T10:10:00.000Z',
}

describe('Applications page', () => {
  beforeEach(() => {
    mockedUseDashboardWorkloads.mockReturnValue({
      data: workloads,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useDashboardWorkloads>)

    mockedUseWorkloadScorecard.mockImplementation((id: string) => ({
      data: id === 'catalog-worker' ? catalogDetail : paymentDetail,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useWorkloadScorecard>))

    mockedUseWorkloadRemediation.mockImplementation((id: string) => ({
      data: id === 'payments-api' ? remediation : null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useWorkloadRemediation>))
  })

  it('organiza a lista e mostra o detalhe inline do workload selecionado', async () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <Applications />
        </MemoryRouter>
      </ThemeProvider>,
    )

    expect(screen.getByText('Selecione um workload e abra só a camada de detalhe que precisar.')).toBeInTheDocument()
    expect(screen.getByText('Resumo do workload')).toBeInTheDocument()
    expect(screen.queryByText('catalog-worker')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Falhas/i }))

    await waitFor(() => {
      expect(screen.getByText('TLS habilitado')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Todos/i }))
    fireEvent.change(screen.getByPlaceholderText('Buscar por workload, namespace ou cluster'), {
      target: { value: 'catalog' },
    })

    await waitFor(() => {
      expect(screen.getAllByText('catalog-worker').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: /catalog-worker/i }))
    fireEvent.click(screen.getByRole('button', { name: /Falhas/i }))

    await waitFor(() => {
      expect(screen.getByText('Nenhuma falha ativa para este workload.')).toBeInTheDocument()
    })
  })
})
