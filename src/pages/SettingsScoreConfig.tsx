import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Check, ChevronRight, Search, Trash2 } from 'lucide-react'
import { ButtonDefault } from '@/components/jeitto/ButtonDefault'
import { Card } from '@/components/jeitto/Card'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { Header } from '@/components/layout/Header'
import { useAuth } from '@/contexts/useAuth'
import {
  useDashboardWorkloads,
  useScoreConfigOverrides,
  useScoreConfigRules,
  useScoreConfigWeights,
  useTagPolicies,
} from '@/hooks/useApi'
import { api } from '@/lib/api'
import type { ScoreConfigOverride, ScoreConfigRule } from '@/lib/api'
import type { WorkloadSummary } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const PILLAR_LABELS: Record<string, string> = {
  resilience:    'Resiliência',
  security:      'Segurança',
  performance:   'Desempenho',
  operational:   'Operacional',
  observability: 'Observabilidade',
}

// Pesos editáveis: os 4 pilares clássicos (a soma é validada contra 100% no editor de pesos).
const PILLAR_ORDER = ['resilience', 'security', 'performance', 'operational']

// Ordenação da LISTA de regras — inclui observabilidade (OBS-*, COV-* de cobertura) para que essas
// regras ganhem aba e label próprios, não só o bucket "Todos".
const RULE_PILLAR_ORDER = [...PILLAR_ORDER, 'observability']

