import { useRef, useState } from 'react'
import { CheckCircle2, ExternalLink, GitPullRequest, Loader2, X } from 'lucide-react'
import { ButtonDefault } from '@/components/jeitto/ButtonDefault'
import { api } from '@/lib/api'
import type { Finding, WorkloadDetail } from '@/types'

type Step = 'config' | 'running' | 'review' | 'confirming' | 'done' | 'error'

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="flex w-full max-w-2xl flex-col rounded-3xl shadow-2xl" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', maxHeight: '90vh' }}>
        <div className="flex items-center justify-between gap-4 border-b px-6 py-5" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgba(var(--color-primary-rgb, 99,102,241),0.1)' }}>
              <GitPullRequest size={16} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>Corrigir com IA</p>
              <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{workload.name} · {workload.namespace}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-2xl transition-colors hover:opacity-70" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
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
                  <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>Caminho do manifesto</label>
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
                        className="h-4 w-4 accent-[var(--color-primary)]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>{f.ruleName}</p>
                        <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{f.ruleId} · {f.pillar}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <ButtonDefault label="Cancelar" visual="secondary" onClick={onClose} />
                <ButtonDefault
                  label="Iniciar remediação"
                  onClick={() => void startRemediation()}
                  disabled={!repoUrl.trim() || selectedIds.length === 0}
                />
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

          {step === 'review' && fixReady && (
            <div className="space-y-4">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>Revise o patch gerado pela IA</p>

              <div className="space-y-3">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#ef4444' }}>Atual</p>
                  <pre className="overflow-auto rounded-2xl p-4 text-xs" style={{ backgroundColor: 'rgba(239,68,68,0.06)', color: 'var(--color-foreground)', maxHeight: '180px' }}>
                    {fixReady.currentManifest || 'Não disponível'}
                  </pre>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#10b981' }}>Proposto</p>
                  <pre className="overflow-auto rounded-2xl p-4 text-xs" style={{ backgroundColor: 'rgba(16,185,129,0.06)', color: 'var(--color-foreground)', maxHeight: '180px' }}>
                    {fixReady.patchedManifest || 'Não disponível'}
                  </pre>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <ButtonDefault label="Rejeitar" visual="secondary" onClick={() => void confirmRemediation(false)} />
                <ButtonDefault label="Confirmar e abrir PR" onClick={() => void confirmRemediation(true)} />
              </div>
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
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={20} style={{ color: '#10b981' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                  {prResult ? 'Pull Request criado com sucesso!' : existingPrUrl ? 'PR existente encontrado' : 'Concluído'}
                </p>
              </div>
              {(prResult?.prUrl || existingPrUrl) && (
                <a href={prResult?.prUrl ?? existingPrUrl ?? ''} target="_blank" rel="noreferrer">
                  <ButtonDefault
                    label={prResult ? `Abrir PR #${prResult.prNumber}` : 'Ver PR existente'}
                    icon={ExternalLink}
                  />
                </a>
              )}
              <ButtonDefault label="Fechar" visual="secondary" onClick={onClose} />
            </div>
          )}

          {step === 'error' && (
            <div className="space-y-4">
              <div className="rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#dc2626' }}>
                {error}
              </div>
              <div className="flex gap-2">
                <ButtonDefault label="Tentar novamente" onClick={() => setStep('config')} />
                <ButtonDefault label="Fechar" visual="secondary" onClick={onClose} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
