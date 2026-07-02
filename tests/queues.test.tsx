import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '@/contexts/ThemeContext'
import {
  useQueues,
  useQueueScorecard,
  useQueueThresholds,
  useQueueSuggestions,
  useServiceOptions,
  useLinkQueue,
} from '@/hooks/useApi'
import { Queues } from '@/pages/Queues'
import type { QueueSummary } from '@/types'

vi.mock('@/hooks/useApi', () => ({
  useQueues: vi.fn(),
  useQueueScorecard: vi.fn(),
  useQueueThresholds: vi.fn(),
  useQueueSuggestions: vi.fn(),
  useServiceOptions: vi.fn(),
  useLinkQueue: vi.fn(),
}))

const mockedQueues = vi.mocked(useQueues)
const mockedScorecard = vi.mocked(useQueueScorecard)
const mockedThresholds = vi.mocked(useQueueThresholds)
const mockedSuggestions = vi.mocked(useQueueSuggestions)
const mockedServiceOptions = vi.mocked(useServiceOptions)
const mockedLinkQueue = vi.mocked(useLinkQueue)

function q(p: Partial<QueueSummary> & { id: string; displayName: string }): QueueSummary {
  return {
    provider: 'gcp-pubsub',
    externalId: `projects/x/subscriptions/${p.id}`,
    projectId: 'x',
    topicId: null,
    isDlq: false,
    lifecycleState: 'MONITORING',
    observationCount: 10,
    learningTarget: 10,
    overallScore: 90,
    complianceStatus: 'COMPLIANT',
    sendMessageCountRate: null,
    pullMessageCountRate: null,
    lastSeenAt: null,
    serviceDefinitionId: null,
    serviceName: null,
    team: null,
    linkSource: null,
    suggestionCount: 0,
    ...p,
  }
}

const QUEUES: QueueSummary[] = [
  q({ id: 'orders-sub', displayName: 'orders-sub', serviceDefinitionId: 1, serviceName: 'orders-api', team: 'team-pag', linkSource: 'pattern' }),
  q({ id: 'ledger-sub', displayName: 'ledger-sub', serviceDefinitionId: 2, serviceName: 'ledger', team: 'team-led', linkSource: 'manual' }),
  q({ id: 'orphan-sub', displayName: 'orphan-sub', suggestionCount: 2 }),
]

function setup(initialPath: string) {
  mockedQueues.mockReturnValue({ data: QUEUES, isLoading: false, error: null, refetch: vi.fn() } as never)
  mockedScorecard.mockReturnValue({ data: undefined, isLoading: false } as never)
  mockedThresholds.mockReturnValue({ data: undefined, isLoading: false } as never)
  mockedSuggestions.mockReturnValue({ data: [] } as never)
  mockedServiceOptions.mockReturnValue({ data: [] } as never)
  mockedLinkQueue.mockReturnValue({ mutate: vi.fn(), isPending: false } as never)

  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/queues" element={<Queues />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('Queues page', () => {
  it('mostra todas as filas quando não há filtro de serviço na URL', () => {
    setup('/queues')

    expect(screen.getAllByText('orders-sub').length).toBeGreaterThan(0)
    expect(screen.getByText('ledger-sub')).toBeInTheDocument()
    expect(screen.getByText('orphan-sub')).toBeInTheDocument()
  })

  it('filtra as filas pelo serviço vindo de ?service= (deep-link do Hub de Serviços)', () => {
    setup('/queues?service=orders-api')

    expect(screen.getByText(/Mostrando apenas filas do serviço/)).toBeInTheDocument()
    expect(screen.getByText('orders-api', { selector: 'span.font-semibold' })).toBeInTheDocument()
    expect(screen.getAllByText('orders-sub').length).toBeGreaterThan(0)
    expect(screen.queryByText('ledger-sub')).not.toBeInTheDocument()
    expect(screen.queryByText('orphan-sub')).not.toBeInTheDocument()
  })

  it('limpa o filtro de serviço ao clicar em "Limpar filtro"', () => {
    setup('/queues?service=orders-api')

    expect(screen.queryByText('ledger-sub')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Limpar filtro'))

    expect(screen.getByText('ledger-sub')).toBeInTheDocument()
    expect(screen.getByText('orphan-sub')).toBeInTheDocument()
  })

  it('exibe o vínculo de serviço como badge sempre visível na lista, sem precisar selecionar a fila', () => {
    setup('/queues')

    expect(screen.getByText('→ orders-api')).toBeInTheDocument()
    expect(screen.getByText('→ ledger')).toBeInTheDocument()
    expect(screen.getByText(/sem dono/)).toBeInTheDocument()
  })
})
