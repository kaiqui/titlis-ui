import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Inbox, Layers3, Radar, ShieldAlert, ShieldCheck } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Card } from '@/components/jeitto/Card'
import { fadeInUp } from '@/lib/motion/tokens'
import { EmptyState } from '@/components/jeitto/EmptyState'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { ScoreRing } from '@/components/jeitto/ScoreRing'
import { Header } from '@/components/layout/Header'
import { DetailPanel } from '@/components/sre/DetailPanel'
import { FocusTabs } from '@/components/sre/FocusTabs'
import { InlineAccordion } from '@/components/sre/InlineAccordion'
import { SelectionList } from '@/components/sre/SelectionList'
import { SummaryStrip } from '@/components/sre/SummaryStrip'
import { useQueues, useQueueScorecard, useQueueThresholds, useQueueSuggestions, useServiceOptions, useLinkQueue } from '@/hooks/useApi'
import { formatDate, formatEnum, formatNumber, statusTone } from '@/lib/utils'
import type { QueueSummary } from '@/types'

const LINK_SOURCE_LABEL: Record<string, string> = {
  pattern: 'via service.yaml',
  manual: 'atribuição manual',
  env: 'detectado por env var',
  suggested: 'sugestão',
}

function OwnershipPanel({ queue }: { queue: QueueSummary }) {
  const { data: suggestions } = useQueueSuggestions(queue.serviceName ? '' : queue.id)
  const { data: services } = useServiceOptions()
  const linkMutation = useLinkQueue()
  const [showAssign, setShowAssign] = useState(false)
  const [selected, setSelected] = useState('')

  const sugg = suggestions ?? []
  const opts = services ?? []

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>Dono</p>
          {queue.serviceName ? (
            <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
              {queue.serviceName}
              {queue.team && <span style={{ color: 'var(--color-muted-foreground)' }}> · {queue.team}</span>}
              {queue.linkSource && (
                <span className="ml-2 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                  {LINK_SOURCE_LABEL[queue.linkSource] ?? queue.linkSource}
                </span>
              )}
            </p>
          ) : (
            <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>Não atribuída</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowAssign(v => !v)}
          className="rounded-xl border px-3 py-2 text-sm font-semibold"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
        >
          {queue.serviceName ? 'Reatribuir' : 'Atribuir serviço'}
        </button>
      </div>

      {sugg.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold" style={{ color: 'var(--color-foreground)' }}>Ligações sugeridas</p>
          {sugg.map(s => (
            <div key={`${s.serviceDefinitionId}-${s.source}`} className="flex items-center justify-between gap-3 rounded-2xl border px-3 py-2" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                  {s.serviceName}{s.team && <span style={{ color: 'var(--color-muted-foreground)' }}> · {s.team}</span>}
                </p>
                <p className="text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>
                  {LINK_SOURCE_LABEL[s.source] ?? s.source} · confiança {Math.round(s.confidence * 100)}%
                </p>
              </div>
              <button
                type="button"
                disabled={linkMutation.isPending}
                onClick={() => linkMutation.mutate({ id: queue.id, serviceDefinitionId: s.serviceDefinitionId })}
                className="shrink-0 rounded-xl px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
              >
                Confirmar
              </button>
            </div>
          ))}
        </div>
      )}

      {showAssign && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select value={selected} onChange={e => setSelected(e.target.value)} className="jc-select px-3 py-2 text-sm outline-none" aria-label="Escolher serviço">
            <option value="">Selecione um serviço…</option>
            {opts.map(svc => (
              <option key={svc.serviceDefinitionId} value={String(svc.serviceDefinitionId)}>
                {svc.serviceName}{svc.team ? ` (${svc.team})` : ''}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={linkMutation.isPending || !selected}
            onClick={() => { if (selected) linkMutation.mutate({ id: queue.id, serviceDefinitionId: Number(selected) }) }}
            className="rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
          >
            Atribuir
          </button>
        </div>
      )}
    </Card>
  )
}

type ComplianceFilter = 'all' | 'compliant' | 'non_compliant'
type LifecycleFilter = 'all' | 'MONITORING' | 'LEARNING' | 'DISCOVERING'
type TypeFilter = 'all' | 'dlq' | 'regular'
type QueueFocus = 'overview' | 'pillars' | 'findings' | 'thresholds'

function LifecycleBadge({ queue }: { queue: QueueSummary }) {
  if (queue.lifecycleState === 'MONITORING') {
    return (
      <ScoreRing score={queue.overallScore} size={42} strokeWidth={4} />
    )
  }
  if (queue.lifecycleState === 'LEARNING') {
    const pct = queue.learningTarget > 0
      ? Math.round((queue.observationCount / queue.learningTarget) * 100)
      : 0
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="relative h-1.5 w-10 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--color-muted)' }}>
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: 'var(--color-primary)' }}
          />
        </div>
        <span className="text-[10px] font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>
          {queue.observationCount}/{queue.learningTarget}
        </span>
      </div>
    )
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--color-muted)' }}>
      <Radar size={18} style={{ color: 'var(--color-muted-foreground)' }} />
    </div>
  )
}

