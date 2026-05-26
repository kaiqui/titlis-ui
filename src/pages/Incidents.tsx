import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  GitPullRequest,
  Info,
  MessageSquare,
  RotateCcw,
  Search,
  Siren,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/jeitto/Card'
import { EmptyState } from '@/components/jeitto/EmptyState'
import { Input } from '@/components/jeitto/Input'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { ScoreBadge } from '@/components/jeitto/ScoreBadge'
import { FocusTabs } from '@/components/sre/FocusTabs'
import { SummaryStrip } from '@/components/sre/SummaryStrip'
import { useDashboardWorkloads } from '@/hooks/useApi'
import { formatEnum } from '@/lib/utils'
import { useAuth } from '@/contexts/useAuth'
import type { WorkloadSummary } from '@/types'
import { cn } from '@/lib/utils'

type DegradacaoFilter = 'criticos' | 'alta' | 'remediando' | 'todos'

function scoreToSeverity(score: number | null): 'critical' | 'high' | 'medium' | 'low' {
  if (score === null || score < 60) return 'critical'
  if (score < 75) return 'high'
  if (score < 85) return 'medium'
  return 'low'
}

function SeverityIcon({ severity }: { severity: ReturnType<typeof scoreToSeverity> }) {
  if (severity === 'critical') return <AlertCircle size={14} style={{ color: '#dc2626', flexShrink: 0 }} />
  if (severity === 'high') return <AlertTriangle size={14} style={{ color: '#d97706', flexShrink: 0 }} />
  if (severity === 'medium') return <AlertTriangle size={14} style={{ color: '#ca8a04', flexShrink: 0 }} />
  return <Info size={14} style={{ color: '#6b7280', flexShrink: 0 }} />
}

function remediationBadge(status: string | null) {
  if (!status) return null
  const s = status.toUpperCase()
  if (s.includes('OPEN') || s.includes('PR_OPEN')) {
    return { label: 'PR aberto', color: '#2563eb', bg: 'rgba(239,246,255,0.9)', border: 'rgba(59,130,246,0.3)' }
  }
  if (s.includes('IN_PROGRESS') || s.includes('PROGRESS')) {
    return { label: 'Corrigindo', color: '#7c3aed', bg: 'rgba(245,243,255,0.9)', border: 'rgba(124,58,237,0.3)' }
  }
  if (s.includes('PENDING')) {
    return { label: 'Pendente', color: '#d97706', bg: 'rgba(255,251,235,0.9)', border: 'rgba(245,158,11,0.3)' }
  }
  if (s.includes('MERGED') || s.includes('DONE') || s.includes('COMPLETED')) {
    return { label: 'Corrigido', color: '#16a34a', bg: 'rgba(240,253,244,0.9)', border: 'rgba(34,197,94,0.3)' }
  }
  return null
}