const SEVERITY_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  error:    { label: 'Erro',    color: '#dc2626', bg: 'rgba(220,38,38,0.1)'  },
  warning:  { label: 'Aviso',   color: '#d97706', bg: 'rgba(217,119,6,0.1)'  },
  info:     { label: 'Info',    color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  critical: { label: 'Crítico', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
}

const DEFAULT_WEIGHTS: Record<string, number> = {
  resilience: 40, security: 30, performance: 20, operational: 10,
}

const MIN_WEIGHT = 5
const MAX_WEIGHT = 60

const SCOPE_ORDER = ['tenant', 'cluster', 'namespace', 'workload'] as const
type ScopeType = typeof SCOPE_ORDER[number]

const SCOPE_LABELS: Record<ScopeType, string> = {
  tenant: 'Geral', cluster: 'Cluster', namespace: 'Namespace', workload: 'App',
}

const SCOPE_COLORS: Record<ScopeType, { color: string; bg: string; border: string }> = {
  tenant:    { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  border: '#3b82f6' },
  cluster:   { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  border: '#8b5cf6' },
  namespace: { color: '#06b6d4', bg: 'rgba(6,182,212,0.1)',   border: '#06b6d4' },
  workload:  { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: '#10b981' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ScopePill({ scope }: { scope: ScopeType }) {
  const s = SCOPE_COLORS[scope]
  return (
    <span
      className="inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {SCOPE_LABELS[scope]}
    </span>
  )
}

function overrideScopeValue(o: ScoreConfigOverride, workloads: WorkloadSummary[]): string {
  if (o.scope === 'tenant') return 'Todo o tenant'
  if (o.scope === 'cluster') return o.cluster_name ?? '—'
  if (o.scope === 'namespace') return `${o.cluster_name} / ${o.namespace}`
  const w = workloads.find(wl => wl.id === o.workload_uid)
  return w
    ? `${w.namespace} / ${w.name}`
    : `${o.namespace ?? ''} / ${o.workload_uid?.slice(0, 8) ?? '—'}`
}

// ─── OverridePanel ────────────────────────────────────────────────────────────

interface OverridePanelProps {
  rule: ScoreConfigRule
  overrides: ScoreConfigOverride[]
  workloads: WorkloadSummary[]
}

function OverridePanel({ rule, overrides, workloads }: OverridePanelProps) {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const [scope, setScope]           = useState<ScopeType>('tenant')
  const [clusterName, setClusterName] = useState('')
  const [namespace, setNamespace]   = useState('')
  const [workloadUid, setWorkloadUid] = useState('')
  const [enabled, setEnabled]       = useState(false)
  const [reason, setReason]         = useState('')
  const [saving, setSaving]         = useState(false)
  const [formError, setFormError]   = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const clusters = useMemo(
    () => [...new Set(workloads.map(w => w.cluster))].sort(),
    [workloads],
  )
  const namespacesForCluster = useMemo(
    () => [...new Set(workloads.filter(w => w.cluster === clusterName).map(w => w.namespace))].sort(),
    [workloads, clusterName],
  )
  const workloadsForNs = useMemo(
    () => workloads.filter(w => w.cluster === clusterName && w.namespace === namespace),
    [workloads, clusterName, namespace],
  )

  const handleScopeChange = (s: ScopeType) => {
    setScope(s)
    if (s === 'tenant')    { setClusterName(''); setNamespace(''); setWorkloadUid('') }
    if (s === 'cluster')   { setNamespace(''); setWorkloadUid('') }
    if (s === 'namespace') { setWorkloadUid('') }
    setFormError(null)
  }

  const validate = (): string | null => {
    if (scope === 'cluster'   && !clusterName)                     return 'Selecione um cluster.'
    if (scope === 'namespace' && (!clusterName || !namespace))     return 'Selecione cluster e namespace.'
    if (scope === 'workload'  && (!clusterName || !namespace || !workloadUid)) return 'Selecione cluster, namespace e app.'
    return null
  }

  const handleSave = async () => {
    const err = validate()
    if (err) { setFormError(err); return }
    setSaving(true)
    setFormError(null)
    try {
      await api.scoreConfig.createOverride({
        engine_id:    rule.engine_id,
        rule_id:      rule.rule_id,
        scope,
        cluster_name: scope !== 'tenant' ? clusterName : undefined,
        namespace:    scope === 'namespace' || scope === 'workload' ? namespace    : undefined,
        workload_uid: scope === 'workload'  ? workloadUid : undefined,
        enabled,
        reason:       reason.trim() || undefined,
        created_by:   user?.email ?? 'admin',
      })
      await queryClient.invalidateQueries({ queryKey: ['score-config', 'overrides'] })
      setScope('tenant'); setClusterName(''); setNamespace(''); setWorkloadUid('')
      setEnabled(false); setReason('')
    } catch {
      setFormError('Erro ao salvar override. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      await api.scoreConfig.deleteOverride(id)
      await queryClient.invalidateQueries({ queryKey: ['score-config', 'overrides'] })
    } finally {
      setDeletingId(null)
    }
  }

  const sev = SEVERITY_STYLES[rule.severity] ?? SEVERITY_STYLES.info

  return (
    <div className="space-y-4">
      {/* Rule header */}
      <Card>
        <div className="flex flex-wrap items-start gap-3">
          <span
            className="shrink-0 rounded px-1.5 py-0.5 font-mono text-xs font-bold"
            style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
          >
            {rule.rule_id}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
              {rule.name}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                {PILLAR_LABELS[rule.pillar] ?? rule.pillar}
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ backgroundColor: sev.bg, color: sev.color }}
              >
                {sev.label}
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[11px]"
                style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
              >
                padrão: {rule.enabled_by_default ? 'ativa' : 'inativa'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Existing overrides */}
      <Card>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
          Overrides ativos{overrides.length > 0 ? ` (${overrides.length})` : ''}
        </p>

        {overrides.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            Nenhum override configurado. A regra segue o comportamento padrão.
          </p>
        ) : (
          <div className="space-y-2">
            {overrides.map(o => (
              <div
                key={o.id}
                className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
                style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)' }}
              >
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <ScopePill scope={o.scope} />
                  <span className="truncate text-sm" style={{ color: 'var(--color-foreground)' }}>
                    {overrideScopeValue(o, workloads)}
                  </span>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={o.enabled
                      ? { backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981' }
                      : { backgroundColor: 'rgba(220,38,38,0.08)', color: '#dc2626' }}
                  >
                    {o.enabled ? 'Ativa' : 'Desativada'}
                  </span>
                  {o.reason && (
                    <span className="truncate text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                      · {o.reason}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete(o.id)}
                  disabled={deletingId === o.id}
                  className="shrink-0 rounded-full p-1.5 transition-colors disabled:opacity-40"
                  style={{ color: '#dc2626' }}
                  title="Remover override"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add override form */}
      <Card>
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
          Adicionar override
        </p>

        {/* Scope selector */}
        <div className="mb-4">
          <label className="mb-2 block text-xs font-semibold" style={{ color: 'var(--color-foreground)' }}>
            Escopo
          </label>
          <div className="flex flex-wrap gap-2">
            {SCOPE_ORDER.map(s => {
              const active = scope === s
              const c = SCOPE_COLORS[s]
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleScopeChange(s)}
                  className="rounded-full px-4 py-1.5 text-sm font-semibold transition-all"
                  style={active
                    ? { backgroundColor: c.bg, color: c.color, border: `1.5px solid ${c.border}` }
                    : { backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)', border: '1.5px solid transparent' }}
                >
                  {SCOPE_LABELS[s]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Cluster */}
        {(scope === 'cluster' || scope === 'namespace' || scope === 'workload') && (
          <div className="mb-3">
            <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--color-foreground)' }}>
              Cluster
            </label>
            <select
              value={clusterName}
              onChange={e => { setClusterName(e.target.value); setNamespace(''); setWorkloadUid('') }}
              className="w-full rounded-2xl px-4 py-2.5 text-sm outline-none"
              style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
            >
              <option value="">Selecione o cluster</option>
              {clusters.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        {/* Namespace */}
        {(scope === 'namespace' || scope === 'workload') && (
          <div className="mb-3">
            <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--color-foreground)' }}>
              Namespace
            </label>
            <select
              value={namespace}
              onChange={e => { setNamespace(e.target.value); setWorkloadUid('') }}
              disabled={!clusterName}
              className="w-full rounded-2xl px-4 py-2.5 text-sm outline-none disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
            >
              <option value="">Selecione o namespace</option>
              {namespacesForCluster.map(ns => <option key={ns} value={ns}>{ns}</option>)}
            </select>
          </div>
        )}

        {/* App (workload) */}
        {scope === 'workload' && (
          <div className="mb-3">
            <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--color-foreground)' }}>
              App
            </label>
            <select
              value={workloadUid}
              onChange={e => setWorkloadUid(e.target.value)}
              disabled={!namespace}
              className="w-full rounded-2xl px-4 py-2.5 text-sm outline-none disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
            >
              <option value="">Selecione o app</option>
              {workloadsForNs.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        )}

        {/* Action */}
        <div className="mb-3">
          <label className="mb-2 block text-xs font-semibold" style={{ color: 'var(--color-foreground)' }}>
            Ação
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEnabled(false)}
              className="rounded-full px-4 py-1.5 text-sm font-semibold transition-all"
              style={!enabled
                ? { backgroundColor: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1.5px solid #dc2626' }
                : { backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)', border: '1.5px solid transparent' }}
            >
              Desativar
            </button>
            <button
              type="button"
              onClick={() => setEnabled(true)}
              className="rounded-full px-4 py-1.5 text-sm font-semibold transition-all"
              style={enabled
                ? { backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1.5px solid #10b981' }
                : { backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)', border: '1.5px solid transparent' }}
            >
              Ativar
            </button>
          </div>
        </div>

        {/* Reason */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--color-foreground)' }}>
            Motivo{' '}
            <span style={{ color: 'var(--color-muted-foreground)', fontWeight: 400 }}>(opcional)</span>
          </label>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Ex: workload legado sem suporte a probes"
            className="w-full rounded-2xl px-4 py-2.5 text-sm outline-none"
            style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
          />
        </div>

        {formError && (
          <p className="mb-3 text-sm" style={{ color: '#dc2626' }}>{formError}</p>
        )}

        <ButtonDefault
          label={saving ? 'Salvando...' : 'Salvar override'}
          onClick={() => void handleSave()}
          disabled={saving}
        />
      </Card>
    </div>
  )
}

// ─── RulesTab ─────────────────────────────────────────────────────────────────

function RulesTab() {
  const { data: rules = [],     isLoading: rulesLoading,    error: rulesError } = useScoreConfigRules()
  const { data: overrides = [], isLoading: overridesLoading }                   = useScoreConfigOverrides()
  const { data: workloads = [] }                                                 = useDashboardWorkloads()

  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null)
  const [search, setSearch]                 = useState('')
  const [pillarFilter, setPillarFilter]     = useState('all')

  const overridesByRule = useMemo(() => {
    const map = new Map<string, ScoreConfigOverride[]>()
    for (const o of overrides) {
      const list = map.get(o.rule_id) ?? []
      list.push(o)
      map.set(o.rule_id, list)
    }
    return map
  }, [overrides])

  const filteredRules = useMemo(() => {
    const q = search.toLowerCase()
    return rules.filter(r => {
      if (pillarFilter !== 'all' && r.pillar !== pillarFilter) return false
      if (q && !r.rule_id.toLowerCase().includes(q) && !r.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [rules, pillarFilter, search])

  const selectedRule     = rules.find(r => r.rule_id === selectedRuleId) ?? null
  const selectedOverrides = selectedRuleId ? (overridesByRule.get(selectedRuleId) ?? []) : []

  if (rulesLoading || overridesLoading) return <PageLoading />
  if (rulesError) return <PageError message="Não foi possível carregar as regras." />

  const pillarTabs = [
    { id: 'all', label: 'Todos', count: rules.length },
    ...RULE_PILLAR_ORDER
      .filter(p => rules.some(r => r.pillar === p))
      .map(p => ({ id: p, label: PILLAR_LABELS[p], count: rules.filter(r => r.pillar === p).length })),
  ]

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      {/* Left: rule list */}
      <div className="lg:w-[40%] lg:shrink-0">
        <Card>
          {/* Search */}
          <div className="relative mb-3">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--color-muted-foreground)' }}
            />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por ID ou nome..."
              className="w-full rounded-2xl py-2.5 pl-9 pr-4 text-sm outline-none"
              style={{
                backgroundColor: 'var(--color-muted)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-foreground)',
              }}
            />
          </div>

          {/* Pillar filter */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {pillarTabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPillarFilter(tab.id)}
                className="rounded-full px-3 py-1 text-xs font-semibold transition-all"
                style={pillarFilter === tab.id
                  ? { backgroundColor: 'var(--color-primary)', color: '#fff' }
                  : { backgroundColor: 'transparent', color: 'var(--color-muted-foreground)' }}
              >
                {tab.label}{' '}
                <span className="opacity-60">{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Rule rows */}
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {filteredRules.length === 0 ? (
              <p className="py-6 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                Nenhuma regra encontrada.
              </p>
            ) : filteredRules.map(rule => {
              const sev        = SEVERITY_STYLES[rule.severity] ?? SEVERITY_STYLES.info
              const count      = overridesByRule.get(rule.rule_id)?.length ?? 0
              const isSelected = selectedRuleId === rule.rule_id
              return (
                <button
                  key={rule.rule_id}
                  type="button"
                  onClick={() => setSelectedRuleId(rule.rule_id)}
                  className="flex w-full items-center gap-3 py-3 text-left transition-all"
                >
                  <div
                    className="min-w-0 flex-1"
                    style={isSelected
                      ? { borderLeft: '2px solid var(--color-primary)', paddingLeft: '8px' }
                      : { paddingLeft: '10px' }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold"
                        style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
                      >
                        {rule.rule_id}
                      </span>
                      {count > 0 && (
                        <span
                          className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                          style={{ backgroundColor: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}
                          title={`${count} override${count > 1 ? 's' : ''} configurado${count > 1 ? 's' : ''}`}
                        >
                          {count}
                        </span>
                      )}
                    </div>
                    <p
                      className="mt-0.5 truncate text-sm"
                      style={{ color: isSelected ? 'var(--color-primary)' : 'var(--color-foreground)' }}
                    >
                      {rule.name}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{ backgroundColor: sev.bg, color: sev.color }}
                    >
                      {sev.label}
                    </span>
                    <ChevronRight
                      size={14}
                      style={{ color: isSelected ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Right: override panel */}
      <div className="min-w-0 flex-1">
        {selectedRule ? (
          <OverridePanel
            key={selectedRule.rule_id}
            rule={selectedRule}
            overrides={selectedOverrides}
            workloads={workloads}
          />
        ) : (
          <Card>
            <div className="flex flex-col items-center py-14 text-center">
              <div
                className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: 'var(--color-muted)' }}
              >
                <Search size={22} style={{ color: 'var(--color-muted-foreground)' }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                Selecione uma regra
              </p>
              <p className="mt-1 max-w-xs text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                Escolha uma regra na lista para gerenciar overrides por app, namespace, cluster ou geral.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

// ─── WeightsTab ───────────────────────────────────────────────────────────────

function WeightsTab() {
  const queryClient = useQueryClient()
  const { data: weights = [], isLoading, error } = useScoreConfigWeights()
  const { data: rules = [] } = useScoreConfigRules()

  const initialWeights = useMemo<Record<string, number>>(() => {
    if (weights.length > 0) return Object.fromEntries(weights.map(w => [w.pillar, w.weight]))
    return { ...DEFAULT_WEIGHTS }
  }, [weights])

  const [values, setValues]       = useState<Record<string, number> | null>(null)
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved]         = useState(false)

  const current = values ?? initialWeights
  const total   = PILLAR_ORDER.reduce((s, p) => s + (current[p] ?? 0), 0)

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
    setSaving(true); setSaveError(null); setSaved(false)
    try {
      await api.scoreConfig.setWeights({ engine_id: engineId, weights: current })
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
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                  %
                </span>
              </div>
            </div>
          ))}
        </div>

        <div
          className="mt-4 flex items-center justify-between rounded-2xl px-4 py-3"
          style={{
            backgroundColor: total === 100 ? 'rgba(16,185,129,0.08)' : 'rgba(220,38,38,0.08)',
            border: `1px solid ${total === 100 ? 'rgba(16,185,129,0.2)' : 'rgba(220,38,38,0.2)'}`,
          }}
        >
          <span className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>Total</span>
          <span className="text-sm font-bold" style={{ color: total === 100 ? '#10b981' : '#dc2626' }}>
            {total}%
          </span>
        </div>

        {validationError && <p className="mt-3 text-sm" style={{ color: '#dc2626' }}>{validationError}</p>}
        {saveError       && <p className="mt-3 text-sm" style={{ color: '#dc2626' }}>{saveError}</p>}

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

// ─── TagPoliciesTab ───────────────────────────────────────────────────────────

const TAG_SEVERITY_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  info:     { label: 'Info',     color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
  warning:  { label: 'Aviso',    color: '#d97706', bg: 'rgba(217,119,6,0.1)'   },
  critical: { label: 'Crítico',  color: '#7c3aed', bg: 'rgba(124,58,237,0.1)'  },
  blocker:  { label: 'Blocker',  color: '#dc2626', bg: 'rgba(220,38,38,0.1)'   },
}

function TagPoliciesTab() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { data: policies, isLoading, isError } = useTagPolicies()

  const [tag, setTag] = useState('')
  const [mode, setMode] = useState<'severity' | 'rule'>('severity')
  const [severity, setSeverity] = useState('info')
  const [ruleId, setRuleId] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const formValid = useMemo(() => {
    if (!tag.trim()) return false
    if (mode === 'severity') return Boolean(severity)
    return Boolean(ruleId.trim())
  }, [tag, mode, severity, ruleId])

  async function handleCreate() {
    if (!formValid || saving) return
    setSaving(true)
    setSaveError('')
    try {
      await api.tagPolicies.create({
        tag: tag.trim(),
        severity: mode === 'severity' ? severity : undefined,
        rule_id: mode === 'rule' ? ruleId.trim() : undefined,
        created_by: user?.email ?? undefined,
      })
      await queryClient.invalidateQueries({ queryKey: ['tag-policies'] })
      setTag('')
      setRuleId('')
    } catch {
      setSaveError('Erro ao criar política. Verifique se já não existe.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id)
    try {
      await api.tagPolicies.delete(id)
      await queryClient.invalidateQueries({ queryKey: ['tag-policies'] })
    } finally {
      setDeletingId(null)
    }
  }

  if (isLoading) return <div className="py-8 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Carregando…</div>
  if (isError) return <div className="py-8 text-center text-sm text-red-500">Erro ao carregar políticas.</div>

  return (
    <div className="space-y-6">
      {/* Create form */}
      <Card>
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
          Nova política
        </p>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-[13px] font-medium" style={{ color: 'var(--color-foreground)' }}>
              Tag
            </label>
            <input
              type="text"
              value={tag}
              onChange={e => setTag(e.target.value)}
              placeholder="env:dev, env:hml…"
              className="h-9 w-full rounded-lg border bg-transparent px-3 text-[13px] outline-none focus:ring-1"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
            />
          </div>

          <div>
            <label className="mb-2 block text-[13px] font-medium" style={{ color: 'var(--color-foreground)' }}>
              Desabilitar por
            </label>
            <div className="flex gap-4">
              {(['severity', 'rule'] as const).map(m => (
                <label key={m} className="flex cursor-pointer items-center gap-2 text-[13px]" style={{ color: 'var(--color-foreground)' }}>
                  <input
                    type="radio"
                    name="policy-mode"
                    value={m}
                    checked={mode === m}
                    onChange={() => setMode(m)}
                    className="accent-[var(--color-primary)]"
                  />
                  {m === 'severity' ? 'Severidade' : 'Regra específica'}
                </label>
              ))}
            </div>
          </div>

          {mode === 'severity' ? (
            <div>
              <label className="mb-1 block text-[13px] font-medium" style={{ color: 'var(--color-foreground)' }}>
                Severidade
              </label>
              <select
                value={severity}
                onChange={e => setSeverity(e.target.value)}
                className="h-9 rounded-lg border bg-transparent px-3 text-[13px] outline-none focus:ring-1"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
              >
                {Object.entries(TAG_SEVERITY_STYLES).map(([key, s]) => (
                  <option key={key} value={key}>{s.label}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-[13px] font-medium" style={{ color: 'var(--color-foreground)' }}>
                ID da regra
              </label>
              <input
                type="text"
                value={ruleId}
                onChange={e => setRuleId(e.target.value)}
                placeholder="resilience.hpa_configured"
                className="h-9 w-full rounded-lg border bg-transparent px-3 text-[13px] outline-none focus:ring-1"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
              />
            </div>
          )}

          {saveError && <p className="text-[12px] text-red-500">{saveError}</p>}

          <ButtonDefault
            label={saving ? 'Salvando…' : 'Criar política'}
            onClick={() => void handleCreate()}
            disabled={!formValid || saving}
          />
        </div>
      </Card>

      {/* Existing policies */}
      <Card>
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
          Políticas ativas
        </p>
        {(policies ?? []).length === 0 ? (
          <p className="text-[13px]" style={{ color: 'var(--color-muted-foreground)' }}>
            Nenhuma política criada ainda.
          </p>
        ) : (
          <div className="space-y-2">
            {(policies ?? []).map(p => {
              const sev = p.severity ? TAG_SEVERITY_STYLES[p.severity] : null
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                  style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)' }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[12px] font-semibold"
                      style={{ backgroundColor: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}
                    >
                      {p.tag}
                    </span>
                    <span className="text-[12px]" style={{ color: 'var(--color-muted-foreground)' }}>→ desabilitar</span>
                    {sev ? (
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                        style={{ backgroundColor: sev.bg, color: sev.color }}
                      >
                        {sev.label}
                      </span>
                    ) : (
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[11px] font-mono font-semibold"
                        style={{ backgroundColor: 'rgba(107,114,128,0.12)', color: 'var(--color-muted-foreground)' }}
                      >
                        {p.rule_id}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDelete(p.id)}
                    disabled={deletingId === p.id}
                    className="shrink-0 rounded-lg p-1.5 transition-opacity hover:opacity-70 disabled:opacity-30"
                    style={{ color: '#dc2626' }}
                    title="Remover política"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'regras' | 'pesos' | 'tag-policies'

export function SettingsScoreConfig() {
  const [activeTab, setActiveTab] = useState<Tab>('regras')

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title="Configuração de Score"
        subtitle="Gerencie overrides de regras por app, namespace, cluster ou tenant, e ajuste os pesos dos pilares"
      />

      <div className="flex-1 px-4 py-6 lg:px-8">
        <div className="mb-5 flex gap-1 rounded-2xl p-1" style={{ backgroundColor: 'var(--color-muted)', width: 'fit-content' }}>
          {(['regras', 'pesos', 'tag-policies'] as Tab[]).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className="rounded-xl px-5 py-2 text-sm font-semibold transition-all"
              style={activeTab === tab
                ? { backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }
                : { color: 'var(--color-muted-foreground)' }}
            >
              {tab === 'regras' ? 'Regras' : tab === 'pesos' ? 'Pesos dos Pilares' : 'Políticas por Tag'}
            </button>
          ))}
        </div>

        {activeTab === 'regras' && <RulesTab />}
        {activeTab === 'pesos' && <WeightsTab />}
        {activeTab === 'tag-policies' && <TagPoliciesTab />}
      </div>
    </div>
  )
}
