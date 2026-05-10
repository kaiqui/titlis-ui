import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Check, SlidersHorizontal } from 'lucide-react'
import { ButtonDefault } from '@/components/jeitto/ButtonDefault'
import { Card } from '@/components/jeitto/Card'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { Header } from '@/components/layout/Header'
import { useAuth } from '@/contexts/useAuth'
import { useScoreConfigOverrides, useScoreConfigRules, useScoreConfigWeights } from '@/hooks/useApi'
import { api } from '@/lib/api'
import type { ScoreConfigRule } from '@/lib/api'

const PILLAR_LABELS: Record<string, string> = {
  resilience: 'Resiliência',
  security: 'Segurança',
  performance: 'Desempenho',
  operational: 'Operacional',
}

const PILLAR_ORDER = ['resilience', 'security', 'performance', 'operational']

const SEVERITY_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  error:    { label: 'Erro',       color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
  warning:  { label: 'Aviso',      color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
  info:     { label: 'Info',       color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  critical: { label: 'Crítico',    color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
}

const DEFAULT_WEIGHTS: Record<string, number> = {
  resilience: 40,
  security: 30,
  performance: 20,
  operational: 10,
}

const MIN_WEIGHT = 5
const MAX_WEIGHT = 60

function Toggle({ enabled, onChange, loading }: { enabled: boolean; onChange: () => void; loading?: boolean }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={loading}
      className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-40"
      style={{ backgroundColor: enabled ? 'var(--color-primary)' : 'rgba(255,255,255,0.15)' }}
      aria-pressed={enabled}
    >
      <span
        className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200"
        style={{ transform: enabled ? 'translateX(20px)' : 'translateX(0)' }}
      />
    </button>
  )
}

function RulesTab() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { data: rules = [], isLoading: rulesLoading, error: rulesError } = useScoreConfigRules()
  const { data: overrides = [], isLoading: overridesLoading } = useScoreConfigOverrides()
  const [toggling, setToggling] = useState<string | null>(null)

  const tenantOverrideMap = useMemo(() => {
    const map = new Map<string, typeof overrides[0]>()
    for (const o of overrides) {
      if (o.scope === 'tenant') map.set(o.rule_id, o)
    }
    return map
  }, [overrides])

  const effectiveEnabled = (rule: ScoreConfigRule) => {
    const override = tenantOverrideMap.get(rule.rule_id)
    return override != null ? override.enabled : rule.enabled_by_default
  }

  const handleToggle = async (rule: ScoreConfigRule) => {
    setToggling(rule.rule_id)
    try {
      const current = effectiveEnabled(rule)
      const newState = !current
      const createdBy = user?.email ?? 'admin'

      // Delete all existing overrides for this rule at any scope so sub-scope
      // overrides don't conflict with the new tenant-level setting.
      const ruleOverrides = overrides.filter(o => o.rule_id === rule.rule_id)
      await Promise.all(ruleOverrides.map(o => api.scoreConfig.deleteOverride(o.id)))

      // Only create a tenant override when the desired state differs from the rule default.
      if (newState !== rule.enabled_by_default) {
        await api.scoreConfig.createOverride({
          engine_id: rule.engine_id,
          rule_id: rule.rule_id,
          scope: 'tenant',
          enabled: newState,
          created_by: createdBy,
        })
      }
      await queryClient.invalidateQueries({ queryKey: ['score-config', 'overrides'] })
    } finally {
      setToggling(null)
    }
  }

  if (rulesLoading || overridesLoading) return <PageLoading />
  if (rulesError) return <PageError message="Não foi possível carregar as regras." />

  const byPillar = PILLAR_ORDER.map(pillar => ({
    pillar,
    rules: rules.filter(r => r.pillar === pillar),
  })).filter(g => g.rules.length > 0)

  const customCount = overrides.filter(o => o.scope === 'tenant').length

  return (
    <div className="space-y-4">
      {customCount > 0 && (
        <div
          className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm"
          style={{ backgroundColor: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6' }}
        >
          <SlidersHorizontal size={14} />
          {customCount} {customCount === 1 ? 'regra personalizada' : 'regras personalizadas'} neste tenant
        </div>
      )}

      {byPillar.map(({ pillar, rules: pillarRules }) => (
        <Card key={pillar}>
          <div className="mb-3 flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
              {PILLAR_LABELS[pillar] ?? pillar}
            </p>
            <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              · {pillarRules.filter(r => effectiveEnabled(r)).length}/{pillarRules.length} ativas
            </span>
          </div>

          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {pillarRules.map(rule => {
              const enabled = effectiveEnabled(rule)
              const isOverridden = tenantOverrideMap.has(rule.rule_id)
              const sev = SEVERITY_STYLES[rule.severity] ?? SEVERITY_STYLES.info
              return (
                <div key={rule.rule_id} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span
                      className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold"
                      style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
                    >
                      {rule.rule_id}
                    </span>
                    <span className="truncate text-sm font-medium" style={{ color: enabled ? 'var(--color-foreground)' : 'var(--color-muted-foreground)' }}>
                      {rule.name}
                    </span>
                    {isOverridden && (
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{ backgroundColor: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}
                      >
                        personalizado
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={{ backgroundColor: sev.bg, color: sev.color }}
                    >
                      {sev.label}
                    </span>
                    <Toggle
                      enabled={enabled}
                      onChange={() => void handleToggle(rule)}
                      loading={toggling === rule.rule_id}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      ))}
    </div>
  )
}

function WeightsTab() {
  const queryClient = useQueryClient()
  const { data: weights = [], isLoading, error } = useScoreConfigWeights()
  const { data: rules = [] } = useScoreConfigRules()

  const initialWeights = useMemo<Record<string, number>>(() => {
    if (weights.length > 0) {
      return Object.fromEntries(weights.map(w => [w.pillar, w.weight]))
    }
    return { ...DEFAULT_WEIGHTS }
  }, [weights])

  const [values, setValues] = useState<Record<string, number> | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const current = values ?? initialWeights

  const total = PILLAR_ORDER.reduce((s, p) => s + (current[p] ?? 0), 0)

  const validationError = useMemo(() => {
    for (const pillar of PILLAR_ORDER) {
      const w = current[pillar] ?? 0
      if (w < MIN_WEIGHT) return `${PILLAR_LABELS[pillar]} precisa ter no mínimo ${MIN_WEIGHT}%.`
      if (w > MAX_WEIGHT) return `${PILLAR_LABELS[pillar]} não pode ultrapassar ${MAX_WEIGHT}%.`
    }
    if (total !== 100) return `A soma dos pesos deve ser 100%. Atual: ${total}%.`
    return null
  }, [current, total])

  const engineId = weights[0]?.engine_id ?? rules[0]?.engine_id

  const handleSave = async () => {
    if (validationError || !engineId) return
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      await api.scoreConfig.setWeights({
        engine_id: engineId,
        weights: current,
      })
      await queryClient.invalidateQueries({ queryKey: ['score-config', 'weights'] })
      setSaved(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return <PageLoading />
  if (error) return <PageError message="Não foi possível carregar os pesos." />

  return (
    <div className="space-y-4">
      <Card>
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
          Pesos dos pilares
        </p>
        <p className="mb-5 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          Define quanto cada pilar contribui para o score geral. A soma deve ser exatamente 100%.
          Cada pilar precisa ter entre {MIN_WEIGHT}% e {MAX_WEIGHT}%.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {PILLAR_ORDER.map(pillar => (
            <div key={pillar}>
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
                {PILLAR_LABELS[pillar] ?? pillar}
              </label>
              <div className="relative mt-2">
                <input
                  type="number"
                  min={MIN_WEIGHT}
                  max={MAX_WEIGHT}
                  value={current[pillar] ?? 0}
                  onChange={e => {
                    setSaved(false)
                    setValues(prev => ({ ...(prev ?? initialWeights), [pillar]: Number(e.target.value) }))
                  }}
                  className="w-full rounded-2xl px-4 py-3 pr-10 text-sm outline-none"
                  style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl px-4 py-3" style={{ backgroundColor: total === 100 ? 'rgba(16,185,129,0.08)' : 'rgba(220,38,38,0.08)', border: `1px solid ${total === 100 ? 'rgba(16,185,129,0.2)' : 'rgba(220,38,38,0.2)'}` }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>Total</span>
          <span className="text-sm font-bold" style={{ color: total === 100 ? '#10b981' : '#dc2626' }}>{total}%</span>
        </div>

        {validationError && (
          <p className="mt-3 text-sm" style={{ color: '#dc2626' }}>{validationError}</p>
        )}
        {saveError && (
          <p className="mt-3 text-sm" style={{ color: '#dc2626' }}>{saveError}</p>
        )}

        <div className="mt-5 flex items-center gap-3">
          <ButtonDefault
            label={saving ? 'Salvando...' : 'Salvar pesos'}
            onClick={() => void handleSave()}
            disabled={!!validationError || saving}
          />
          {saved && (
            <div className="flex items-center gap-1.5 text-sm" style={{ color: '#10b981' }}>
              <Check size={14} />
              Salvo com sucesso
            </div>
          )}
        </div>
      </Card>

      <Card>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
          Fórmula do score geral
        </p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>
          Score geral = Σ (score_pilar × peso_pilar) / 100
        </p>
        <p className="mt-2 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
          O operador Kubernetes usa esses pesos para calcular o score de cada workload em tempo real.
          Alterações levam até 5 minutos para serem refletidas no operator.
        </p>
      </Card>
    </div>
  )
}

type Tab = 'regras' | 'pesos'

export function SettingsScoreConfig() {
  const [activeTab, setActiveTab] = useState<Tab>('regras')

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title="Configuração de Score"
        subtitle="Ative ou desative regras de compliance e ajuste os pesos dos pilares para o seu tenant"
      />

      <div className="flex-1 px-4 py-6 lg:px-8">
        <div className="mb-5 flex gap-1 rounded-2xl p-1" style={{ backgroundColor: 'var(--color-muted)', width: 'fit-content' }}>
          {(['regras', 'pesos'] as Tab[]).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className="rounded-xl px-5 py-2 text-sm font-semibold transition-all"
              style={activeTab === tab
                ? { backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }
                : { color: 'var(--color-muted-foreground)' }}
            >
              {tab === 'regras' ? 'Regras' : 'Pesos dos Pilares'}
            </button>
          ))}
        </div>

        {activeTab === 'regras' ? <RulesTab /> : <WeightsTab />}
      </div>
    </div>
  )
}
