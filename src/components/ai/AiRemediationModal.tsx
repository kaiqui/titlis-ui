import { useRef, useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronRight, ExternalLink, GitPullRequest, Loader2, RotateCcw, ShieldAlert, X } from 'lucide-react'
import { ButtonDefault } from '@/components/jeitto/ButtonDefault'
import { CodeDiffView } from '@/components/ai/CodeDiffView'
import { api } from '@/lib/api'
import type { Finding, RemediationDiffFile, ServiceYamlPrefill, WorkloadDetail } from '@/types'

type Step = 'config' | 'running' | 'service_yaml_form' | 'review' | 'confirming' | 'done' | 'error'

interface ServiceYamlRequired {
  threadId: string
  detectedEnvironment: string
  deploymentName: string
  namespace: string
  prefill: ServiceYamlPrefill
}

interface FixReady {
  threadId: string
  patchedManifest: string
  currentManifest: string
  files?: RemediationDiffFile[]
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
  const [serviceYamlRequired, setServiceYamlRequired] = useState<ServiceYamlRequired | null>(null)
  const [svcForm, setSvcForm] = useState<ServiceYamlPrefill | null>(null)
  const [svcFormAdvanced, setSvcFormAdvanced] = useState(false)
  const [fixReady, setFixReady] = useState<FixReady | null>(null)
  const [consentChecked, setConsentChecked] = useState(false)
  const [prResult, setPrResult] = useState<PrCreated | null>(null)
  const [existingPrUrl, setExistingPrUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef(false)

  const toggleFinding = (ruleId: string) => {
    setSelectedIds(prev =>
      prev.includes(ruleId) ? prev.filter(id => id !== ruleId) : [...prev, ruleId],
    )
  }

  function _parseFixReadyFiles(event: Record<string, unknown>): RemediationDiffFile[] | undefined {
    const rawFiles = event.files as Array<Record<string, unknown>> | undefined
    return rawFiles?.map(f => ({
      path: String(f.path ?? ''),
      current: String(f.current ?? ''),
      patched: String(f.patched ?? ''),
      isNew: Boolean(f.is_new),
    }))
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
        } else if (event.type === 'service_yaml_required') {
          const p = event.prefill as Record<string, unknown>
          const prefill: ServiceYamlPrefill = {
            name: String(p?.name ?? ''),
            team: String(p?.team ?? ''),
            namePattern: String(p?.name_pattern ?? ''),
            namespaces: (p?.namespaces as string[]) ?? [],
            env: String(p?.env ?? 'dev'),
            path: String(p?.path ?? ''),
            baseBranch: String(p?.base_branch ?? 'main'),
          }
          setServiceYamlRequired({
            threadId: String(event.thread_id),
            detectedEnvironment: String(event.detected_environment ?? 'desconhecido'),
            deploymentName: String(event.deployment_name ?? ''),
            namespace: String(event.namespace ?? ''),
            prefill,
          })
          setSvcForm(prefill)
          setStep('service_yaml_form')
          return
        } else if (event.type === 'fix_ready') {
          setFixReady({
            threadId: String(event.thread_id),
            patchedManifest: String(event.patched_manifest ?? ''),
            currentManifest: String(event.current_manifest ?? ''),
            files: _parseFixReadyFiles(event as Record<string, unknown>),
          })
          setConsentChecked(false)
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

  const submitServiceYaml = async () => {
    if (!serviceYamlRequired || !svcForm) return
    abortRef.current = false
    setStep('running')
    setError(null)

    try {
      const stream = api.ai.submitServiceYaml(serviceYamlRequired.threadId, {
        manifestPath: svcForm.path,
        baseBranch: svcForm.baseBranch,
        name: svcForm.name,
        team: svcForm.team,
        namespaces: svcForm.namespaces,
        namePattern: svcForm.namePattern,
        env: svcForm.env,
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
            files: _parseFixReadyFiles(event as Record<string, unknown>),
          })
          setConsentChecked(false)
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

  const footer = (() => {
    if (step === 'config') return (
      <div className="flex justify-end gap-2">
        <ButtonDefault label="Cancelar" visual="secondary" onClick={onClose} />
        <ButtonDefault label="Iniciar remediação" onClick={() => void startRemediation()} disabled={!repoUrl.trim() || selectedIds.length === 0} />
      </div>
    )
    if (step === 'service_yaml_form') return (
      <div className="flex justify-end gap-2">
        <ButtonDefault label="Cancelar" visual="secondary" onClick={onClose} />
        <ButtonDefault label="Continuar" onClick={() => void submitServiceYaml()} disabled={!svcForm?.name.trim() || !svcForm?.path.trim()} />
      </div>
    )
    if (step === 'review') return (
      <div className="flex justify-end gap-2">
        <ButtonDefault label="Rejeitar" visual="secondary" onClick={() => void confirmRemediation(false)} />
        <ButtonDefault label="Confirmar e abrir PR" disabled={!consentChecked} onClick={() => void confirmRemediation(true)} />
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

          {step === 'service_yaml_form' && serviceYamlRequired && svcForm && (
            <div className="space-y-5">
              <div className="rounded-2xl px-4 py-3 text-xs" style={{ backgroundColor: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', color: 'var(--color-muted-foreground)' }}>
                <p className="font-semibold mb-1" style={{ color: 'var(--color-foreground)' }}>
                  .titlis/service.yaml não encontrado — vamos criá-lo na mesma PR
                </p>
                <p>Ambiente detectado: <strong style={{ color: 'var(--color-foreground)' }}>{serviceYamlRequired.detectedEnvironment}</strong></p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>Nome *</label>
                  <input type="text" value={svcForm.name} onChange={e => setSvcForm(p => p ? { ...p, name: e.target.value } : p)}
                    className="mt-1.5 w-full rounded-2xl px-4 py-2.5 text-sm outline-none font-mono"
                    style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>Time *</label>
                  <input type="text" value={svcForm.team} onChange={e => setSvcForm(p => p ? { ...p, team: e.target.value } : p)}
                    className="mt-1.5 w-full rounded-2xl px-4 py-2.5 text-sm outline-none"
                    style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>Caminho do manifesto *</label>
                  <input type="text" value={svcForm.path} onChange={e => setSvcForm(p => p ? { ...p, path: e.target.value } : p)}
                    className="mt-1.5 w-full rounded-2xl px-4 py-2.5 text-sm outline-none font-mono"
                    style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>Branch base *</label>
                  <input type="text" value={svcForm.baseBranch} onChange={e => setSvcForm(p => p ? { ...p, baseBranch: e.target.value } : p)}
                    className="mt-1.5 w-full rounded-2xl px-4 py-2.5 text-sm outline-none font-mono"
                    style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }} />
                </div>
              </div>

              <button
                onClick={() => setSvcFormAdvanced(v => !v)}
                className="flex items-center gap-2 text-xs font-semibold transition-opacity hover:opacity-70"
                style={{ color: 'var(--color-muted-foreground)' }}
              >
                {svcFormAdvanced ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                Configurações avançadas
              </button>

              {svcFormAdvanced && (
                <div className="space-y-4 pl-2" style={{ borderLeft: '2px solid var(--color-border)' }}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>Ambiente</label>
                      <input type="text" value={svcForm.env} onChange={e => setSvcForm(p => p ? { ...p, env: e.target.value } : p)}
                        className="mt-1.5 w-full rounded-2xl px-4 py-2.5 text-sm outline-none font-mono"
                        style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>Padrão de nome (regex)</label>
                      <input type="text" value={svcForm.namePattern} onChange={e => setSvcForm(p => p ? { ...p, namePattern: e.target.value } : p)}
                        className="mt-1.5 w-full rounded-2xl px-4 py-2.5 text-sm outline-none font-mono"
                        style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>Namespaces (separados por vírgula)</label>
                    <input type="text"
                      value={svcForm.namespaces.join(', ')}
                      onChange={e => setSvcForm(p => p ? { ...p, namespaces: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } : p)}
                      className="mt-1.5 w-full rounded-2xl px-4 py-2.5 text-sm outline-none font-mono"
                      style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'review' && fixReady && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                  {fixReady.files && fixReady.files.length > 1 ? `${fixReady.files.length} arquivos — revise o diff` : 'Diff gerado pela IA'}
                </p>
              </div>

              <div className="space-y-3">
                {fixReady.files && fixReady.files.length > 0
                  ? fixReady.files.map((f, i) => <CodeDiffView key={i} file={f} />)
                  : (
                    fixReady.currentManifest
                      ? <CodeDiffView file={{ path: 'deploy.yaml', current: fixReady.currentManifest, patched: fixReady.patchedManifest, isNew: false }} />
                      : (
                        <div className="space-y-2">
                          <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Manifest atual não disponível — exibindo apenas o proposto.</p>
                          <pre className="max-w-full overflow-auto rounded-2xl p-4 text-xs" style={{ backgroundColor: 'rgba(16,185,129,0.06)', color: 'var(--color-foreground)', maxHeight: '300px' }}>
                            {fixReady.patchedManifest || 'Não disponível'}
                          </pre>
                        </div>
                      )
                  )
                }
              </div>

              {/* Consent gate */}
              <div className="rounded-2xl px-4 py-3 space-y-3" style={{ backgroundColor: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <div className="flex items-start gap-2">
                  <ShieldAlert size={14} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }} />
                  <div className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                    <p className="font-semibold mb-1" style={{ color: 'var(--color-foreground)' }}>Ação sensível — abrirá PR no repositório</p>
                    <ul className="space-y-0.5">
                      {(fixReady.files?.length ? fixReady.files : [{ path: 'deploy.yaml', isNew: false }]).map((f, i) => (
                        <li key={i} className="flex items-center gap-2 font-mono">
                          {(f as RemediationDiffFile).isNew ? <span style={{ color: '#10b981' }}>+</span> : <span style={{ color: '#f59e0b' }}>~</span>}
                          {f.path}
                          {(f as RemediationDiffFile).isNew && <span style={{ color: '#10b981' }}>(novo)</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input type="checkbox" checked={consentChecked} onChange={e => setConsentChecked(e.target.checked)} className="h-4 w-4 accent-primary" />
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>Revisei e aprovo os arquivos desta PR</span>
                </label>
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
