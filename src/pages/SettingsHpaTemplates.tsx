import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronDown, ChevronRight, Pencil, Plus } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { ButtonDefault } from '@/components/jeitto/ButtonDefault'
import { Card } from '@/components/jeitto/Card'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { api } from '@/lib/api'
import type { HpaTemplate, HpaTemplatePayload } from '@/lib/api'

const ENVIRONMENTS = ['dev', 'hml', 'prd'] as const
const CRITICALITIES = ['low', 'medium', 'high', 'critical'] as const

type Environment = typeof ENVIRONMENTS[number]
type Criticality = typeof CRITICALITIES[number]

interface TemplateForm {
  minReplicas: string
  maxReplicas: string
  targetCpuPct: string
  targetMemPct: string
}

const defaultForm = (): TemplateForm => ({
  minReplicas: '1',
  maxReplicas: '10',
  targetCpuPct: '70',
  targetMemPct: '',
})

function envLabel(env: string): string {
  switch (env) {
    case 'dev': return 'Desenvolvimento'
    case 'hml': return 'Homologação'
    case 'prd': return 'Produção'
    default:    return env
  }
}

function critLabel(crit: string): string {
  switch (crit) {
    case 'low':      return 'Baixa'
    case 'medium':   return 'Média'
    case 'high':     return 'Alta'
    case 'critical': return 'Crítica'
    default:         return crit
  }
}

function critColor(crit: string): { bg: string; text: string } {
  switch (crit) {
    case 'low':      return { bg: 'rgba(148,163,184,0.12)', text: '#64748b' }
    case 'medium':   return { bg: 'rgba(251,191,36,0.12)',  text: '#b45309' }
    case 'high':     return { bg: 'rgba(249,115,22,0.12)',  text: '#c2410c' }
    case 'critical': return { bg: 'rgba(239,68,68,0.12)',   text: '#b91c1c' }
    default:         return { bg: 'rgba(148,163,184,0.12)', text: '#64748b' }
  }
}

function findTemplate(templates: HpaTemplate[], env: string, crit: string): HpaTemplate | undefined {
  return templates.find(t => t.environment === env && t.criticality === crit)
}

function templateToForm(t: HpaTemplate): TemplateForm {
  return {
    minReplicas: String(t.minReplicas),
    maxReplicas: String(t.maxReplicas),
    targetCpuPct: String(t.targetCpuPct),
    targetMemPct: t.targetMemPct > 0 ? String(t.targetMemPct) : '',
  }
}

function configuredCount(templates: HpaTemplate[], env: string): number {
  return CRITICALITIES.filter(c => findTemplate(templates, env, c)).length
}

function ProgressBadge({ count, total }: { count: number; total: number }) {
  const all = count === total
  const none = count === 0
  const bg  = all  ? 'rgba(34,197,94,0.1)'  : none ? 'rgba(148,163,184,0.1)' : 'rgba(251,191,36,0.1)'
  const col = all  ? '#16a34a'               : none ? '#64748b'               : '#b45309'
  return (
    <span className="ml-2 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums"
      style={{ background: bg, color: col }}>
      {count}/{total}
    </span>
  )
}

