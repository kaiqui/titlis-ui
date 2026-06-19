import { useState, useMemo } from 'react'
import { Pagination } from '@/components/jeitto/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
  Info,
  Layers3,
  Loader2,
  RefreshCw,
  Search,
  Target,
  Zap,
  BarChart2,
  CircleDashed,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { ButtonDefault } from '@/components/jeitto/ButtonDefault'
import { Card } from '@/components/jeitto/Card'
import { EmptyState } from '@/components/jeitto/EmptyState'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { api } from '@/lib/api'
import type { SloListItem, WorkloadSLOCoverage, SloStatus } from '@/types'
import { formatDate } from '@/lib/utils'
import { useAuth } from '@/contexts/useAuth'

// ── Helpers ───────────────────────────────────────────────────────────────────

type SloFilter = 'todos' | 'saudaveis' | 'atencao' | 'sem_sync' | 'erro'

function sloState(item: SloListItem): SloFilter {
  if (item.syncError) return 'erro'
  if (!item.lastSyncAt) return 'sem_sync'
  if (item.datadogSloState === 'OK') return 'saudaveis'
  return 'atencao'
}

function stateColors(state: string | null): { border: string; color: string; bg: string } {
  switch (state) {
    case 'OK':
      return { border: 'rgba(34,197,94,0.3)', color: '#16a34a', bg: 'rgba(240,253,244,0.8)' }
    case 'BREACHED':
    case 'NO_DATA':
      return { border: 'rgba(239,68,68,0.3)', color: '#dc2626', bg: 'rgba(254,242,242,0.8)' }
    case 'WARNING':
      return { border: 'rgba(245,158,11,0.3)', color: '#d97706', bg: 'rgba(255,251,235,0.8)' }
    default:
      return { border: 'rgba(107,114,128,0.3)', color: '#6b7280', bg: 'rgba(249,250,251,0.8)' }
  }
}

function StateIcon({ state }: { state: string | null }) {
  if (state === 'OK') return <CheckCircle2 size={13} style={{ color: '#16a34a', flexShrink: 0 }} />
  if (state === 'BREACHED') return <AlertCircle size={13} style={{ color: '#dc2626', flexShrink: 0 }} />
  if (state === 'WARNING') return <AlertTriangle size={13} style={{ color: '#d97706', flexShrink: 0 }} />
  if (state === 'NO_DATA') return <Info size={13} style={{ color: '#6b7280', flexShrink: 0 }} />
  return <Clock size={13} style={{ color: '#9ca3af', flexShrink: 0 }} />
}

function sloTypeLabel(t: string) {
  if (t === 'LATENCY') return 'Latência'
  if (t === 'AVAILABILITY') return 'Disponibilidade'
  if (t === 'ERROR_RATE') return 'Taxa de erro'
  return t
}

function timeframeLabel(t: string) {
  if (t === '7d') return '7 dias'
  if (t === '30d') return '30 dias'
  if (t === '90d') return '90 dias'
  return t
}

// ── Inline propose-change form ─────────────────────────────────────────────────

const ALLOWED_FIELDS = [
  { value: 'target',    label: 'Meta (target %)' },
  { value: 'warning',   label: 'Warning (%)' },
  { value: 'timeframe', label: 'Timeframe' },
] as const

