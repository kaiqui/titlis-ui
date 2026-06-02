import { useRef, useState } from 'react'
import { CheckCircle2, ExternalLink, GitPullRequest, Loader2, RotateCcw, X } from 'lucide-react'

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
    <div className="overflow-auto rounded-2xl font-mono text-xs" style={{ backgroundColor: 'var(--app-background)', border: '1px solid var(--color-border)', maxHeight: '340px' }}>
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
import { ButtonDefault } from '@/components/jeitto/ButtonDefault'
import { api } from '@/lib/api'
import type { Finding, WorkloadDetail } from '@/types'

type Step = 'config' | 'running' | 'path_resolution' | 'review' | 'confirming' | 'done' | 'error'

interface PathRequired {
  threadId: string
  detectedEnvironment: string
  suggestedPath: string
  deploymentName: string
  namespace: string
}

interface FixReady {
  threadId: string
  patchedManifest: string
  currentManifest: string
  findings: unknown[]
}

interface PrCreated {
  prUrl: string
  prNumber: number
}

interface Props {
  workload: WorkloadDetail
  remediableFindings: Finding[]
  onClose: () => void
}

const NODE_LABELS: Record<string, string> = {
  classify_findings: 'Classificando findings',
  resolve_manifest_path: 'Detectando ambiente',
  fetch_context: 'Buscando contexto',
  check_existing_pr: 'Verificando PR existente',
  analyze_findings: 'Analisando problemas',
  generate_yaml_patch: 'Gerando patch YAML',
  validate_patch: 'Validando patch',
  await_user_confirmation: 'Aguardando confirmação',
  create_remediation_pr: 'Criando Pull Request',
  notify_api: 'Finalizando',
}

