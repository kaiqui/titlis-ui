import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save, Wrench } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { ButtonDefault } from '@/components/jeitto/ButtonDefault'
import { Card, CardHeader, CardTitle } from '@/components/jeitto/Card'
import { EmptyState } from '@/components/jeitto/EmptyState'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { api } from '@/lib/api'
import type { AutoRemediationPolicy } from '@/lib/api'

const MODES = ['disabled', 'discovery_only', 'open_pr', 'auto_merge'] as const
const CASCADE_OPTIONS = ['dev', 'hml', 'prd'] as const

type Mode = typeof MODES[number]
type Cascade = typeof CASCADE_OPTIONS[number]

function modeLabel(mode: string): string {
  switch (mode) {
    case 'disabled':       return 'Desabilitado'
    case 'discovery_only': return 'Apenas descoberta'
    case 'open_pr':        return 'Abrir PR'
    case 'auto_merge':     return 'Auto-merge'
    default:               return mode
  }
}

function modeDescription(mode: string): string {
  switch (mode) {
    case 'disabled':       return 'Nenhuma ação automática. Apenas campanhas manuais.'
    case 'discovery_only': return 'Descobre divergências mas não abre PRs.'
    case 'open_pr':        return 'Abre PRs automaticamente. Merge manual obrigatório.'
    case 'auto_merge':     return 'Abre e mergeia PRs respeitando o cascade configurado.'
    default:               return ''
  }
}

function cascadeLabel(c: string): string {
  switch (c) {
    case 'dev': return 'Apenas dev'
    case 'hml': return 'dev → hml'
    case 'prd': return 'dev → hml → prd (com aprovação)'
    default:    return c
  }
}

interface PolicyForm {
  mode: Mode
  cascadeUpTo: Cascade
  maxPrsPerDay: string
  maxDeltaPct: string
  requirePrChecksGreen: boolean
}

function policyToForm(p: AutoRemediationPolicy): PolicyForm {
  return {
    mode: p.mode as Mode,
    cascadeUpTo: p.cascade_up_to as Cascade,
    maxPrsPerDay: String(p.max_prs_per_day),
    maxDeltaPct: p.auto_merge_max_delta_pct != null ? String(p.auto_merge_max_delta_pct) : '20',
    requirePrChecksGreen: p.require_pr_checks_green,
  }
}

function defaultForm(): PolicyForm {
  return {
    mode: 'disabled',
    cascadeUpTo: 'dev',
    maxPrsPerDay: '10',
    maxDeltaPct: '20',
    requirePrChecksGreen: true,
  }
}

export function SettingsAutoRemediation() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<PolicyForm>(defaultForm())
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const { data: policies, isLoading, error } = useQuery({
    queryKey: ['auto-remediation'],
    queryFn: api.autoRemediation.list,
  })

  const saveMutation = useMutation({
    mutationFn: (policy: AutoRemediationPolicy) => api.autoRemediation.update(policy),
    onSuccess: () => {
      setFeedback({ tone: 'success', message: 'Política salva com sucesso.' })
      void queryClient.invalidateQueries({ queryKey: ['auto-remediation'] })
    },
    onError: (err) => {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Não foi possível salvar.' })
    },
  })

  const existingPolicy = policies?.[0]

  useEffect(() => {
    if (existingPolicy) {
      setForm(policyToForm(existingPolicy))
    }
  }, [existingPolicy])

  const handleSave = () => {
    const policy: AutoRemediationPolicy = {
      rule_id: 'PERF-004',
      environment: null,
      mode: form.mode,
      cascade_up_to: form.cascadeUpTo,
      max_prs_per_day: parseInt(form.maxPrsPerDay, 10) || 10,
      auto_merge_max_delta_pct: form.mode === 'auto_merge' ? parseInt(form.maxDeltaPct, 10) || 20 : null,
      require_pr_checks_green: form.requirePrChecksGreen,
    }
    saveMutation.mutate(policy)
  }

  const inputClass = 'w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400'
  const inputStyle = { borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }

  if (isLoading) return <PageLoading />
  if (error) return <PageError message={error instanceof Error ? error.message : 'Erro ao carregar configuração.'} />

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header
        title="Auto-Remediação"
        subtitle="Configure como o Titlis responde automaticamente a divergências de HPA encontradas."
      />

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-2xl space-y-6">

          {feedback && (
            <div
              className="rounded-2xl border px-4 py-3 text-sm"
              style={{
                borderColor: feedback.tone === 'success' ? 'rgba(34,197,94,0.22)' : 'rgba(239,68,68,0.22)',
                color: feedback.tone === 'success' ? '#16a34a' : '#dc2626',
                background: feedback.tone === 'success' ? 'rgba(240,253,244,0.8)' : 'rgba(254,242,242,0.8)',
              }}
            >
              {feedback.message}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Política para PERF-004</CardTitle>
            </CardHeader>
            <div className="p-5 space-y-5">

              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                  Modo de operação
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {MODES.map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, mode }))}
                      className="flex flex-col items-start rounded-[1.2rem] border p-3 text-left transition-colors"
                      style={{
                        borderColor: form.mode === mode ? 'var(--color-primary)' : 'var(--color-border)',
                        background: form.mode === mode ? 'rgba(59,130,246,0.06)' : 'var(--color-card)',
                      }}
                    >
                      <span className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                        {modeLabel(mode)}
                      </span>
                      <span className="mt-0.5 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                        {modeDescription(mode)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {(form.mode === 'open_pr' || form.mode === 'auto_merge') && (
                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                    Cascade até
                  </label>
                  <div className="flex flex-col gap-2">
                    {CASCADE_OPTIONS.map(c => (
                      <label key={c} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="cascade"
                          value={c}
                          checked={form.cascadeUpTo === c}
                          onChange={() => setForm(prev => ({ ...prev, cascadeUpTo: c }))}
                          className="h-4 w-4"
                        />
                        <span className="text-sm" style={{ color: 'var(--color-foreground)' }}>
                          {cascadeLabel(c)}
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
                    Produção nunca é mergeado automaticamente em descoberta — sempre requer aprovação humana.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
                    Máx. PRs por dia
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={form.maxPrsPerDay}
                    onChange={e => setForm(prev => ({ ...prev, maxPrsPerDay: e.target.value }))}
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>

                {form.mode === 'auto_merge' && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
                      Delta máx. para auto-merge (%)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={form.maxDeltaPct}
                      onChange={e => setForm(prev => ({ ...prev, maxDeltaPct: e.target.value }))}
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                )}
              </div>

              {form.mode === 'auto_merge' && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.requirePrChecksGreen}
                    onChange={e => setForm(prev => ({ ...prev, requirePrChecksGreen: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  <div>
                    <span className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                      Exigir CI verde antes do merge
                    </span>
                    <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                      Recomendado. Só mergeia se todos os checks do PR passarem.
                    </p>
                  </div>
                </label>
              )}

              <div className="flex justify-end pt-2">
                <ButtonDefault
                  label={saveMutation.isPending ? 'Salvando...' : 'Salvar política'}
                  icon={Save}
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                />
              </div>
            </div>
          </Card>

          {!existingPolicy && (
            <Card>
              <div className="p-5">
                <EmptyState
                  icon={Wrench}
                  title="Nenhuma política configurada"
                  description="Configure acima como o Titlis deve responder automaticamente a divergências de HPA."
                />
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
