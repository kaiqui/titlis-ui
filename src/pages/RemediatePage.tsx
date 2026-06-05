import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  ExternalLink,
  GitPullRequest,
  Loader2,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import { ButtonDefault } from '@/components/jeitto/ButtonDefault'
import { Card } from '@/components/jeitto/Card'
import { EmptyState } from '@/components/jeitto/EmptyState'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { Header } from '@/components/layout/Header'
import { useWorkloadGithubLink, useWorkloadScorecard } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { formatEnum, severityColor } from '@/lib/utils'
import type { Finding } from '@/types'

// ─── tipos locais ───────────────────────────────────────────────────────────

type PageStep = 'linking' | 'selecting' | 'running' | 'path_resolution' | 'reviewing' | 'confirming' | 'done' | 'error'
type PrPolicy = 'consolidated' | 'per_item'

interface PathRequired {
  threadId: string
  detectedEnvironment: string
  suggestedPath: string
}

interface FixReady {
  threadId: string
  patchedManifest: string
  currentManifest: string
}

interface PrCreated {
  prUrl: string
  prNumber: number
}

const NODE_LABELS: Record<string, string> = {
  classify_findings: 'Classificando findings',
  resolve_manifest_path: 'Detectando ambiente e caminho do manifesto',
  fetch_context: 'Lendo manifesto e contexto do workload',
  check_existing_pr: 'Verificando PRs abertos no repositório',
  analyze_findings: 'IA analisando os findings (pode levar até 2 min)...',
  generate_yaml_patch: 'IA gerando patch YAML (pode levar até 2 min)...',
  validate_patch: 'Validando patch gerado',
  await_user_confirmation: 'Aguardando sua confirmação',
  create_remediation_pr: 'Criando Pull Request no GitHub',
  notify_api: 'Finalizando',
}

// ─── DiffView (inline) ──────────────────────────────────────────────────────

type DiffLine = { type: 'added' | 'removed' | 'unchanged'; line: string }

function diffLines(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split('\n')
  const b = newText.split('\n')
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  const result: DiffLine[] = []
  let i = m, j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unshift({ type: 'unchanged', line: a[i - 1] }); i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added', line: b[j - 1] }); j--
    } else {
      result.unshift({ type: 'removed', line: a[i - 1] }); i--
    }
  }
  return result
}

function DiffView({ current, patched }: { current: string; patched: string }) {
  const lines = diffLines(current, patched)
  const hasChanges = lines.some(l => l.type !== 'unchanged')
  return (
    <div className="overflow-auto rounded-2xl font-mono text-xs" style={{ backgroundColor: 'var(--app-background)', border: '1px solid var(--color-border)', maxHeight: '400px' }}>
      {!hasChanges && (
        <p className="px-4 py-3 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Nenhuma diferença detectada.</p>
      )}
      {lines.map((l, i) => (
        <div
          key={i}
          className="flex px-3 py-0.5 leading-5"
          style={{
            backgroundColor: l.type === 'added' ? 'rgba(16,185,129,0.1)' : l.type === 'removed' ? 'rgba(239,68,68,0.08)' : 'transparent',
            color: l.type === 'added' ? '#059669' : l.type === 'removed' ? '#dc2626' : 'var(--color-foreground)',
          }}
        >
          <span className="mr-3 select-none opacity-50 w-3 shrink-0">
            {l.type === 'added' ? '+' : l.type === 'removed' ? '−' : ' '}
          </span>
          <span className="whitespace-pre">{l.line}</span>
        </div>
      ))}
    </div>
  )
}

// ─── helpers ────────────────────────────────────────────────────────────────

function groupByPillar(findings: Finding[]): Record<string, Finding[]> {
  return findings.reduce<Record<string, Finding[]>>((acc, f) => {
    const key = f.pillar ?? 'outros'
    if (!acc[key]) acc[key] = []
    acc[key].push(f)
    return acc
  }, {})
}

// ─── componente principal ───────────────────────────────────────────────────