export function AiRemediationModal({ workload, remediableFindings, onClose }: Props) {
  const [step, setStep] = useState<Step>('config')
  const [repoUrl, setRepoUrl] = useState('')
  const [manifestPath, setManifestPath] = useState('manifests/kubernetes/main/deploy.yaml')
  const [selectedIds, setSelectedIds] = useState<string[]>(remediableFindings.map(f => f.ruleId))
  const [currentNode, setCurrentNode] = useState<string | null>(null)
  const [completedNodes, setCompletedNodes] = useState<string[]>([])
  const [pathRequired, setPathRequired] = useState<PathRequired | null>(null)
  const [fixReady, setFixReady] = useState<FixReady | null>(null)
  const [prResult, setPrResult] = useState<PrCreated | null>(null)
  const [existingPrUrl, setExistingPrUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef(false)

  const toggleFinding = (ruleId: string) => {
    setSelectedIds(prev =>
      prev.includes(ruleId) ? prev.filter(id => id !== ruleId) : [...prev, ruleId],
    )
  }

  const startRemediation = async () => {
    if (!repoUrl.trim() || selectedIds.length === 0) return
    abortRef.current = false
    setStep('running')
    setCompletedNodes([])
    setCurrentNode(null)
    setError(null)

    try {
      const stream = api.ai.remediateStream(workload.id, {
        findingIds: selectedIds,
        repoUrl: repoUrl.trim(),
        deployManifestPath: manifestPath.trim() || 'manifests/kubernetes/main/deploy.yaml',
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
            deploymentName: String(event.deployment_name ?? ''),
            namespace: String(event.namespace ?? ''),
          })
          setManifestPath(suggested)
          setStep('path_resolution')
          return
        } else if (event.type === 'fix_ready') {
          setFixReady({
            threadId: String(event.thread_id),
            patchedManifest: String(event.patched_manifest ?? ''),
            currentManifest: String(event.current_manifest ?? ''),
            findings: (event.findings ?? []) as unknown[],
          })
          setStep('review')
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
      if (!abortRef.current && step !== 'review') setStep('done')
    } catch (err) {
      if (!abortRef.current) {
        setError(err instanceof Error ? err.message : 'Erro no pipeline de remediação')
        setStep('error')
      }
    }
  }

  const confirmRemediation = async (approved: boolean) => {
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

  const submitManifestPath = async () => {
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
            findings: (event.findings ?? []) as unknown[],
          })
          setStep('review')
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

  // Botões de ação separados do conteúdo scrollável para ficarem sempre visíveis
  const footer = (() => {
    if (step === 'config') return (
      <div className="flex justify-end gap-2">
        <ButtonDefault label="Cancelar" visual="secondary" onClick={onClose} />
        <ButtonDefault label="Iniciar remediação" onClick={() => void startRemediation()} disabled={!repoUrl.trim() || selectedIds.length === 0} />
      </div>
    )
    if (step === 'path_resolution') return (
      <div className="flex justify-end gap-2">
        <ButtonDefault label="Cancelar" visual="secondary" onClick={onClose} />
        <ButtonDefault label="Confirmar e continuar" onClick={() => void submitManifestPath()} disabled={!manifestPath.trim()} />
      </div>
    )
    if (step === 'review') return (
      <div className="flex justify-end gap-2">
        <ButtonDefault label="Rejeitar" visual="secondary" onClick={() => void confirmRemediation(false)} />
        <ButtonDefault label="Confirmar e abrir PR" onClick={() => void confirmRemediation(true)} />
      </div>
    )
    if (step === 'done') return (
      <div className="flex items-center gap-2">
        {(prResult?.prUrl || existingPrUrl) && (
          <a href={prResult?.prUrl ?? existingPrUrl ?? ''} target="_blank" rel="noreferrer">
            <ButtonDefault label={prResult ? `Abrir PR #${prResult.prNumber}` : 'Ver PR existente'} icon={ExternalLink} />
          </a>
        )}
        <ButtonDefault label="Fechar" visual="secondary" onClick={onClose} />
      </div>
    )
    if (step === 'error') return (
      <div className="flex gap-2">
        <ButtonDefault label="Tentar novamente" icon={RotateCcw} onClick={() => setStep('config')} />
        <ButtonDefault label="Fechar" visual="secondary" onClick={onClose} />
      </div>
    )
    return null
  })()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="flex w-full max-w-2xl flex-col rounded-3xl shadow-2xl" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', maxHeight: '90vh' }}>
        <div className="flex shrink-0 items-center justify-between gap-4 border-b px-6 py-5" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgba(var(--color-primary-rgb, 99,102,241),0.1)' }}>
              <GitPullRequest size={16} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>Corrigir com ARIA</p>
              <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{workload.name} · {workload.namespace}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-2xl transition-colors hover:opacity-70" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {step === 'config' && (
            <>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>URL do repositório *</label>
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={e => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/org/repo"
                    className="mt-2 w-full rounded-2xl px-4 py-3 text-sm outline-none transition-colors"
                    style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>Caminho do manifesto (sobrescrito pelo .titlis/service.yaml se existir)</label>
                  <input
                    type="text"
                    value={manifestPath}
                    onChange={e => setManifestPath(e.target.value)}
                    className="mt-2 w-full rounded-2xl px-4 py-3 text-sm outline-none transition-colors"
                    style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-muted-foreground)' }}>Findings a corrigir</p>
                <div className="space-y-2">
                  {remediableFindings.map(f => (
                    <label key={f.ruleId} className="flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--color-muted)' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(f.ruleId)}
                        onChange={() => toggleFinding(f.ruleId)}
                        className="h-4 w-4 accent-primary"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>{f.ruleName}</p>
                        <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{f.ruleId} · {f.pillar}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 'running' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                <span className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                  {currentNode ? (NODE_LABELS[currentNode] ?? currentNode) : 'Iniciando pipeline...'}
                </span>
              </div>
              <div className="space-y-1.5">
                {completedNodes.filter((n, i, a) => a.indexOf(n) === i).map(node => (
                  <div key={node} className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                    <CheckCircle2 size={12} style={{ color: '#10b981' }} />
                    {NODE_LABELS[node] ?? node}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'path_resolution' && pathRequired && (
            <div className="space-y-4">
              <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'rgba(var(--color-primary-rgb, 99,102,241),0.08)' }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--color-muted-foreground)' }}>Ambiente detectado</p>
                <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{pathRequired.detectedEnvironment}</p>
              </div>
              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                Não encontrei .titlis/service.yaml no repositório. Em qual arquivo de manifesto devo aplicar a correção?
              </p>
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>Caminho do manifesto *</label>
                <input
                  type="text"
                  value={manifestPath}
                  onChange={e => setManifestPath(e.target.value)}
                  placeholder="ex: manifests/kubernetes/dev/deploy.yaml"
                  className="mt-2 w-full rounded-2xl px-4 py-3 text-sm outline-none transition-colors"
                  style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
                />
              </div>
            </div>
          )}

          {step === 'review' && fixReady && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>Diff gerado pela IA</p>
                <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest">
                  <span className="flex items-center gap-1" style={{ color: '#059669' }}><span>+</span> adicionado</span>
                  <span className="flex items-center gap-1" style={{ color: '#dc2626' }}><span>−</span> removido</span>
                </div>
              </div>
              {fixReady.currentManifest
                ? <DiffView current={fixReady.currentManifest} patched={fixReady.patchedManifest} />
                : (
                  <div className="space-y-2">
                    <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Manifest atual não disponível — exibindo apenas o proposto.</p>
                    <pre className="max-w-full overflow-auto rounded-2xl p-4 text-xs" style={{ backgroundColor: 'rgba(16,185,129,0.06)', color: 'var(--color-foreground)', maxHeight: '300px' }}>
                      {fixReady.patchedManifest || 'Não disponível'}
                    </pre>
                  </div>
                )
              }
            </div>
          )}

          {step === 'confirming' && (
            <div className="flex items-center gap-3">
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
              <span className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                {currentNode ? (NODE_LABELS[currentNode] ?? currentNode) : 'Processando...'}
              </span>
            </div>
          )}

          {step === 'done' && (
            <div className="flex items-center gap-3">
              <CheckCircle2 size={20} style={{ color: '#10b981' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                {prResult ? 'Pull Request criado com sucesso!' : existingPrUrl ? 'PR existente encontrado' : 'Concluído'}
              </p>
            </div>
          )}

          {step === 'error' && (
            <div className="rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#dc2626' }}>
              {error}
            </div>
          )}
        </div>

        {footer && (
          <div className="shrink-0 border-t px-6 py-4" style={{ borderColor: 'var(--color-border)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
