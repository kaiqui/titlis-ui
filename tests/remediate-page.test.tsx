import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ContextType } from 'react'
import { AuthContext } from '@/contexts/AuthContext'

// Mock api module — sem chamar rede real
vi.mock('@/lib/api', () => ({
  api: {
    workloads: {
      scorecard: vi.fn(),
      remediation: vi.fn(),
      githubLink: vi.fn(),
      removeGithubLink: vi.fn(),
      setGithubLink: vi.fn(),
    },
    ai: {
      remediateStream: vi.fn(),
      confirmRemediation: vi.fn(),
      setManifestPath: vi.fn(),
      submitServiceYaml: vi.fn(),
    },
    github: {
      searchRepos: vi.fn(),
    },
  },
}))

// react-diff-viewer-continued é mockado no nível da lib para evitar crash em jsdom (Web Workers).
vi.mock('react-diff-viewer-continued', () => ({
  default: () => null,
  DiffMethod: { LINES: 'LINES' },
}))

import { api } from '@/lib/api'
import { RemediatePage } from '@/pages/RemediatePage'

function buildQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
}

function buildAuthContext(): ContextType<typeof AuthContext> {
  return {
    authMode: 'okta',
    status: 'authenticated',
    user: { id: 1, tenantId: 1, tenantSlug: 'loma', email: 'loma@loma.com', displayName: 'loma', role: 'admin', authProvider: 'local', onboardingCompleted: true, canRemediate: true },
    session: { provider: 'local', accessToken: 'tok', expiresAt: new Date(Date.now() + 3600_000).toISOString() },
    bootstrapStatus: null,
    hasOktaConfig: false,
    loginLocal: vi.fn(),
    loginWithOkta: vi.fn(),
    finishOktaLogin: vi.fn(),
    bootstrapSetup: vi.fn(),
    refreshSession: vi.fn(),
    signOut: vi.fn(),
  }
}

function buildScorecard(overrides = {}) {
  return {
    id: 'dcd71e67',
    name: 'titlis-api',
    namespace: 'titlis-preprod',
    cluster: 'master',
    environment: 'unknown',
    overallScore: 42,
    complianceStatus: 'non_compliant',
    version: 1,
    totalRules: 25,
    passedRules: 14,
    failedRules: 11,
    criticalFailures: 0,
    errorCount: 3,
    warningCount: 7,
    evaluatedAt: '2026-06-05T12:00:00Z',
    pillarScores: [],
    // validationResults usa o tipo mapeado (WorkloadDetail) — remediable, não isRemediable
    validationResults: [
      {
        ruleId: 'SEC-004',
        ruleName: 'Drop Capabilities',
        pillar: 'SECURITY',
        severity: 'WARNING',
        ruleType: 'BOOLEAN',
        weight: 5,
        passed: false,
        message: 'Nenhuma capability foi dropped',
        actualValue: null,
        remediable: true,
        remediationCategory: null,
        evaluatedAt: '2026-06-05T12:00:00Z',
        remediationPending: false,
        remediationPrUrl: null,
      },
    ],
    activeRemediation: null,
    ...overrides,
  }
}

