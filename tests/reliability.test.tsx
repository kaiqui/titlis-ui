import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { useReliabilityTree, useReliabilityTrend, useServiceFindings } from '@/hooks/useApi'
import { Reliability } from '@/pages/Reliability'
import type { ReliabilityFinding, ReliabilityNode } from '@/types'

vi.mock('@/hooks/useApi', () => ({
  useReliabilityTree: vi.fn(),
  useReliabilityTrend: vi.fn(),
  useServiceFindings: vi.fn(),
}))

const mockedTree = vi.mocked(useReliabilityTree)
const mockedTrend = vi.mocked(useReliabilityTrend)
const mockedFindings = vi.mocked(useServiceFindings)

function n(p: Partial<ReliabilityNode> & { path: string; kind: string; name: string }): ReliabilityNode {
  return {
    ri: 80, debt: 0, weight: 1, coverage: 1, scoredLeaves: 1, totalLeaves: 1,
    criticalBreach: false, hasChildren: false, children: [], ...p,
  }
}

// checkout (débito 310, com team-pag/orders-api crítico) e onboarding (team-pag em 2 produtos = DAG)
const TREE: ReliabilityNode = n({
  path: '', kind: 'estate', name: 'Estate', ri: 67, debt: 330, weight: 10, hasChildren: true,
  children: [
    n({
      path: 'checkout', kind: 'product', name: 'checkout', ri: 61, debt: 310, weight: 8, criticalBreach: true, hasChildren: true,
      children: [
        n({
          path: 'checkout/team-pag', kind: 'team', name: 'team-pag', ri: 55, debt: 270, weight: 6, criticalBreach: true, hasChildren: true,
          children: [n({ path: 'checkout/team-pag/10', kind: 'service', name: 'orders-api', ri: 55, debt: 270, weight: 6, criticalBreach: true, hasChildren: true })],
        }),
        n({
          path: 'checkout/team-led', kind: 'team', name: 'team-led', ri: 80, debt: 40, weight: 2, hasChildren: true,
          children: [n({ path: 'checkout/team-led/20', kind: 'service', name: 'ledger', ri: 80, debt: 40, weight: 2, hasChildren: true })],
        }),
      ],
    }),
    n({
      path: 'onboarding', kind: 'product', name: 'onboarding', ri: 90, debt: 20, weight: 2, hasChildren: true,
      children: [
        n({
          path: 'onboarding/team-pag', kind: 'team', name: 'team-pag', ri: 90, debt: 20, weight: 2, hasChildren: true,
          children: [n({ path: 'onboarding/team-pag/30', kind: 'service', name: 'signup', ri: 90, debt: 20, weight: 2, hasChildren: true })],
        }),
      ],
    }),
  ],
})

const FINDINGS: ReliabilityFinding[] = [
  { leafKind: 'workload', leafName: 'orders-api', workloadUid: 'uid-orders', ruleId: 'SEC-003', pillar: 'SECURITY', severity: 'CRITICAL', message: 'sem network policy', actualValue: 'none', debt: 120, riGainService: 20, remediable: true },
  { leafKind: 'queue', leafName: 'orders-events-sub', workloadUid: null, ruleId: 'QS-001', pillar: 'OPERATIONAL', severity: 'ERROR', message: 'backlog alto', actualValue: '999', debt: 90, riGainService: 15, remediable: false },
]

describe('Reliability page', () => {
  beforeEach(() => {
    mockedTree.mockReturnValue({ data: TREE, isLoading: false, error: null, refetch: vi.fn() } as ReturnType<typeof useReliabilityTree>)
    mockedTrend.mockReturnValue({
      data: [{ date: '2026-06-17', ri: 60 }, { date: '2026-06-18', ri: 55 }],
      isLoading: false, error: null, refetch: vi.fn(),
    } as ReturnType<typeof useReliabilityTrend>)
    mockedFindings.mockImplementation((id: string) => ({
      data: id === '10' ? FINDINGS : [],
      isLoading: false, error: null, refetch: vi.fn(),
    } as ReturnType<typeof useServiceFindings>))
  })

  it('faz drill-down de produto até findings, ranqueado por débito', async () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <Reliability />
        </MemoryRouter>
      </ThemeProvider>,
    )

    // nível produto: checkout (débito 310) antes de onboarding (20)
    const rows = screen.getAllByTestId('reliability-node-row')
    expect(rows[0]).toHaveTextContent('checkout')
    expect(rows[1]).toHaveTextContent('onboarding')

    // drill em checkout → times
    fireEvent.click(screen.getByRole('button', { name: /checkout/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /team-pag/i })).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /team-led/i })).toBeInTheDocument()

    // drill em team-pag → serviço
    fireEvent.click(screen.getByRole('button', { name: /team-pag/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /orders-api/i })).toBeInTheDocument())

    // drill no serviço → worklist de findings
    fireEvent.click(screen.getByRole('button', { name: /orders-api/i }))
    await waitFor(() => expect(screen.getByTestId('reliability-worklist')).toBeInTheDocument())
    expect(screen.getByText('SEC-003')).toBeInTheDocument()
    expect(screen.getByText('QS-001')).toBeInTheDocument()
    // finding de workload remediável tem "Corrigir com IA"; o de fila não
    expect(screen.getByTestId('reliability-remediate')).toBeInTheDocument()
  })

  it('mostra a sparkline de tendência no header', () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <Reliability />
        </MemoryRouter>
      </ThemeProvider>,
    )
    expect(screen.getByTestId('reliability-sparkline')).toBeInTheDocument()
  })

  it('navega de volta pelo breadcrumb', async () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <Reliability />
        </MemoryRouter>
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: /checkout/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /team-pag/i })).toBeInTheDocument())

    // breadcrumb tem "Todos os produtos" → volta para a raiz (produtos)
    fireEvent.click(screen.getByRole('button', { name: /Todos os produtos/i }))
    await waitFor(() => {
      const rows = screen.getAllByTestId('reliability-node-row')
      expect(rows[0]).toHaveTextContent('checkout')
      expect(rows[1]).toHaveTextContent('onboarding')
    })
  })
})
