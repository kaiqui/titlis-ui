import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save, Server } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { ButtonDefault } from '@/components/jeitto/ButtonDefault'
import { Card, CardHeader, CardTitle } from '@/components/jeitto/Card'
import { EmptyState } from '@/components/jeitto/EmptyState'
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

function templateKey(env: string, crit: string): string {
  return `${env}:${crit}`
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

function TemplateEditor({
  env,
  crit,
  existing,
  onSave,
  saving,
}: {
  env: Environment
  crit: Criticality
  existing: HpaTemplate | undefined
  onSave: (payload: HpaTemplatePayload) => void
  saving: boolean
}) {
  const [form, setForm] = useState<TemplateForm>(
    existing ? templateToForm(existing) : defaultForm()
  )

  useEffect(() => {
    setForm(existing ? templateToForm(existing) : defaultForm())
  }, [existing])

  const set = (field: keyof TemplateForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  const handleSave = () => {
    const payload: HpaTemplatePayload = {
      environment: env,
      criticality: crit,
      min_replicas: parseInt(form.minReplicas, 10) || 1,
      max_replicas: parseInt(form.maxReplicas, 10) || 10,
      target_cpu_pct: parseInt(form.targetCpuPct, 10) || 70,
      target_mem_pct: form.targetMemPct ? parseInt(form.targetMemPct, 10) : undefined,
    }
    onSave(payload)
  }

  const inputClass = 'w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400'

  return (
    <div
      className="rounded-[1.4rem] border p-4 space-y-3"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
          {envLabel(env)} · {critLabel(crit)}
        </span>
        {existing && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a' }}>
            configurado
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
            Min réplicas
          </label>
          <input
            type="number"
            min={1}
            value={form.minReplicas}
            onChange={set('minReplicas')}
            className={inputClass}
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
            Max réplicas
          </label>
          <input
            type="number"
            min={1}
            value={form.maxReplicas}
            onChange={set('maxReplicas')}
            className={inputClass}
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
            CPU alvo (%)
          </label>
          <input
            type="number"
            min={1}
            max={100}
            value={form.targetCpuPct}
            onChange={set('targetCpuPct')}
            className={inputClass}
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
            Mem alvo (%) <span style={{ color: 'var(--color-muted-foreground)' }}>(opc.)</span>
          </label>
          <input
            type="number"
            min={1}
            max={100}
            placeholder="—"
            value={form.targetMemPct}
            onChange={set('targetMemPct')}
            className={inputClass}
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <ButtonDefault label="Salvar" icon={Save} onClick={handleSave} disabled={saving} />
      </div>
    </div>
  )
}

export function SettingsHpaTemplates() {
  const queryClient = useQueryClient()
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const { data: templates, isLoading, error } = useQuery({
    queryKey: ['hpa-templates'],
    queryFn: api.hpaTemplates.list,
  })

  const upsertMutation = useMutation({
    mutationFn: (payload: HpaTemplatePayload) => api.hpaTemplates.upsert(payload),
    onSuccess: () => {
      setFeedback({ tone: 'success', message: 'Template salvo com sucesso.' })
      void queryClient.invalidateQueries({ queryKey: ['hpa-templates'] })
    },
    onError: (err) => {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Não foi possível salvar.' })
    },
    onSettled: () => setSavingKey(null),
  })

  if (isLoading) return <PageLoading />
  if (error) return <PageError message={error instanceof Error ? error.message : 'Erro ao carregar templates.'} />

  const list = templates ?? []

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header
        title="Templates de HPA"
        subtitle="Valores padrão de HPA por ambiente e criticidade, usados quando não há dados do Datadog."
      />

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-4xl space-y-6">

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

          {list.length === 0 && !isLoading && (
            <Card>
              <EmptyState
                icon={Server}
                title="Nenhum template configurado"
                description="Configure templates de HPA por ambiente. Serão usados como fallback quando não há dados do Datadog."
              />
            </Card>
          )}

          {ENVIRONMENTS.map(env => (
            <Card key={env}>
              <CardHeader>
                <CardTitle>{envLabel(env)}</CardTitle>
              </CardHeader>
              <div className="p-4 space-y-3">
                {CRITICALITIES.map(crit => (
                  <TemplateEditor
                    key={templateKey(env, crit)}
                    env={env}
                    crit={crit}
                    existing={findTemplate(list, env, crit)}
                    onSave={(payload) => {
                      setSavingKey(templateKey(env, crit))
                      upsertMutation.mutate(payload)
                    }}
                    saving={savingKey === templateKey(env, crit) && upsertMutation.isPending}
                  />
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