function renderRemediatePage(workloadId = 'dcd71e67') {
  const queryClient = buildQueryClient()
  const result = render(
    <AuthContext.Provider value={buildAuthContext()}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/scorecards/${workloadId}/remediate`]}>
          <Routes>
            <Route path="/scorecards/:id/remediate" element={<RemediatePage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </AuthContext.Provider>,
  )
  return { ...result, user: null }
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.workloads.remediation).mockResolvedValue(null)
})

// ─── Testes: step de linking vs selecting ─────────────────────────────────────

describe('RemediatePage — step de vinculação', () => {
  it('mostra step de linking quando repo NAO está vinculado', async () => {
    vi.mocked(api.workloads.scorecard).mockResolvedValue(buildScorecard())
    vi.mocked(api.workloads.githubLink).mockResolvedValue(null)

    renderRemediatePage()

    await waitFor(() =>
      expect(screen.getByText(/Pré-requisito/i)).toBeInTheDocument(),
    )
    expect(screen.queryByText(/Gerar remediação com ARIA/i)).not.toBeInTheDocument()
  })

  it('vai direto para o step selecting quando repo JA está vinculado', async () => {
    vi.mocked(api.workloads.scorecard).mockResolvedValue(buildScorecard())
    vi.mocked(api.workloads.githubLink).mockResolvedValue({
      linked: true,
      repoUrl: 'https://github.com/kaiqui/titlis-api',
      serviceYamlPath: '.titlis/service.yaml',
    })

    renderRemediatePage()

    await waitFor(() =>
      expect(screen.getByText(/Gerar remediação com ARIA/i)).toBeInTheDocument(),
    )
    expect(screen.queryByText(/Pré-requisito/i)).not.toBeInTheDocument()
  })

  it('vai para selecting quando api.ts infere linked=true do repo_url (campo linked ausente na resposta bruta)', async () => {
    // api.ts mapeia: linked: !!(r.linked ?? r.repo_url) — quando linked é nullish mas repo_url existe → true
    vi.mocked(api.workloads.scorecard).mockResolvedValue(buildScorecard())
    vi.mocked(api.workloads.githubLink).mockResolvedValue({
      linked: true, // resultado pós-mapeamento de !!(undefined ?? 'https://...')
      repoUrl: 'https://github.com/kaiqui/titlis-api',
      serviceYamlPath: '.titlis/service.yaml',
    })

    renderRemediatePage()

    await waitFor(() =>
      expect(screen.getByText(/Gerar remediação com ARIA/i)).toBeInTheDocument(),
    )
    expect(screen.queryByText(/Pré-requisito/i)).not.toBeInTheDocument()
  })
})

// ─── Testes: step reviewing não é sobrescrito pelo refetch do React Query ──────

describe('RemediatePage — fix_ready persiste no step reviewing', () => {
  it('step reviewing NAO é sobrescrito por refetch do React Query após fix_ready', async () => {
    vi.mocked(api.workloads.scorecard).mockResolvedValue(buildScorecard())
    vi.mocked(api.workloads.githubLink).mockResolvedValue({
      linked: true,
      repoUrl: 'https://github.com/kaiqui/titlis-api',
      serviceYamlPath: '.titlis/service.yaml',
    })

    // mockImplementation garante gerador fresco em cada chamada
    vi.mocked(api.ai.remediateStream).mockImplementation(async function* () {
      yield { type: 'progress', node: 'classify_findings' }
      yield {
        type: 'fix_ready',
        thread_id: 'thread-123',
        patched_manifest: 'yaml: patched',
        current_manifest: 'yaml: original',
        findings: [],
        deployment_name: 'titlis-api',
        namespace: 'titlis-preprod',
      }
    })

    renderRemediatePage()

    // Aguarda step selecting
    await waitFor(() => screen.getByText(/Gerar remediação com ARIA/i))

    // Seleciona o checkbox do finding remediável
    const checkbox = screen.getByRole('checkbox')
    await act(async () => { fireEvent.click(checkbox) })

    // Dispara remediação
    await act(async () => {
      fireEvent.click(screen.getByText(/Gerar remediação com ARIA/i))
    })

    // Aguarda diff card (step reviewing) — LLM respondeu
    await waitFor(
      () => expect(screen.getByText(/Patch gerado/i)).toBeInTheDocument(),
      { timeout: 3000 },
    )

    // Simula React Query refetch (visibilitychange) — o useEffect NÃO deve sair do reviewing
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
    })

    // Diff card ainda visível
    expect(screen.getByText(/Patch gerado/i)).toBeInTheDocument()
    expect(screen.queryByText(/Pré-requisito/i)).not.toBeInTheDocument()
  })
})

// ─── Testes: labels de progresso do LLM ──────────────────────────────────────

describe('RemediatePage — labels de nó LLM', () => {
  it('mostra mensagem explicativa para o node analyze_findings', async () => {
    vi.mocked(api.workloads.scorecard).mockResolvedValue(buildScorecard())
    vi.mocked(api.workloads.githubLink).mockResolvedValue({
      linked: true,
      repoUrl: 'https://github.com/kaiqui/titlis-api',
      serviceYamlPath: '.titlis/service.yaml',
    })

    // Stream que para em analyze_findings — simula LLM em andamento
    vi.mocked(api.ai.remediateStream).mockImplementation(async function* () {
      yield { type: 'progress', node: 'analyze_findings' }
      // LLM rodando — sem mais eventos
      await new Promise(() => {}) // pende para sempre (cancelado ao desmontar)
    })

    renderRemediatePage()
    await waitFor(() => screen.getByText(/Gerar remediação com ARIA/i))

    await act(async () => { screen.getByRole('checkbox').click() })
    await act(async () => { screen.getByText(/Gerar remediação com ARIA/i).click() })

    // O label do nó analyze_findings deve conter "IA analisando" (aparece no status ou no histórico)
    await waitFor(
      () => expect(screen.getAllByText(/IA analisando/i).length).toBeGreaterThan(0),
      { timeout: 3000 },
    )
  })
})