function ProposeChangeForm({
  slo,
  onClose,
}: {
  slo: SloListItem
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [field, setField] = useState<'target' | 'warning' | 'timeframe'>('target')
  const [newValue, setNewValue] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const currentValue = useMemo(() => {
    if (field === 'target') return slo.target !== null ? String(slo.target) : ''
    if (field === 'warning') return slo.warning !== null ? String(slo.warning) : ''
    return slo.timeframe
  }, [field, slo])

  const mutation = useMutation({
    mutationFn: () =>
      api.slos.proposeChange(slo.sloConfigId, {
        field,
        oldValue: currentValue,
        newValue: newValue.trim(),
      }),
    onSuccess: () => {
      setSubmitted(true)
      void queryClient.invalidateQueries({ queryKey: ['slos'] })
      setTimeout(onClose, 1800)
    },
  })

  if (submitted) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm"
        style={{ borderColor: 'rgba(34,197,94,0.3)', color: '#16a34a', background: 'rgba(240,253,244,0.8)' }}>
        <CheckCircle2 size={14} />
        Proposta enviada! O operator aplicará a alteração no próximo ciclo.
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl border p-4"
      style={{ borderColor: 'var(--color-border)', background: 'var(--app-background)' }}>
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
        Propor alteração de configuração
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
            Campo
          </label>
          <select
            className="input-field text-sm"
            value={field}
            onChange={e => {
              setField(e.target.value as typeof field)
              setNewValue('')
            }}
          >
            {ALLOWED_FIELDS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
            Valor atual
          </label>
          <div className="input-field text-sm bg-opacity-50 cursor-default select-none"
            style={{ color: 'var(--color-muted-foreground)', background: 'rgba(0,0,0,0.03)' }}>
            {currentValue || '—'}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
            Novo valor
          </label>
          <input
            className="input-field text-sm"
            value={newValue}
            onChange={e => setNewValue(e.target.value)}
            placeholder={field === 'timeframe' ? '7d / 30d / 90d' : '0.9999'}
          />
        </div>
      </div>

      {mutation.error && (
        <p className="text-xs" style={{ color: '#dc2626' }}>
          {mutation.error instanceof Error ? mutation.error.message : 'Erro ao enviar proposta.'}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-xl px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-60"
          style={{ background: 'var(--color-primary)', color: '#fff' }}
          disabled={mutation.isPending || !newValue.trim() || newValue.trim() === currentValue}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending
            ? <span className="flex items-center gap-1"><Loader2 size={11} className="animate-spin" />Enviando...</span>
            : 'Enviar proposta'}
        </button>
        <button
          type="button"
          className="rounded-xl px-3 py-1.5 text-xs transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-muted-foreground)' }}
          onClick={onClose}
        >
          Cancelar
        </button>
      </div>

      <p className="text-[10px] leading-4" style={{ color: 'var(--color-muted-foreground)' }}>
        A proposta é salva em fila e o <code>titlis-operator-go</code> aplica no próximo ciclo de reconciliação.
        Não há rollback automático — verifique o CRD SLOConfig no cluster após a aplicação.
      </p>
    </div>
  )
}

// ── SLO card ──────────────────────────────────────────────────────────────────

function SloCard({ slo, canAdmin }: { slo: SloListItem; canAdmin: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const [proposing, setProposing] = useState(false)
  const state = slo.datadogSloState
  const colors = stateColors(state)
  const hasError = !!slo.syncError
  const notSynced = !slo.lastSyncAt

  return (
    <div
      className="rounded-[1.4rem] border overflow-hidden"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}
    >
      {/* Header */}
      <button
        type="button"
        className="w-full text-left"
        onClick={() => {
          setExpanded(v => !v)
          if (!expanded) setProposing(false)
        }}
      >
        <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex flex-1 flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <StateIcon state={state} />
              <span className="font-semibold text-sm truncate" style={{ color: 'var(--color-foreground)' }}>
                {slo.name}
              </span>
              {/* State badge */}
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ border: `1px solid ${colors.border}`, color: colors.color, background: colors.bg }}
              >
                {state ?? 'Sem estado'}
              </span>
              {/* Type badge */}
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs"
                style={{ color: 'var(--color-muted-foreground)', background: 'rgba(0,0,0,0.04)' }}
              >
                {sloTypeLabel(slo.sloType)}
              </span>
              {slo.autoDetectFramework && (
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ color: '#7c3aed', background: 'rgba(245,243,255,0.8)', border: '1px solid rgba(124,58,237,0.2)' }}
                >
                  auto-detect
                </span>
              )}
              {hasError && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ color: '#dc2626', background: 'rgba(254,242,242,0.8)', border: '1px solid rgba(220,38,38,0.2)' }}
                >
                  <Zap size={9} /> erro de sync
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs flex-wrap" style={{ color: 'var(--color-muted-foreground)' }}>
              <span className="flex items-center gap-1">
                <Database size={10} />
                {slo.namespace}
              </span>
              <span>{slo.cluster} · {slo.environment}</span>
              <span className="flex items-center gap-1">
                <Target size={10} />
                {slo.target !== null ? `${(slo.target * 100).toFixed(2)}%` : 'N/D'}
              </span>
              <span className="flex items-center gap-1">
                <Activity size={10} />
                {timeframeLabel(slo.timeframe)}
              </span>
              {!notSynced && (
                <span>sync {formatDate(slo.lastSyncAt)}</span>
              )}
              {notSynced && (
                <span style={{ color: '#d97706' }}>sem sincronização</span>
              )}
            </div>
          </div>
          <span style={{ color: 'var(--color-muted-foreground)', flexShrink: 0 }}>
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </span>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div
          className="border-t px-4 py-4 space-y-4"
          style={{ borderColor: 'var(--color-border)', background: 'var(--app-background)' }}
        >
          {/* Metadata grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Target', value: slo.target !== null ? `${(slo.target * 100).toFixed(4)}%` : 'N/D', icon: Target },
              { label: 'Warning', value: slo.warning !== null ? `${(slo.warning * 100).toFixed(4)}%` : '—', icon: AlertTriangle },
              { label: 'Timeframe', value: timeframeLabel(slo.timeframe), icon: Activity },
              { label: 'Framework', value: slo.detectedFramework ?? '—', icon: Layers3 },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-2xl border px-3 py-2.5"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={11} style={{ color: 'var(--color-primary)' }} />
                  <span className="text-[10px] font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--color-muted-foreground)' }}>{label}</span>
                </div>
                <span className="text-sm font-bold" style={{ color: 'var(--color-foreground)' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Sync details */}
          <div className="grid gap-2 sm:grid-cols-2 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            <div>
              <span className="font-medium">Datadog SLO ID: </span>
              <span className="font-mono">{slo.datadogSloId ?? '—'}</span>
            </div>
            <div>
              <span className="font-medium">Fonte de detecção: </span>
              <span>{slo.detectionSource ?? '—'}</span>
            </div>
            {slo.syncError && (
              <div className="col-span-2 rounded-xl border px-3 py-2 font-mono text-[10px] break-all leading-relaxed"
                style={{ borderColor: 'rgba(220,38,38,0.2)', background: 'rgba(254,242,242,0.8)', color: '#b91c1c' }}>
                <span className="font-semibold not-italic font-sans">Erro de sync: </span>
                {slo.syncError}
              </div>
            )}
          </div>

          {/* Propose change */}
          {canAdmin && (
            proposing ? (
              <ProposeChangeForm slo={slo} onClose={() => setProposing(false)} />
            ) : (
              <button
                type="button"
                className="text-xs font-semibold transition-opacity hover:opacity-70"
                style={{ color: 'var(--color-primary-strong)' }}
                onClick={() => setProposing(true)}
              >
                ＋ Propor alteração de configuração
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

// ── Coverage helpers ───────────────────────────────────────────────────────────

function coverageStatusLabel(status: SloStatus): string {
  if (status === 'WITH_SLO') return 'Com SLO'
  if (status === 'CANDIDATE') return 'Candidato'
  return 'Sem Datadog'
}

function coverageStatusColor(status: SloStatus): { border: string; color: string; bg: string } {
  if (status === 'WITH_SLO') return { border: 'rgba(34,197,94,0.3)', color: '#16a34a', bg: 'rgba(240,253,244,0.8)' }
  if (status === 'CANDIDATE') return { border: 'rgba(245,158,11,0.3)', color: '#d97706', bg: 'rgba(255,251,235,0.8)' }
  return { border: 'rgba(107,114,128,0.3)', color: '#6b7280', bg: 'rgba(249,250,251,0.8)' }
}

function CoverageStatusIcon({ status }: { status: SloStatus }) {
  if (status === 'WITH_SLO') return <CheckCircle2 size={13} style={{ color: '#16a34a', flexShrink: 0 }} />
  if (status === 'CANDIDATE') return <AlertTriangle size={13} style={{ color: '#d97706', flexShrink: 0 }} />
  return <CircleDashed size={13} style={{ color: '#9ca3af', flexShrink: 0 }} />
}

function CoverageCard({ item }: { item: WorkloadSLOCoverage }) {
  const colors = coverageStatusColor(item.sloStatus)

  return (
    <div
      className="rounded-2xl border px-4 py-3 flex items-start justify-between gap-4"
      style={{ borderColor: colors.border, background: colors.bg }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <CoverageStatusIcon status={item.sloStatus} />
          <span className="font-semibold text-sm" style={{ color: 'var(--color-foreground)' }}>{item.name}</span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ background: colors.border, color: colors.color }}
          >
            {coverageStatusLabel(item.sloStatus)}
          </span>
          {item.datadogSloState && (
            <span className="text-[10px] font-medium" style={{ color: '#6b7280' }}>
              DD: {item.datadogSloState}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
          <span>{item.namespace}</span>
          <span>{item.cluster}</span>
          {item.environment && <span className="uppercase text-[10px] font-semibold">{item.environment}</span>}
          {item.lastSyncAt && <span>Sync: {formatDate(item.lastSyncAt)}</span>}
        </div>
        {item.sloStatus === 'CANDIDATE' && (
          <div className="mt-2 rounded-xl border px-3 py-2 text-xs leading-5"
            style={{ borderColor: 'rgba(245,158,11,0.2)', background: 'rgba(255,251,235,0.6)', color: '#92400e' }}>
            <strong>Candidato a SLO</strong> — workload registrado no Datadog mas sem{' '}
            <code className="font-mono text-[11px]">SLOConfig</code> CRD no cluster. Aplique o manifesto
            para que o operator crie e reconcilie o SLO automaticamente.
          </div>
        )}
        {item.sloStatus === 'NO_DATADOG' && (
          <div className="mt-2 rounded-xl border px-3 py-2 text-xs leading-5"
            style={{ borderColor: 'rgba(107,114,128,0.15)', background: 'rgba(249,250,251,0.6)', color: '#6b7280' }}>
            Workload sem labels do Datadog Unified Service Tagging. Complete o onboarding no Datadog
            primeiro ({' '}<code className="font-mono text-[11px]">tags.datadoghq.com/service</code>{' '}
            ausente) e depois configure o SLO.
          </div>
        )}
      </div>
    </div>
  )
}

type CoverageFilter = 'todos' | 'WITH_SLO' | 'CANDIDATE' | 'NO_DATADOG'

function CoverageView({ onRefresh }: { onRefresh: () => void }) {
  const [filter, setFilter] = useState<CoverageFilter>('todos')
  const [search, setSearch] = useState('')

  const { data: coverage, isLoading, error } = useQuery({
    queryKey: ['slos-coverage'],
    queryFn: () => api.slos.coverage(),
    refetchInterval: 60_000,
  })

  const items = coverage ?? []

  const summary = useMemo(() => ({
    total: items.length,
    with_slo: items.filter(i => i.sloStatus === 'WITH_SLO').length,
    candidate: items.filter(i => i.sloStatus === 'CANDIDATE').length,
    no_datadog: items.filter(i => i.sloStatus === 'NO_DATADOG').length,
  }), [items])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return items.filter(item => {
      const matchesFilter = filter === 'todos' || item.sloStatus === filter
      const matchesSearch = !term
        || item.name.toLowerCase().includes(term)
        || item.namespace.toLowerCase().includes(term)
        || item.cluster.toLowerCase().includes(term)
      return matchesFilter && matchesSearch
    })
  }, [items, filter, search])

  const coveragePagination = usePagination(filtered, 25)

  if (isLoading) return <PageLoading />
  if (error) return <PageError message={error instanceof Error ? error.message : undefined} onRetry={onRefresh} />

  const coverageFilterTabs: Array<{ id: CoverageFilter; label: string; count: number; color?: string }> = [
    { id: 'todos',      label: 'Todos',        count: summary.total },
    { id: 'WITH_SLO',   label: 'Com SLO',      count: summary.with_slo,   color: '#16a34a' },
    { id: 'CANDIDATE',  label: 'Candidatos',   count: summary.candidate,  color: '#d97706' },
    { id: 'NO_DATADOG', label: 'Sem Datadog',  count: summary.no_datadog, color: '#6b7280' },
  ]

  return (
    <div className="mx-auto max-w-4xl space-y-4">

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total workloads', value: summary.total },
          { label: 'Com SLO', value: summary.with_slo, color: '#16a34a' },
          { label: 'Candidatos', value: summary.candidate, color: '#d97706' },
          { label: 'Sem Datadog', value: summary.no_datadog, color: '#6b7280' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl border px-4 py-3"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
            <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{label}</p>
            <p className="mt-0.5 text-2xl font-black" style={{ color: color ?? 'var(--color-foreground)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Banner explicativo */}
      <div className="rounded-2xl border px-4 py-3 flex items-start gap-3"
        style={{ borderColor: 'rgba(245,158,11,0.2)', background: 'rgba(255,251,235,0.5)' }}>
        <BarChart2 size={15} className="mt-0.5 shrink-0" style={{ color: '#d97706' }} />
        <p className="text-xs leading-5" style={{ color: '#92400e' }}>
          <strong>Cobertura de SLOs</strong> — todos os workloads ativos classificados por presença de SLO.{' '}
          <strong>Candidatos</strong> têm Datadog configurado mas nenhum{' '}
          <code>SLOConfig</code> CRD no cluster.{' '}
          Workloads <strong>Sem Datadog</strong> não são penalizados no scorecard.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {coverageFilterTabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all"
              style={{
                background: filter === tab.id ? 'var(--color-primary)' : 'rgba(0,0,0,0.04)',
                color: filter === tab.id ? '#fff' : 'var(--color-muted-foreground)',
              }}
              onClick={() => setFilter(tab.id)}
            >
              {tab.label}
              <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                style={{ background: filter === tab.id ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.08)' }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--color-muted-foreground)' }} />
            <input
              className="input-field pl-8 py-2 text-sm w-52"
              placeholder="Buscar workload..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <ButtonDefault visual="ghost" label="Atualizar" icon={RefreshCw} onClick={onRefresh} />
        </div>
      </div>

      {/* Coverage list */}
      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={Target}
            title="Nenhum workload ativo"
            description="Os workloads aparecem aqui quando o operator começa a enviar snapshots."
          />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState icon={Search} title="Nenhum resultado" description="Ajuste o filtro ou a busca." />
        </Card>
      ) : (
        <div className="space-y-2">
          {coveragePagination.paginatedItems.map(item => (
            <CoverageCard key={item.workloadId} item={item} />
          ))}
          <Pagination
            page={coveragePagination.page}
            pageSize={coveragePagination.pageSize}
            totalItems={coveragePagination.totalItems}
            totalPages={coveragePagination.totalPages}
            startIndex={coveragePagination.startIndex}
            endIndex={coveragePagination.endIndex}
            onPageChange={coveragePagination.setPage}
            onPageSizeChange={coveragePagination.changePageSize}
          />
        </div>
      )}
    </div>
  )
}

// ── Main SLOs page ─────────────────────────────────────────────────────────────

export function SLOs() {
  const { user } = useAuth()
  const canAdmin = user?.role === 'admin'
  const queryClient = useQueryClient()
  const [view, setView] = useState<'slos' | 'coverage'>('slos')
  const [filter, setFilter] = useState<SloFilter>('todos')
  const [search, setSearch] = useState('')

  const { data: slos, isLoading, error, refetch } = useQuery({
    queryKey: ['slos'],
    queryFn: () => api.slos.list(),
    refetchInterval: 60_000,
  })

  // All hooks before any conditional return
  const catalog = slos ?? []

  const summary = useMemo(() => ({
    total: catalog.length,
    saudaveis: catalog.filter(s => sloState(s) === 'saudaveis').length,
    atencao: catalog.filter(s => sloState(s) === 'atencao').length,
    sem_sync: catalog.filter(s => sloState(s) === 'sem_sync').length,
    erro: catalog.filter(s => sloState(s) === 'erro').length,
  }), [catalog])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return catalog.filter(item => {
      const matchesFilter = filter === 'todos' || sloState(item) === filter
      const matchesSearch = !term
        || item.name.toLowerCase().includes(term)
        || item.namespace.toLowerCase().includes(term)
        || item.cluster.toLowerCase().includes(term)
        || item.sloType.toLowerCase().includes(term)
      return matchesFilter && matchesSearch
    })
  }, [catalog, filter, search])

  const sloPagination = usePagination(filtered, 25)

  if (isLoading && view === 'slos') return <><Header title="SLOs" /><PageLoading /></>
  if (error && view === 'slos') {
    return (
      <>
        <Header title="SLOs" subtitle="Gestão de SLOs declarativos sincronizados via operator." />
        <PageError message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
      </>
    )
  }

  const filterTabs: Array<{ id: SloFilter; label: string; count: number }> = [
    { id: 'todos',     label: 'Todos',      count: summary.total },
    { id: 'saudaveis', label: 'Saudáveis',  count: summary.saudaveis },
    { id: 'atencao',   label: 'Atenção',    count: summary.atencao },
    { id: 'sem_sync',  label: 'Sem sync',   count: summary.sem_sync },
    { id: 'erro',      label: 'Com erro',   count: summary.erro },
  ]

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header
        title="SLOs"
        subtitle="SLOs declarativos sincronizados pelo operator — clique em um item para ver detalhes e propor alterações."
      />

      {/* View toggle */}
      <div className="px-6 pt-2 pb-0">
        <div className="inline-flex gap-1 rounded-2xl p-1"
          style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid var(--color-border)' }}>
          {[
            { id: 'slos' as const,     label: 'SLOs',      icon: Target },
            { id: 'coverage' as const, label: 'Cobertura', icon: BarChart2 },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
              style={{
                background: view === id ? 'var(--color-card)' : 'transparent',
                color: view === id ? 'var(--color-primary-strong)' : 'var(--color-muted-foreground)',
                boxShadow: view === id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
              onClick={() => setView(id)}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {view === 'coverage' && (
          <CoverageView
            onRefresh={() => void queryClient.invalidateQueries({ queryKey: ['slos-coverage'] })}
          />
        )}
        {view === 'slos' && (
        <div className="mx-auto max-w-4xl space-y-4">

          {/* Summary strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Total', value: summary.total },
              { label: 'Saudáveis', value: summary.saudaveis, color: '#16a34a' },
              { label: 'Atenção', value: summary.atencao + summary.erro, color: '#d97706' },
              { label: 'Sem sync', value: summary.sem_sync, color: '#6b7280' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-2xl border px-4 py-3"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
                <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{label}</p>
                <p className="mt-0.5 text-2xl font-black" style={{ color: color ?? 'var(--color-foreground)' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Filter tabs */}
            <div className="flex flex-wrap gap-1.5">
              {filterTabs.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all"
                  style={{
                    background: filter === tab.id ? 'var(--color-primary)' : 'rgba(0,0,0,0.04)',
                    color: filter === tab.id ? '#fff' : 'var(--color-muted-foreground)',
                  }}
                  onClick={() => setFilter(tab.id)}
                >
                  {tab.label}
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                    style={{
                      background: filter === tab.id ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.08)',
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-muted-foreground)' }} />
                <input
                  className="input-field pl-8 py-2 text-sm w-56"
                  placeholder="Buscar SLO..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <ButtonDefault
                visual="ghost"
                label="Atualizar"
                icon={RefreshCw}
                onClick={() => void queryClient.invalidateQueries({ queryKey: ['slos'] })}
              />
            </div>
          </div>

          {/* How SLOs are created — informative banner */}
          <div className="rounded-2xl border px-4 py-3 flex items-start gap-3"
            style={{ borderColor: 'rgba(124,58,237,0.2)', background: 'rgba(245,243,255,0.6)' }}>
            <Layers3 size={15} className="mt-0.5 shrink-0" style={{ color: '#7c3aed' }} />
            <p className="text-xs leading-5" style={{ color: '#5b21b6' }}>
              <strong>Como funcionam os SLOs?</strong> Cada SLO é declarado como um CRD{' '}
              <code>SLOConfig</code> no Kubernetes. O <code>titlis-operator-go</code> reconcilia
              os CRDs automaticamente com o Datadog. Para criar um novo SLO, aplique o manifesto
              no cluster. Para ajustar metas existentes, use o botão{' '}
              <strong>Propor alteração</strong> abaixo — a mudança será aplicada via operator
              no próximo ciclo.
            </p>
          </div>

          {/* SLO list */}
          {catalog.length === 0 ? (
            <Card>
              <EmptyState
                icon={Target}
                title="Nenhum SLO reconciliado"
                description="Assim que o operator sincronizar SLOConfig CRDs, eles aparecem aqui automaticamente."
              />
            </Card>
          ) : filtered.length === 0 ? (
            <Card>
              <EmptyState
                icon={Search}
                title="Nenhum resultado"
                description="Ajuste o filtro ou a busca para ver SLOs."
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {sloPagination.paginatedItems.map(slo => (
                <SloCard key={slo.sloConfigId} slo={slo} canAdmin={canAdmin} />
              ))}
              <Pagination
                page={sloPagination.page}
                pageSize={sloPagination.pageSize}
                totalItems={sloPagination.totalItems}
                totalPages={sloPagination.totalPages}
                startIndex={sloPagination.startIndex}
                endIndex={sloPagination.endIndex}
                onPageChange={sloPagination.setPage}
                onPageSizeChange={sloPagination.changePageSize}
              />
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  )
}