function WorkloadCard({ workload, canRemediate }: { workload: WorkloadSummary; canRemediate: boolean }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const severity = scoreToSeverity(workload.overallScore)
  const remedBadge = remediationBadge(workload.remediationStatus)

  const severityBorderColor: Record<string, string> = {
    critical: 'rgba(220,38,38,0.18)',
    high: 'rgba(217,119,6,0.18)',
    medium: 'rgba(202,138,4,0.12)',
    low: 'var(--color-border)',
  }

  return (
    <div
      className="rounded-[1.6rem] border overflow-hidden transition-all"
      style={{ borderColor: severityBorderColor[severity], background: 'var(--color-card)' }}
    >
      {/* Header clicável */}
      <button
        type="button"
        className="w-full text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3 px-5 py-4">
          <SeverityIcon severity={severity} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-sm truncate" style={{ color: 'var(--color-foreground)' }}>
                {workload.name}
              </span>
              {remedBadge && (
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ color: remedBadge.color, background: remedBadge.bg, border: `1px solid ${remedBadge.border}` }}
                >
                  {remedBadge.label}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs truncate" style={{ color: 'var(--color-muted-foreground)' }}>
              {workload.namespace} · {workload.cluster} · {formatEnum(workload.environment)}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <ScoreBadge score={workload.overallScore} />
            <span style={{ color: 'var(--color-muted-foreground)' }}>
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </div>
        </div>
      </button>

      {/* Conteúdo expandido */}
      {expanded && (
        <div
          className="border-t px-5 py-4 space-y-4"
          style={{ borderColor: 'var(--color-border)', background: 'var(--app-background)' }}
        >
          {/* Métricas rápidas */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl p-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>Conformidade</p>
              <p className="mt-1 text-sm font-bold" style={{ color: 'var(--color-foreground)' }}>
                {formatEnum(workload.complianceStatus ?? 'unknown')}
              </p>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>Prioridade</p>
              <p className="mt-1 text-sm font-bold" style={{ color: 'var(--color-foreground)' }}>
                {severity === 'critical' ? 'Crítica' : severity === 'high' ? 'Alta' : severity === 'medium' ? 'Média' : 'Baixa'}
              </p>
            </div>
            <div className="rounded-xl p-3 col-span-2 sm:col-span-1" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>Remediação</p>
              <p className="mt-1 text-sm font-bold" style={{ color: 'var(--color-foreground)' }}>
                {workload.remediationStatus ? formatEnum(workload.remediationStatus) : 'Sem ação aberta'}
              </p>
            </div>
          </div>

          {/* Sugestão de ação baseada no estado */}
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
          >
            {severity === 'critical'
              ? '⚡ Score crítico — abra remediação imediatamente ou use a ARIA para diagnóstico.'
              : severity === 'high'
                ? '⚠ Prioridade alta — analise os findings e planeje correção no próximo ciclo.'
                : workload.remediationStatus
                  ? '🔄 Correção em andamento — acompanhe o PR e valide o rollout.'
                  : '📋 Workload abaixo do esperado — revise os scorecards para identificar melhorias.'}
          </div>

          {/* Ações */}
          <div className="flex flex-wrap gap-2">
            {canRemediate && (
              <button
                type="button"
                className={cn(
                  'flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-85',
                  severity === 'critical' ? '' : 'opacity-90',
                )}
                style={{ background: 'var(--color-primary)', color: '#fff' }}
                onClick={() => navigate('/assistant', {
                  state: {
                    workloadId: workload.id,
                    workloadName: workload.name,
                    namespace: workload.namespace,
                    findingIds: [],
                  },
                })}
              >
                <MessageSquare size={12} />
                Corrigir com IA
              </button>
            )}
            <button
              type="button"
              className="flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-80"
              style={{ background: 'var(--color-muted)', color: 'var(--color-foreground)', border: '1px solid var(--color-border)' }}
              onClick={() => navigate(`/scorecards/${workload.id}`)}
            >
              <ArrowRight size={12} />
              Ver scorecard
            </button>
            {workload.githubPrUrl && (
              <a href={workload.githubPrUrl} target="_blank" rel="noreferrer">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-80"
                  style={{ background: 'var(--color-muted)', color: 'var(--color-foreground)', border: '1px solid var(--color-border)' }}
                >
                  <GitPullRequest size={12} />
                  Abrir PR
                </button>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function Incidents() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<DegradacaoFilter>('todos')
  const { data: workloads, isLoading, error, refetch } = useDashboardWorkloads()

  const canRemediate = Boolean(user?.canRemediate)
  const workloadList = workloads ?? []

  // Apenas workloads que precisam de atenção
  const degradados = workloadList
    .filter(w => w.complianceStatus === 'NON_COMPLIANT' || w.remediationStatus !== null)
    .sort((a, b) => (a.overallScore ?? -1) - (b.overallScore ?? -1))

  const counts = {
    criticos: degradados.filter(w => scoreToSeverity(w.overallScore) === 'critical').length,
    alta: degradados.filter(w => scoreToSeverity(w.overallScore) === 'high').length,
    remediando: degradados.filter(w => w.remediationStatus !== null).length,
    todos: degradados.length,
  }

  const filtered = degradados.filter(w => {
    const term = search.trim().toLowerCase()
    const matchesTerm = !term
      || w.name.toLowerCase().includes(term)
      || w.namespace.toLowerCase().includes(term)
      || w.cluster.toLowerCase().includes(term)

    const matchesFilter = filter === 'todos'
      || (filter === 'criticos' && scoreToSeverity(w.overallScore) === 'critical')
      || (filter === 'alta' && scoreToSeverity(w.overallScore) === 'high')
      || (filter === 'remediando' && w.remediationStatus !== null)

    return matchesTerm && matchesFilter
  })

  if (isLoading) return <><Header title="Degradações" /><PageLoading /></>
  if (error || !workloads) {
    return (
      <>
        <Header title="Degradações" subtitle="Aplicações que precisam de atenção imediata." />
        <PageError message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
      </>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title="Degradações"
        subtitle="Aplicações abaixo do esperado — ordenadas por prioridade."
      />

      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">
        <SummaryStrip
          items={[
            { label: 'Críticos', value: counts.criticos, helper: 'score < 60' },
            { label: 'Alta prioridade', value: counts.alta, helper: 'score < 75' },
            { label: 'Corrigindo', value: counts.remediando, helper: 'remediação ativa' },
            { label: 'Total', value: counts.todos, helper: 'precisam de atenção' },
          ]}
        />

        <Card>
          <div className="grid gap-4 xl:grid-cols-[1.2fr_auto]">
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, namespace ou cluster"
              icon={Search}
            />
            <FocusTabs
              active={filter}
              onChange={id => setFilter(id as DegradacaoFilter)}
              items={[
                { id: 'todos', label: 'Todos', count: counts.todos },
                { id: 'criticos', label: 'Críticos', count: counts.criticos },
                { id: 'alta', label: 'Alta prior.', count: counts.alta },
                { id: 'remediando', label: 'Corrigindo', count: counts.remediando },
              ]}
            />
          </div>
        </Card>

        {filtered.length === 0 ? (
          <Card>
            {degradados.length === 0 ? (
              <EmptyState
                icon={Siren}
                title="Nenhuma degradação encontrada"
                description="Todos os workloads estão em conformidade. Bom trabalho!"
              />
            ) : (
              <EmptyState
                icon={RotateCcw}
                title="Nenhum resultado neste filtro"
                description="Tente outro filtro ou limpe a busca."
              />
            )}
          </Card>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                {filtered.length} aplicação{filtered.length !== 1 ? 'ões' : ''} — clique para expandir detalhes
              </p>
              {canRemediate && (
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                  style={{ color: 'var(--color-primary)', background: 'rgba(var(--color-primary-rgb,99,102,241),0.08)' }}
                  onClick={() => navigate('/assistant')}
                >
                  <MessageSquare size={11} />
                  Abrir ARIA para diagnóstico
                </button>
              )}
            </div>
            {filtered.map(w => (
              <WorkloadCard key={w.id} workload={w} canRemediate={canRemediate} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
