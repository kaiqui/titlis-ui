import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { useHubRollup } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { Reliability } from '@/pages/Reliability'
import type { EstateNode } from '@/types'

vi.mock('@/hooks/useApi', () => ({ useHubRollup: vi.fn() }))
vi.mock('@/lib/api', () => ({ api: { hub: { trend: vi.fn() } } }))

const mockedRollup = vi.mocked(useHubRollup)
const mockedTrend = vi.mocked(api.hub.trend)

function dims(over: Partial<EstateNode['dimensions'][number]>[] = []): EstateNode['dimensions'] {
  const base = [
    { dimension: 'elasticidade', label: 'Elasticidade', strength: 70, band: 'adequado', fragileCount: 0, signalCount: 1 },
    { dimension: 'exposicao', label: 'Exposição', strength: 20, band: 'exposto', fragileCount: 2, signalCount: 2 },
  ]
  return [...base, ...over] as EstateNode['dimensions']
}

function leaf(name: string, uid: string, trust: number, tier: string | null): EstateNode {
  return {
    path: `p/s/${name}`, kind: 'service', name, serviceCount: 1,
    postureWeighted: trust, postureWorst: trust, confidencePct: 100,
    bandMix: { forte: 0, adequado: 0, fragil: 0, exposto: 1, sem_sinal: 0 },
    dimensions: [{ dimension: 'exposicao', label: 'Exposição', strength: 20, band: 'exposto', fragileCount: 1, signalCount: 1 }],
    topMoves: [{ code: 'SEC-904', description: '❌ branch default sem checks', totalLift: 9, serviceCount: 1, isRemediable: true }],
    ownerGap: 0, hasChildren: false, children: [],
    workloadUid: uid, trustScore: trust, band: 'exposto', confidence: 'media', tier,
  }
}

const ROOT: EstateNode = {
  path: '', kind: 'estate', name: 'Todos os produtos', serviceCount: 2,
  postureWeighted: 44, postureWorst: 30, confidencePct: 50,
  bandMix: { forte: 0, adequado: 0, fragil: 1, exposto: 1, sem_sinal: 0 },
  dimensions: dims(),
  topMoves: [{ code: 'OPS-914', description: '❌ branch default sem review obrigatório', totalLift: 21, serviceCount: 2, isRemediable: true }],
  ownerGap: 0, hasChildren: true,
  children: [{
    path: 'p', kind: 'product', name: 'p', serviceCount: 2, postureWeighted: 44, postureWorst: 30, confidencePct: 50,
    bandMix: { forte: 0, adequado: 0, fragil: 1, exposto: 1, sem_sinal: 0 }, dimensions: dims(), topMoves: [], ownerGap: 0, hasChildren: true,
    children: [{
      path: 'p/s', kind: 'squad', name: 's', serviceCount: 2, postureWeighted: 44, postureWorst: 30, confidencePct: 50,
      bandMix: { forte: 0, adequado: 0, fragil: 1, exposto: 1, sem_sinal: 0 }, dimensions: dims(), topMoves: [], ownerGap: 0, hasChildren: true,
      children: [leaf('billing-api', 'uid-billing', 30, '1'), leaf('reports-web', 'uid-reports', 58, null)],
    }],
  }],
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <ThemeProvider>
      <QueryClientProvider client={qc}>
        <MemoryRouter><Reliability /></MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  )
}

describe('Reliability page', () => {
  beforeEach(() => {
    mockedRollup.mockReturnValue({ data: ROOT, isLoading: false, isError: false, refetch: vi.fn() } as ReturnType<typeof useHubRollup>)
    mockedTrend.mockResolvedValue([{ date: '2026-08-25', trust: 50, confidencePct: 60 }, { date: '2026-08-26', trust: 44, confidencePct: 55 }])
  })

  it('ranqueia serviços por risco ponderado (tier-1 crítico no topo)', () => {
    renderPage()
    const ranking = screen.getByTestId('reliability-ranking')
    const rows = ranking.querySelectorAll('tbody tr')
    expect(rows[0]).toHaveTextContent('billing-api')
    expect(rows[1]).toHaveTextContent('reports-web')
  })

  it('mostra as 6 tiles de dimensão e as oportunidades do estate', () => {
    renderPage()
    expect(screen.getByTestId('reliability-view')).toHaveTextContent('Exposição')
    expect(screen.getByTestId('reliability-view')).toHaveTextContent('branch default sem review obrigatório')
  })

  it('filtra o ranking ao clicar numa dimensão frágil', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Exposição/i }))
    const rows = screen.getByTestId('reliability-ranking').querySelectorAll('tbody tr')
    expect(rows.length).toBe(2)
  })
})