function LifecycleLabel({ queue }: { queue: QueueSummary }) {
  if (queue.lifecycleState === 'MONITORING') {
    return (
      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusTone(queue.complianceStatus)}`}>
        {formatEnum(queue.complianceStatus ?? 'UNKNOWN')}
      </span>
    )
  }
  if (queue.lifecycleState === 'LEARNING') {
    return (
      <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
        Aprendendo
      </span>
    )
  }
  return (
    <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
      Descoberta
    </span>
  )
}

function ThresholdsPanel({ queueId, observationCount }: { queueId: string; observationCount: number }) {
  const { data: thresholds, isLoading } = useQueueThresholds(queueId)

  if (isLoading) {
    return <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Carregando thresholds…</p>
  }

  if (!thresholds) {
    return (
      <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-muted)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
          Coletando dados para calcular thresholds automáticos.
        </p>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          Observações acumuladas: {observationCount}
        </p>
      </div>
    )
  }

  function fmtSec(s: number) {
    if (s === 0) return '0s'
    if (s < 60) return `${s}s`
    const m = Math.round(s / 60)
    return m < 60 ? `${m}min` : `${Math.round(m / 60)}h`
  }

  function fmtNum(n: number) {
    return n.toLocaleString('pt-BR')
  }

  return (
    <div className="space-y-4">
      <InlineAccordion title="Backlog de mensagens" defaultOpen>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ['P50', fmtNum(thresholds.p50Backlog) + ' msg'],
            ['P75', fmtNum(thresholds.p75Backlog) + ' msg'],
            ['P95', fmtNum(thresholds.p95Backlog) + ' msg'],
          ].map(([label, value]) => (
            <Card key={label}>
              <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{label}</p>
              <p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{value}</p>
            </Card>
          ))}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Card>
            <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Warning (P75 × 1.2)</p>
            <p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{fmtNum(thresholds.backlogWarning)} msg</p>
          </Card>
          <Card>
            <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Critical (P95 × 1.5)</p>
            <p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{fmtNum(thresholds.backlogCritical)} msg</p>
          </Card>
        </div>
      </InlineAccordion>

      <InlineAccordion title="Idade da mensagem mais antiga" defaultOpen>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ['P50', fmtSec(thresholds.p50AgeSec)],
            ['P75', fmtSec(thresholds.p75AgeSec)],
            ['P95', fmtSec(thresholds.p95AgeSec)],
          ].map(([label, value]) => (
            <Card key={label}>
              <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{label}</p>
              <p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{value}</p>
            </Card>
          ))}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Card>
            <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Warning</p>
            <p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{fmtSec(thresholds.ageWarningSec)}</p>
          </Card>
          <Card>
            <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Critical</p>
            <p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{fmtSec(thresholds.ageCriticalSec)}</p>
          </Card>
        </div>
      </InlineAccordion>

      <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
        Calculados em {formatDate(thresholds.calculatedAt)} — com base em {thresholds.observationCount} observações.
      </p>
    </div>
  )
}

export function Queues() {
  const [searchParams, setSearchParams] = useSearchParams()
  const serviceFilter = searchParams.get('service')
  const [complianceFilter, setComplianceFilter] = useState<ComplianceFilter>('all')
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focus, setFocus] = useState<QueueFocus>('overview')

  const { data: allQueues, isLoading, error, refetch } = useQueues()
  const scorecardQuery = useQueueScorecard(selectedId ?? '')
  const detail = scorecardQuery.data

  const queues = allQueues ?? []

  const filtered = queues.filter(q => {
    const matchesService = !serviceFilter || q.serviceName === serviceFilter
    const matchesCompliance = complianceFilter === 'all'
      || (complianceFilter === 'compliant' && q.complianceStatus === 'COMPLIANT')
      || (complianceFilter === 'non_compliant' && q.complianceStatus === 'NON_COMPLIANT')
    const matchesLifecycle = lifecycleFilter === 'all' || q.lifecycleState === lifecycleFilter
    const matchesType = typeFilter === 'all'
      || (typeFilter === 'dlq' && q.isDlq)
      || (typeFilter === 'regular' && !q.isDlq)
    const matchesSearch = search.length === 0
      || q.displayName.toLowerCase().includes(search.toLowerCase())
      || q.externalId.toLowerCase().includes(search.toLowerCase())
    return matchesService && matchesCompliance && matchesLifecycle && matchesType && matchesSearch
  })

  const monitoringQueues = queues.filter(q => q.lifecycleState === 'MONITORING')
  const avgScore = monitoringQueues.length > 0
    ? monitoringQueues.reduce((sum, q) => sum + (q.overallScore ?? 0), 0) / monitoringQueues.length
    : null
  const nonCompliant = monitoringQueues.filter(q => q.complianceStatus === 'NON_COMPLIANT').length

  useEffect(() => {
    if (filtered.length === 0) {
      if (selectedId !== null) setSelectedId(null)
      return
    }
    if (!selectedId || !filtered.some(q => q.id === selectedId)) {
      setSelectedId(filtered[0].id)
      setFocus('overview')
    }
  }, [filtered, selectedId])

  const selectedQueue = filtered.find(q => q.id === selectedId) ?? null

  if (isLoading) return <><Header title="Filas" /><PageLoading /></>
  if (error) {
    return (
      <>
        <Header title="Filas" />
        <PageError message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
      </>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title="Filas"
        subtitle="Scorecards de filas de mensagens com ciclo de aprendizado adaptativo."
      />

      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">
        {serviceFilter && (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm" style={{ color: 'var(--color-foreground)' }}>
                Mostrando apenas filas do serviço{' '}
                <span className="font-semibold">{serviceFilter}</span>
                <span style={{ color: 'var(--color-muted-foreground)' }}> · {filtered.length} de {queues.length}</span>
              </p>
              <button
                type="button"
                onClick={() => setSearchParams(prev => { prev.delete('service'); return prev })}
                className="rounded-xl border px-3 py-1.5 text-sm font-semibold"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
              >
                Limpar filtro
              </button>
            </div>
          </Card>
        )}

        <SummaryStrip
          items={[
            { label: 'Total descobertas', value: queues.length, helper: 'filas monitoradas' },
            { label: 'Em monitoramento', value: monitoringQueues.length, helper: 'com scorecard ativo' },
            { label: 'Score médio', value: avgScore !== null ? formatNumber(avgScore) : 'N/D', helper: 'somente filas monitoradas' },
            { label: 'Não conformes', value: nonCompliant, helper: 'pedem atenção' },
          ]}
        />

        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou subscription ID…"
              className="h-10 min-w-0 flex-1 rounded-xl border bg-transparent px-4 text-sm outline-none focus:ring-1"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)', minWidth: '200px' }}
            />
            <select
              value={lifecycleFilter}
              onChange={e => setLifecycleFilter(e.target.value as LifecycleFilter)}
              className="jc-select px-3 py-2 text-sm outline-none shrink-0"
            >
              <option value="all">Todos os ciclos</option>
              <option value="MONITORING">Monitoramento</option>
              <option value="LEARNING">Aprendendo</option>
              <option value="DISCOVERING">Descoberta</option>
            </select>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as TypeFilter)}
              className="jc-select px-3 py-2 text-sm outline-none shrink-0"
            >
              <option value="all">Todos os tipos</option>
              <option value="regular">Regular</option>
              <option value="dlq">DLQ</option>
            </select>
          </div>

          <div className="mt-4">
            <FocusTabs
              active={complianceFilter}
              onChange={id => setComplianceFilter(id as ComplianceFilter)}
              items={[
                { id: 'all', label: 'Todas', count: queues.length },
                { id: 'non_compliant', label: 'Não conformes', count: nonCompliant },
                { id: 'compliant', label: 'Conformes', count: monitoringQueues.filter(q => q.complianceStatus === 'COMPLIANT').length },
              ]}
            />
          </div>
        </Card>

        {filtered.length === 0 ? (
          <Card>
            <EmptyState
              icon={Inbox}
              title="Nenhuma fila encontrada"
              description="Ajuste os filtros ou aguarde o operator descobrir filas via Datadog."
            />
          </Card>
        ) : (
          <section className="grid gap-4 xl:grid-cols-[23rem_minmax(0,1fr)]">
            <Card className="h-full">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                Prioridade
              </p>
              <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                {filtered.length} filas
              </p>

              <div className="mt-4">
                <SelectionList
                  items={filtered.map(q => ({
                    id: q.id,
                    title: q.displayName || q.externalId.split('/').pop() || q.externalId,
                    subtitle: q.isDlq ? 'DLQ' : undefined,
                    badges: (
                      <>
                        {q.isDlq && (
                          <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold bg-red-900/30 text-red-400">
                            DLQ
                          </span>
                        )}
                        {q.serviceName ? (
                          <span
                            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                            style={{ backgroundColor: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}
                          >
                            → {q.serviceName}
                          </span>
                        ) : (
                          <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold bg-amber-900/30 text-amber-400">
                            sem dono{q.suggestionCount > 0 ? ` · ${q.suggestionCount} sugestão${q.suggestionCount > 1 ? 'ões' : ''}` : ''}
                          </span>
                        )}
                        <LifecycleLabel queue={q} />
                      </>
                    ),
                    meta: <LifecycleBadge queue={q} />,
                  }))}
                  activeId={selectedId}
                  onSelect={id => {
                    setSelectedId(id)
                    setFocus('overview')
                  }}
                />
              </div>
            </Card>

            {selectedQueue && (
              <div className="space-y-4">
                <Card>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex items-center gap-4">
                      <LifecycleBadge queue={selectedQueue} />
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-black tracking-tight" style={{ color: 'var(--color-foreground)' }}>
                            {selectedQueue.displayName || selectedQueue.externalId.split('/').pop()}
                          </p>
                          {selectedQueue.isDlq && (
                            <span className="rounded-full px-3 py-1 text-xs font-semibold bg-red-900/30 text-red-400">
                              DLQ
                            </span>
                          )}
                          <LifecycleLabel queue={selectedQueue} />
                        </div>
                        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                          {selectedQueue.externalId}
                        </p>
                      </div>
                    </div>

                    <FocusTabs
                      active={focus}
                      onChange={id => setFocus(id as QueueFocus)}
                      items={[
                        { id: 'overview', label: 'Resumo' },
                        { id: 'pillars', label: 'Pilares', count: detail?.pillarScores.length },
                        { id: 'findings', label: 'Findings', count: detail?.findings.filter(f => !f.passed).length },
                        { id: 'thresholds', label: 'Thresholds' },
                      ]}
                    />
                  </div>
                </Card>

                <OwnershipPanel key={selectedQueue.id} queue={selectedQueue} />

                {selectedQueue.lifecycleState !== 'MONITORING' ? (
                  <Card>
                    <div className="flex flex-col items-center gap-4 py-6 text-center">
                      {selectedQueue.lifecycleState === 'DISCOVERING' ? (
                        <>
                          <Radar size={32} style={{ color: 'var(--color-muted-foreground)' }} />
                          <div>
                            <p className="font-semibold" style={{ color: 'var(--color-foreground)' }}>Descoberta — coletando dados iniciais</p>
                            <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                              A fila foi identificada. Aguardando ciclos de observação.
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-full max-w-xs">
                            <div className="mb-2 flex justify-between text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                              <span>Aprendendo</span>
                              <span>{selectedQueue.observationCount}/{selectedQueue.learningTarget} ciclos</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--color-muted)' }}>
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.round((selectedQueue.observationCount / selectedQueue.learningTarget) * 100)}%`,
                                  backgroundColor: 'var(--color-primary)',
                                }}
                              />
                            </div>
                          </div>
                          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                            Calculando thresholds adaptativos com base em volumetria real.
                          </p>
                        </>
                      )}
                    </div>
                  </Card>
                ) : scorecardQuery.isLoading ? (
                  <Card>
                    <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                      Carregando scorecard da fila selecionada.
                    </p>
                  </Card>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div key={focus} {...fadeInUp}>
                    {focus === 'overview' && (
                      <DetailPanel title="Resumo" subtitle="Visão geral do scorecard desta fila.">
                        {!detail ? (
                          <EmptyState icon={Layers3} title="Scorecard indisponível" description="O scorecard ainda não foi publicado para esta fila." />
                        ) : (
                          <>
                            <div className="grid gap-3 md:grid-cols-4">
                              {[
                                ['Score', detail.overallScore?.toFixed(1) ?? 'N/D'],
                                ['Avaliado em', formatDate(detail.evaluatedAt)],
                                ['Regras', String(detail.totalRules)],
                                ['Aderência', detail.totalRules > 0 ? `${Math.round((detail.passedRules / detail.totalRules) * 100)}%` : 'N/D'],
                              ].map(([label, value]) => (
                                <Card key={label}>
                                  <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{label}</p>
                                  <p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{value}</p>
                                </Card>
                              ))}
                            </div>
                            <InlineAccordion title="Contagem" defaultOpen>
                              <div className="grid gap-3 md:grid-cols-4">
                                {[
                                  ['Aprovadas', detail.passedRules],
                                  ['Falhas', detail.failedRules],
                                  ['Críticas', detail.criticalFailures],
                                  ['Warnings', detail.warningCount],
                                ].map(([label, value]) => (
                                  <Card key={label}>
                                    <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{label}</p>
                                    <p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{value}</p>
                                  </Card>
                                ))}
                              </div>
                            </InlineAccordion>
                          </>
                        )}
                      </DetailPanel>
                    )}

                    {focus === 'pillars' && (
                      <DetailPanel title="Pilares" subtitle="Resultado por pilar de avaliação.">
                        {!detail || detail.pillarScores.length === 0 ? (
                          <EmptyState icon={Layers3} title="Sem pilares publicados" description="A API ainda não retornou o detalhamento por pilar." />
                        ) : (
                          <div className="space-y-3">
                            {detail.pillarScores.map(pillar => (
                              <InlineAccordion
                                key={pillar.pillar}
                                title={`${formatEnum(pillar.pillar)} · score ${pillar.score?.toFixed(1) ?? 'N/D'}`}
                                defaultOpen={pillar.failedChecks > 0}
                              >
                                <div className="grid gap-3 md:grid-cols-3">
                                  <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Aprovados</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{pillar.passedChecks}</p></Card>
                                  <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Falhas</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{pillar.failedChecks}</p></Card>
                                  <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Peso aplicado</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{pillar.weightedScore?.toFixed(2) ?? 'N/D'}</p></Card>
                                </div>
                              </InlineAccordion>
                            ))}
                          </div>
                        )}
                      </DetailPanel>
                    )}

                    {focus === 'findings' && (
                      <DetailPanel title="Findings" subtitle="Regras que falharam nesta fila.">
                        {!detail || detail.findings.filter(f => !f.passed).length === 0 ? (
                          <div className="flex items-center gap-3 rounded-2xl border px-4 py-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-muted)' }}>
                            <ShieldCheck size={20} className="text-emerald-500 shrink-0" />
                            <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                              Nenhuma falha detectada. Excelente configuração de fila.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {detail.findings.filter(f => !f.passed).map(finding => (
                              <div
                                key={finding.ruleId}
                                className="rounded-2xl border px-4 py-3"
                                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
                              >
                                <div className="flex items-start gap-3">
                                  <ShieldAlert size={16} className="mt-0.5 shrink-0 text-red-500" />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-[13px] font-semibold" style={{ color: 'var(--color-foreground)' }}>
                                        {finding.ruleName || finding.ruleId}
                                      </p>
                                      <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                                        {finding.ruleId}
                                      </span>
                                      <span className="text-[11px] font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
                                        {formatEnum(finding.pillar)}
                                      </span>
                                    </div>
                                    {finding.message && (
                                      <p className="mt-1 text-[13px]" style={{ color: 'var(--color-muted-foreground)' }}>{finding.message}</p>
                                    )}
                                    {finding.actualValue && (
                                      <p className="mt-1 text-[12px]" style={{ color: 'var(--color-muted-foreground)' }}>
                                        Valor atual: <code className="rounded px-1" style={{ backgroundColor: 'var(--color-muted)' }}>{finding.actualValue}</code>
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </DetailPanel>
                    )}

                    {focus === 'thresholds' && (
                      <DetailPanel title="Thresholds" subtitle="Limites calculados com base na volumetria real observada.">
                        <ThresholdsPanel queueId={selectedQueue.id} observationCount={selectedQueue.observationCount} />
                      </DetailPanel>
                    )}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