function InlineEditor({
  env,
  crit,
  existing,
  onSave,
  saving,
  onCancel,
}: {
  env: Environment
  crit: Criticality
  existing: HpaTemplate | undefined
  onSave: (payload: HpaTemplatePayload) => void
  saving: boolean
  onCancel: () => void
}) {
  const [form, setForm] = useState<TemplateForm>(existing ? templateToForm(existing) : defaultForm())

  useEffect(() => {
    setForm(existing ? templateToForm(existing) : defaultForm())
  }, [existing])

  const set = (field: keyof TemplateForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSave = () => {
    onSave({
      environment: env,
      criticality: crit,
      min_replicas: parseInt(form.minReplicas, 10) || 1,
      max_replicas: parseInt(form.maxReplicas, 10) || 10,
      target_cpu_pct: parseInt(form.targetCpuPct, 10) || 70,
      target_mem_pct: form.targetMemPct ? parseInt(form.targetMemPct, 10) : undefined,
    })
  }

  const inputCls = 'w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400'
  const inputStyle = { borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }

  return (
    <div className="mt-3 rounded-2xl border p-4 space-y-3"
      style={{ borderColor: 'var(--color-border)', background: 'rgba(59,130,246,0.03)' }}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([
          { field: 'minReplicas'  as const, label: 'Min réplicas' },
          { field: 'maxReplicas'  as const, label: 'Max réplicas' },
          { field: 'targetCpuPct' as const, label: 'CPU alvo (%)' },
          { field: 'targetMemPct' as const, label: 'Mem alvo (%) — opc.' },
        ] as const).map(({ field, label }) => (
          <div key={field} className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
              {label}
            </label>
            <input
              type="number"
              min={1}
              max={field.includes('Pct') ? 100 : undefined}
              placeholder={field === 'targetMemPct' ? '—' : undefined}
              value={form[field]}
              onChange={set(field)}
              className={inputCls}
              style={inputStyle}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-3 py-1.5 text-sm"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          Cancelar
        </button>
        <ButtonDefault label={saving ? 'Salvando...' : 'Salvar'} onClick={handleSave} disabled={saving} />
      </div>
    </div>
  )
}

function CriticalityRow({
  env,
  crit,
  template,
  onSave,
  savingKey,
}: {
  env: Environment
  crit: Criticality
  template: HpaTemplate | undefined
  onSave: (payload: HpaTemplatePayload) => void
  savingKey: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const key = `${env}:${crit}`
  const saving = savingKey === key
  const colors = critColor(crit)

  const handleSave = (payload: HpaTemplatePayload) => {
    onSave(payload)
    setExpanded(false)
  }

  return (
    <div className="rounded-2xl border transition-all"
      style={{ borderColor: expanded ? 'rgba(59,130,246,0.3)' : 'var(--color-border)', background: 'var(--color-card)' }}>
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <span className="rounded-lg px-2 py-0.5 text-xs font-semibold"
          style={{ background: colors.bg, color: colors.text }}>
          {critLabel(crit)}
        </span>

        {template ? (
          <span className="flex flex-1 flex-wrap gap-x-4 gap-y-0.5 text-sm tabular-nums"
            style={{ color: 'var(--color-foreground)' }}>
            <span>min <strong>{template.minReplicas}</strong></span>
            <span>max <strong>{template.maxReplicas}</strong></span>
            <span>cpu <strong>{template.targetCpuPct}%</strong></span>
            {template.targetMemPct > 0 && <span>mem <strong>{template.targetMemPct}%</strong></span>}
          </span>
        ) : (
          <span className="flex-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            Não configurado
          </span>
        )}

        <span className="ml-auto flex shrink-0 items-center gap-1.5 text-xs"
          style={{ color: 'var(--color-muted-foreground)' }}>
          {template ? (
            <>
              <Pencil size={12} />
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </>
          ) : (
            <>
              <Plus size={12} />
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </>
          )}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          <InlineEditor
            env={env}
            crit={crit}
            existing={template}
            onSave={handleSave}
            saving={saving}
            onCancel={() => setExpanded(false)}
          />
        </div>
      )}
    </div>
  )
}

export function SettingsHpaTemplates() {
  const queryClient = useQueryClient()
  const [activeEnv, setActiveEnv] = useState<Environment>('dev')
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const { data: templates, isLoading, error } = useQuery({
    queryKey: ['hpa-templates'],
    queryFn: api.hpaTemplates.list,
  })

  const upsertMutation = useMutation({
    mutationFn: (payload: HpaTemplatePayload) => api.hpaTemplates.upsert(payload),
    onSuccess: () => {
      setFeedback({ tone: 'success', message: 'Template salvo.' })
      void queryClient.invalidateQueries({ queryKey: ['hpa-templates'] })
      setTimeout(() => setFeedback(null), 3000)
    },
    onError: (err) => {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Não foi possível salvar.' })
    },
    onSettled: () => setSavingKey(null),
  })

  if (isLoading) return <PageLoading />
  if (error) return <PageError message={error instanceof Error ? error.message : 'Erro ao carregar templates.'} />

  const list = templates ?? []
  const totalConfigured = ENVIRONMENTS.reduce((acc, env) => acc + configuredCount(list, env), 0)
  const totalPossible = ENVIRONMENTS.length * CRITICALITIES.length

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header
        title="Templates de HPA"
        subtitle="Valores de fallback usados quando não há dados do Datadog para recomendar HPA."
      />

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-3xl space-y-5">

          {/* progresso geral */}
          <div className="flex items-center justify-between rounded-2xl border px-4 py-3"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
            <span className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              Cobertura total
            </span>
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-40 overflow-hidden rounded-full" style={{ background: 'var(--color-border)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.round((totalConfigured / totalPossible) * 100)}%`,
                    background: totalConfigured === totalPossible ? '#16a34a' : totalConfigured === 0 ? '#94a3b8' : '#d97706',
                  }}
                />
              </div>
              <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--color-foreground)' }}>
                {totalConfigured}/{totalPossible}
              </span>
            </div>
          </div>

          {feedback && (
            <div
              className="rounded-2xl border px-4 py-3 text-sm"
              style={{
                borderColor: feedback.tone === 'success' ? 'rgba(34,197,94,0.22)' : 'rgba(239,68,68,0.22)',
                color: feedback.tone === 'success' ? '#16a34a' : '#dc2626',
                background: feedback.tone === 'success' ? 'rgba(240,253,244,0.8)' : 'rgba(254,242,242,0.8)',
              }}
            >
              <div className="flex items-center gap-2">
                {feedback.tone === 'success' && <Check size={14} />}
                {feedback.message}
              </div>
            </div>
          )}

          <Card>
            {/* tabs */}
            <div className="flex border-b" style={{ borderColor: 'var(--color-border)' }}>
              {ENVIRONMENTS.map(env => {
                const count = configuredCount(list, env)
                const active = activeEnv === env
                return (
                  <button
                    key={env}
                    type="button"
                    onClick={() => setActiveEnv(env)}
                    className="flex items-center gap-1 px-5 py-3.5 text-sm font-medium transition-colors"
                    style={{
                      color: active ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
                      borderBottom: active ? '2px solid var(--color-primary)' : '2px solid transparent',
                      marginBottom: '-1px',
                    }}
                  >
                    {envLabel(env)}
                    <ProgressBadge count={count} total={CRITICALITIES.length} />
                  </button>
                )
              })}
            </div>

            {/* conteúdo do tab */}
            <div className="space-y-2 p-4">
              {CRITICALITIES.map(crit => (
                <CriticalityRow
                  key={`${activeEnv}:${crit}`}
                  env={activeEnv}
                  crit={crit}
                  template={findTemplate(list, activeEnv, crit)}
                  savingKey={savingKey}
                  onSave={(payload) => {
                    setSavingKey(`${activeEnv}:${crit}`)
                    upsertMutation.mutate(payload)
                  }}
                />
              ))}
            </div>
          </Card>

        </div>
      </div>
    </div>
  )
}