export function RemediatePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const scorecardQuery = useWorkloadScorecard(id)
  const githubLinkQuery = useWorkloadGithubLink(id)

  const [step, setStep] = useState<PageStep>('linking')
  const [repoUrl, setRepoUrl] = useState('')
  const [repoSearch, setRepoSearch] = useState('')
  const [repoSuggestions, setRepoSuggestions] = useState<{ fullName: string; htmlUrl: string }[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [serviceYamlPath, setServiceYamlPath] = useState('.titlis/service.yaml')
  const [serviceYamlFound, setServiceYamlFound] = useState<boolean | null>(null)
  const [manifestPath, setManifestPath] = useState('manifests/kubernetes/main/deploy.yaml')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [prPolicy, setPrPolicy] = useState<PrPolicy>('consolidated')
  const [currentNode, setCurrentNode] = useState<string | null>(null)
  const [completedNodes, setCompletedNodes] = useState<string[]>([])
  const [pathRequired, setPathRequired] = useState<PathRequired | null>(null)
  const [fixReady, setFixReady] = useState<FixReady | null>(null)
  const [existingPrUrl, setExistingPrUrl] = useState<string | null>(null)
  const [prResult, setPrResult] = useState<PrCreated | null>(null)
  const [error, setError] = useState<string | null>(null)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef(false)

  const workload = scorecardQuery.data

  // quando o vínculo carrega do banco, avança para seleção APENAS se ainda estiver em 'linking'.
  // Usar functional update evita que refetches do React Query sobrescrevam steps ativos
  // (running, reviewing, confirming) causando reset visual da tela de remediação.
  useEffect(() => {
    if (githubLinkQuery.data?.linked && githubLinkQuery.data.repoUrl) {
      setRepoUrl(githubLinkQuery.data.repoUrl)
      setRepoSearch(githubLinkQuery.data.repoUrl)
      if (githubLinkQuery.data.serviceYamlPath) setServiceYamlPath(githubLinkQuery.data.serviceYamlPath)
      setStep(prev => prev === 'linking' ? 'selecting' : prev)
    }
  }, [githubLinkQuery.data])

  // seleciona por padrão todos os findings remediáveis quando entra em "selecting"
  useEffect(() => {
    if (step === 'selecting' && workload && selectedIds.length === 0) {
      const remediableIds = workload.validationResults
        .filter(f => !f.passed && f.remediable)
        .map(f => f.ruleId)
      setSelectedIds(remediableIds)
    }
  }, [step, workload, selectedIds.length])

  const failedFindings = useMemo(
    () => workload?.validationResults.filter(f => !f.passed) ?? [],
    [workload]
  )

  const pillarGroups = useMemo(() => groupByPillar(failedFindings), [failedFindings])

  const remediableSelected = selectedIds.filter(sid =>
    failedFindings.find(f => f.ruleId === sid && f.remediable)
  )

  function toggleFinding(ruleId: string) {
    setSelectedIds(prev =>
      prev.includes(ruleId) ? prev.filter(id => id !== ruleId) : [...prev, ruleId]
    )
  }

  function togglePillar(pillarFindings: Finding[]) {
    const remediable = pillarFindings.filter(f => f.remediable).map(f => f.ruleId)
    const allSelected = remediable.every(rid => selectedIds.includes(rid))
    if (allSelected) {
      setSelectedIds(prev => prev.filter(rid => !remediable.includes(rid)))
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...remediable])])
    }
  }

  function handleSearchInput(value: string) {
    setRepoSearch(value)
    setRepoUrl(value)
    setRepoSuggestions([])
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (value.trim().length < 2) return
    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const results = await api.github.searchRepos(value.trim())
        setRepoSuggestions(results.slice(0, 6))
      } catch {
        // sem token ou erro de rede: silencioso, usuário continua digitando
      } finally {
        setSearchLoading(false)
      }
    }, 400)
  }

  function selectSuggestion(htmlUrl: string) {
    setRepoUrl(htmlUrl)
    setRepoSearch(htmlUrl)
    setRepoSuggestions([])
  }

  async function confirmLink() {
    const url = repoUrl.trim()
    if (!url) return
    setLinkLoading(true)
    setLinkError(null)
    setServiceYamlFound(null)
    try {
      const result = await api.workloads.setGithubLink(id, url, serviceYamlPath || '.titlis/service.yaml')
      setServiceYamlFound(result.serviceYamlFound)
      setServiceYamlPath(result.serviceYamlPath)
      await queryClient.invalidateQueries({ queryKey: ['workload', id, 'github-link'] })
      setStep('selecting')
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Erro ao vincular repositório')
    } finally {
      setLinkLoading(false)
    }
  }

  async function resetLink() {
    await api.workloads.removeGithubLink(id)
    await queryClient.invalidateQueries({ queryKey: ['workload', id, 'github-link'] })
    setRepoUrl('')
    setRepoSearch('')
    setServiceYamlFound(null)
    setSelectedIds([])
    setStep('linking')
  }

  async function startRemediation() {
    if (remediableSelected.length === 0) return
    abortRef.current = false
    setStep('running')
    setCompletedNodes([])
    setCurrentNode(null)
    setError(null)

    try {
      const stream = api.ai.remediateStream(id, {
        findingIds: remediableSelected,
        repoUrl: repoUrl.trim(),
        deployManifestPath: manifestPath.trim() || 'manifests/kubernetes/main/deploy.yaml',
        serviceYamlPath: serviceYamlPath || '.titlis/service.yaml',
      })

      for await (const event of stream) {
        if (abortRef.current) break

        if (event.type === 'progress' && typeof event.node === 'string') {
          setCurrentNode(event.node)
          setCompletedNodes(prev => [...prev, event.node as string])
        } else if (event.type === 'path_required') {
          const suggested = String(event.suggested_path ?? '')
          setPathRequired({
            threadId: String(event.thread_id),
            detectedEnvironment: String(event.detected_environment ?? 'desconhecido'),
            suggestedPath: suggested,
          })
          setManifestPath(suggested)
          setStep('path_resolution')
          return
        } else if (event.type === 'fix_ready') {
          setFixReady({
            threadId: String(event.thread_id),
            patchedManifest: String(event.patched_manifest ?? ''),
            currentManifest: String(event.current_manifest ?? ''),
          })
          setStep('reviewing')
          return
        } else if (event.type === 'existing_pr') {
          setExistingPrUrl(String(event.pr_url))
          setStep('done')
          return
        } else if (event.type === 'error') {
          throw new Error(String(event.error ?? 'Erro no pipeline'))
        } else if (event.type === 'done') {
          break
        }
      }
      if (!abortRef.current) setStep(prev => prev !== 'reviewing' ? 'done' : prev)
    } catch (err) {
      if (!abortRef.current) {
        setError(err instanceof Error ? err.message : 'Erro no pipeline de remediação')
        setStep('error')
      }
    }
  }

  async function submitManifestPath() {
    if (!pathRequired || !manifestPath.trim()) return
    abortRef.current = false
    setStep('running')
    setError(null)

    try {
      const stream = api.ai.setManifestPath(pathRequired.threadId, manifestPath.trim())

      for await (const event of stream) {
        if (abortRef.current) break

        if (event.type === 'progress' && typeof event.node === 'string') {
          setCurrentNode(event.node)
          setCompletedNodes(prev => [...prev, event.node as string])
        } else if (event.type === 'fix_ready') {
          setFixReady({
            threadId: String(event.thread_id),
            patchedManifest: String(event.patched_manifest ?? ''),
            currentManifest: String(event.current_manifest ?? ''),
          })
          setStep('reviewing')
          return
        } else if (event.type === 'existing_pr') {
          setExistingPrUrl(String(event.pr_url))
          setStep('done')
          return
        } else if (event.type === 'error') {
          throw new Error(String(event.error ?? 'Erro no pipeline'))
        } else if (event.type === 'done') {
          break
        }
      }
      if (!abortRef.current) setStep('done')
    } catch (err) {
      if (!abortRef.current) {
        setError(err instanceof Error ? err.message : 'Erro ao continuar pipeline')
        setStep('error')
      }
    }
  }

  async function confirmRemediation(approved: boolean) {
    if (!fixReady) return
    abortRef.current = false
    setStep('confirming')
    setError(null)

    try {
      const stream = api.ai.confirmRemediation(fixReady.threadId, approved)

      for await (const event of stream) {
        if (abortRef.current) break

        if (event.type === 'progress' && typeof event.node === 'string') {
          setCurrentNode(event.node)
        } else if (event.type === 'pr_created') {
          setPrResult({ prUrl: String(event.pr_url), prNumber: Number(event.pr_number) })
          setStep('done')
          return
        } else if (event.type === 'error') {
          throw new Error(String(event.error ?? 'Erro ao confirmar'))
        } else if (event.type === 'done') {
          break
        }
      }
      if (!abortRef.current) setStep('done')
    } catch (err) {
      if (!abortRef.current) {
        setError(err instanceof Error ? err.message : 'Erro ao confirmar remediação')
        setStep('error')
      }
    }
  }

  // ─── loading / error do scorecard ────────────────────────────────────────

  if (scorecardQuery.isLoading) {
    return (
      <>
        <Header title="ARIA · Remediação inteligente" />
        <PageLoading />
      </>
    )
  }

  if (scorecardQuery.error || !workload) {
    return (
      <>
        <Header title="ARIA · Remediação inteligente" />
        <PageError
          message={scorecardQuery.error instanceof Error ? scorecardQuery.error.message : 'Workload não encontrado'}
          onRetry={() => void scorecardQuery.refetch()}
        />
      </>
    )
  }

  const isActive = step === 'running' || step === 'confirming'

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title="ARIA · Remediação inteligente"
        subtitle={`${workload.name} · ${workload.namespace} · ${formatEnum(workload.environment)}`}
      />

      <div className="flex-1 space-y-6 px-4 py-6 lg:px-8">

        {/* ── barra superior ── */}
        <div className="flex flex-wrap items-center gap-3">
          <ButtonDefault
            label="Voltar para scorecard"
            visual="secondary"
            icon={ArrowLeft}
            onClick={() => navigate(`/scorecards/${id}`)}
            disabled={isActive}
          />
          {step === 'selecting' && (
            <button
              onClick={resetLink}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-70"
              style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
            >
              <X size={11} />
              Desvincular repositório
            </button>
          )}
        </div>

        {/* ── card ARIA com repo status ── */}
        <Card>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(139,92,246,0.2) 100%)', border: '1px solid rgba(99,102,241,0.3)' }}>
              <Sparkles size={20} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>ARIA — Remediação com IA</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
                A IA lê o manifesto real do GitHub, gera o patch correto e abre o PR para sua revisão.
              </p>
            </div>
            {step !== 'linking' && repoUrl && (
              <div className="shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#059669' }}>
                <CheckCircle2 size={12} />
                {repoUrl.replace('https://github.com/', '')}
                {serviceYamlFound === true && (
                  <span className="ml-1 opacity-70">· .titlis/service.yaml ✓</span>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* ══ STEP: linking ══════════════════════════════════════════════════ */}
        {step === 'linking' && (
          <Card>
            <div className="space-y-5">
              <div>
                <p className="text-sm font-black mb-1" style={{ color: 'var(--color-foreground)' }}>
                  Pré-requisito: vincule o repositório GitHub
                </p>
                <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                  Informe o repositório onde está o manifesto Kubernetes deste workload.
                  Se o repositório tiver um arquivo <code className="rounded px-1" style={{ backgroundColor: 'var(--color-muted)' }}>.titlis/service.yaml</code>, a ARIA detecta o caminho do manifesto automaticamente.
                </p>
              </div>

              <div className="relative">
                <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
                  Repositório GitHub *
                </label>
                <div className="relative mt-2">
                  <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-muted-foreground)' }} />
                  {searchLoading && (
                    <Loader2 size={14} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin" style={{ color: 'var(--color-muted-foreground)' }} />
                  )}
                  <input
                    type="text"
                    value={repoSearch}
                    onChange={e => handleSearchInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && void confirmLink()}
                    placeholder="Buscar ou colar URL do repositório..."
                    className="w-full rounded-2xl py-3 pl-10 pr-10 text-sm outline-none transition-colors"
                    style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
                    autoFocus
                  />
                </div>
                {repoSuggestions.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-2xl border shadow-lg overflow-hidden" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                    {repoSuggestions.map(s => (
                      <button
                        key={s.htmlUrl}
                        onClick={() => selectSuggestion(s.htmlUrl)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:opacity-80"
                        style={{ backgroundColor: 'transparent', color: 'var(--color-foreground)' }}
                      >
                        <GitPullRequest size={13} style={{ color: 'var(--color-muted-foreground)', flexShrink: 0 }} />
                        <span className="text-sm font-semibold">{s.fullName}</span>
                      </button>
                    ))}
                  </div>
                )}
                {linkError && (
                  <p className="mt-2 text-xs" style={{ color: '#dc2626' }}>{linkError}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
                  Caminho do service.yaml no repositório
                </label>
                <p className="mt-0.5 text-xs mb-2" style={{ color: 'var(--color-muted-foreground)' }}>
                  Default: <code className="rounded px-1" style={{ backgroundColor: 'var(--color-muted)' }}>.titlis/service.yaml</code> (raiz). Para monorepo: ex. <code className="rounded px-1" style={{ backgroundColor: 'var(--color-muted)' }}>services/api/.titlis/service.yaml</code>
                </p>
                <input
                  type="text"
                  value={serviceYamlPath}
                  onChange={e => setServiceYamlPath(e.target.value)}
                  placeholder=".titlis/service.yaml"
                  className="w-full rounded-2xl px-4 py-3 text-sm outline-none transition-colors font-mono"
                  style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
                />
              </div>

              <div className="rounded-2xl px-4 py-3 text-xs" style={{ backgroundColor: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)', color: 'var(--color-muted-foreground)' }}>
                <p className="font-semibold mb-1" style={{ color: 'var(--color-foreground)' }}>O que a ARIA vai fazer</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Ler o <code>.titlis/service.yaml</code> do repositório para encontrar o manifesto</li>
                  <li>Buscar o manifesto atual no GitHub</li>
                  <li>Gerar o patch YAML para corrigir os findings selecionados</li>
                  <li>Mostrar o diff para sua revisão antes de abrir o PR</li>
                </ul>
              </div>

              <div className="flex justify-end">
                <ButtonDefault
                  label={linkLoading ? 'Vinculando...' : 'Vincular e continuar'}
                  icon={linkLoading ? Loader2 : undefined}
                  onClick={() => void confirmLink()}
                  disabled={!repoUrl.trim() || linkLoading}
                />
              </div>
            </div>
          </Card>
        )}

        {/* ══ STEP: selecting ════════════════════════════════════════════════ */}
        {step === 'selecting' && (
          <>
            {/* ── barra de ação — ACIMA da lista para nunca sobrepor ── */}
            {failedFindings.length > 0 && (
              <div
                className="rounded-3xl border px-5 py-4"
                style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                      {remediableSelected.length === 0
                        ? 'Nenhum item selecionado'
                        : `${remediableSelected.length} item${remediableSelected.length !== 1 ? 's' : ''} selecionado${remediableSelected.length !== 1 ? 's' : ''}`}
                    </p>
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                      <span>PR:</span>
                      <label className="flex cursor-pointer items-center gap-1">
                        <input
                          type="radio"
                          name="pr-policy"
                          value="consolidated"
                          checked={prPolicy === 'consolidated'}
                          onChange={() => setPrPolicy('consolidated')}
                          className="accent-primary"
                        />
                        <span>Consolidado</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-1">
                        <input
                          type="radio"
                          name="pr-policy"
                          value="per_item"
                          checked={prPolicy === 'per_item'}
                          onChange={() => setPrPolicy('per_item')}
                          className="accent-primary"
                        />
                        <span>Por item</span>
                      </label>
                    </div>
                  </div>
                  <ButtonDefault
                    label="Gerar remediação com ARIA"
                    icon={Bot}
                    onClick={() => void startRemediation()}
                    disabled={remediableSelected.length === 0}
                  />
                </div>
              </div>
            )}

            {failedFindings.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Nenhuma falha encontrada"
                description="Este workload não possui findings com falha. Nada para remediar."
              />
            ) : (
              <div className="space-y-4">
                {Object.entries(pillarGroups).map(([pillar, findings]) => {
                  const remediable = findings.filter(f => f.remediable)
                  const allSelected = remediable.length > 0 && remediable.every(f => selectedIds.includes(f.ruleId))

                  return (
                    <Card key={pillar}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>
                            {formatEnum(pillar)}
                          </p>
                          <span className="text-xs rounded-full px-2 py-0.5 font-semibold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                            {findings.length} falha{findings.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {remediable.length > 0 && (
                          <button
                            onClick={() => togglePillar(findings)}
                            className="text-xs font-semibold rounded-full px-3 py-1 transition-opacity hover:opacity-70"
                            style={{ backgroundColor: allSelected ? 'rgba(var(--color-primary-rgb),0.15)' : 'var(--color-muted)', color: allSelected ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }}
                          >
                            {allSelected ? 'Desmarcar pilar' : 'Selecionar pilar'}
                          </button>
                        )}
                      </div>

                      <div className="space-y-2">
                        {findings.map(finding => (
                          <div
                            key={finding.ruleId}
                            className="rounded-2xl px-4 py-3"
                            style={{ backgroundColor: 'var(--app-background)', border: '1px solid var(--color-border)' }}
                          >
                            {finding.remediable ? (
                              <label className="flex cursor-pointer items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.includes(finding.ruleId)}
                                  onChange={() => toggleFinding(finding.ruleId)}
                                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>{finding.ruleName}</p>
                                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${severityColor(finding.severity)}`}>
                                      {formatEnum(finding.severity)}
                                    </span>
                                    <span className="text-[11px] rounded-full px-2 py-0.5 font-semibold" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#059669' }}>
                                      remediável via PR
                                    </span>
                                  </div>
                                  {finding.message && (
                                    <p className="mt-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{finding.message}</p>
                                  )}
                                </div>
                              </label>
                            ) : (
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded" style={{ backgroundColor: 'var(--color-muted)' }}>
                                  <AlertTriangle size={10} style={{ color: 'var(--color-muted-foreground)' }} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>{finding.ruleName}</p>
                                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${severityColor(finding.severity)}`}>
                                      {formatEnum(finding.severity)}
                                    </span>
                                    <span className="text-[11px] rounded-full px-2 py-0.5 font-semibold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                                      correção manual
                                    </span>
                                  </div>
                                  {finding.message && (
                                    <p className="mt-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{finding.message}</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}

          </>
        )}

        {/* ══ STEP: running ══════════════════════════════════════════════════ */}
        {step === 'running' && (
          <Card>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(139,92,246,0.2) 100%)' }}>
                  <Sparkles size={16} style={{ color: 'var(--color-primary)' }} />
                </div>
                <div>
                  <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>ARIA está trabalhando</p>
                  <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                    {currentNode ? (NODE_LABELS[currentNode] ?? currentNode) : 'Iniciando pipeline...'}
                  </p>
                </div>
                <Loader2 size={16} className="ml-auto animate-spin" style={{ color: 'var(--color-primary)' }} />
              </div>

              <div className="space-y-1.5 pl-12">
                {completedNodes.filter((n, i, a) => a.indexOf(n) === i).map(node => (
                  <div key={node} className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                    <CheckCircle2 size={12} style={{ color: '#10b981' }} />
                    {NODE_LABELS[node] ?? node}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* ══ STEP: path_resolution ═════════════════════════════════════════ */}
        {step === 'path_resolution' && pathRequired && (
          <Card>
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
                <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>
                  .titlis/service.yaml não encontrado
                </p>
              </div>

              <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-muted-foreground)' }}>Ambiente detectado</p>
                <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{pathRequired.detectedEnvironment}</p>
              </div>

              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                Informe o caminho do manifesto Kubernetes no repositório para que a ARIA saiba onde aplicar o patch.
              </p>

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
                  Caminho do manifesto *
                </label>
                <input
                  type="text"
                  value={manifestPath}
                  onChange={e => setManifestPath(e.target.value)}
                  placeholder="ex: manifests/kubernetes/main/deploy.yaml"
                  className="mt-2 w-full rounded-2xl px-4 py-3 text-sm outline-none transition-colors"
                  style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2">
                <ButtonDefault label="Cancelar" visual="secondary" onClick={() => setStep('selecting')} />
                <ButtonDefault
                  label="Continuar com este caminho"
                  onClick={() => void submitManifestPath()}
                  disabled={!manifestPath.trim()}
                />
              </div>
            </div>
          </Card>
        )}

        {/* ══ STEP: reviewing ═══════════════════════════════════════════════ */}
        {step === 'reviewing' && fixReady && (
          <Card>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitPullRequest size={16} style={{ color: 'var(--color-primary)' }} />
                  <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>Patch gerado — revise antes de abrir o PR</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest">
                  <span className="flex items-center gap-1" style={{ color: '#059669' }}><span>+</span> adicionado</span>
                  <span className="flex items-center gap-1" style={{ color: '#dc2626' }}><span>−</span> removido</span>
                </div>
              </div>

              {fixReady.currentManifest
                ? <DiffView current={fixReady.currentManifest} patched={fixReady.patchedManifest} />
                : (
                  <div className="space-y-2">
                    <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Manifesto atual não disponível — exibindo apenas o proposto.</p>
                    <pre className="max-w-full overflow-auto rounded-2xl p-4 text-xs" style={{ backgroundColor: 'rgba(16,185,129,0.06)', color: 'var(--color-foreground)', maxHeight: '400px' }}>
                      {fixReady.patchedManifest || 'Não disponível'}
                    </pre>
                  </div>
                )
              }

              <div className="flex justify-end gap-2 pt-2">
                <ButtonDefault
                  label="Cancelar"
                  visual="secondary"
                  onClick={() => void confirmRemediation(false)}
                />
                <ButtonDefault
                  label="Confirmar e abrir PR"
                  icon={GitPullRequest}
                  onClick={() => void confirmRemediation(true)}
                />
              </div>
            </div>
          </Card>
        )}

        {/* ══ STEP: confirming ══════════════════════════════════════════════ */}
        {step === 'confirming' && (
          <Card>
            <div className="flex items-center gap-3">
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
              <span className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                {currentNode ? (NODE_LABELS[currentNode] ?? currentNode) : 'Abrindo Pull Request...'}
              </span>
            </div>
          </Card>
        )}

        {/* ══ STEP: done ════════════════════════════════════════════════════ */}
        {step === 'done' && (
          <Card>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgba(16,185,129,0.1)' }}>
                  <CheckCircle2 size={18} style={{ color: '#10b981' }} />
                </div>
                <div>
                  <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>
                    {prResult ? 'Pull Request aberto com sucesso' : existingPrUrl ? 'PR existente encontrado' : 'Concluído'}
                  </p>
                  {prResult && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
                      PR #{prResult.prNumber} aguarda sua revisão e aprovação no GitHub.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {(prResult?.prUrl || existingPrUrl) && (
                  <a href={prResult?.prUrl ?? existingPrUrl ?? ''} target="_blank" rel="noreferrer">
                    <ButtonDefault
                      label={prResult ? `Abrir PR #${prResult.prNumber} no GitHub` : 'Ver PR existente'}
                      icon={ExternalLink}
                    />
                  </a>
                )}
                <ButtonDefault
                  label="Voltar para scorecard"
                  visual="secondary"
                  icon={ArrowLeft}
                  onClick={() => navigate(`/scorecards/${id}`)}
                />
                <ButtonDefault
                  label="Nova remediação"
                  visual="secondary"
                  icon={RotateCcw}
                  onClick={() => {
                    setStep('selecting')
                    setFixReady(null)
                    setPrResult(null)
                    setExistingPrUrl(null)
                    setCompletedNodes([])
                    setCurrentNode(null)
                    setSelectedIds([])
                  }}
                />
              </div>
            </div>
          </Card>
        )}

        {/* ══ STEP: error ═══════════════════════════════════════════════════ */}
        {step === 'error' && (
          <Card>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
                  <AlertTriangle size={18} style={{ color: '#dc2626' }} />
                </div>
                <div>
                  <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>Erro no pipeline</p>
                  <p className="text-xs mt-0.5" style={{ color: '#dc2626' }}>{error}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <ButtonDefault
                  label="Tentar novamente"
                  icon={RotateCcw}
                  onClick={() => {
                    setStep('selecting')
                    setError(null)
                    setCompletedNodes([])
                    setCurrentNode(null)
                  }}
                />
                <ButtonDefault
                  label="Voltar para scorecard"
                  visual="secondary"
                  icon={ArrowLeft}
                  onClick={() => navigate(`/scorecards/${id}`)}
                />
              </div>
            </div>
          </Card>
        )}

      </div>
    </div>
  )
}
