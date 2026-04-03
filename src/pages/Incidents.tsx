import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, GitPullRequest, Search, ShieldAlert, Siren, User } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { ButtonDefault } from '@/components/jeitto/ButtonDefault'
import { Card } from '@/components/jeitto/Card'
import { EmptyState } from '@/components/jeitto/EmptyState'
import { Input } from '@/components/jeitto/Input'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { DetailPanel } from '@/components/sre/DetailPanel'
import { FocusTabs } from '@/components/sre/FocusTabs'
import { InlineAccordion } from '@/components/sre/InlineAccordion'
import { SelectionList } from '@/components/sre/SelectionList'
import { SummaryStrip } from '@/components/sre/SummaryStrip'
import { useDashboardWorkloads } from '@/hooks/useApi'
import { buildIncidents } from '@/lib/incidents'
import { formatDate, formatEnum, statusTone } from '@/lib/utils'
import { useAuth } from '@/contexts/useAuth'

type IncidentFilter = 'all' | 'active' | 'critical' | 'unassigned'
type IncidentFocus = 'overview' | 'impact' | 'actions'

function severityTone(severity: string) {
  if (severity === 'critical') return 'bg-red-500/10 text-red-600 dark:text-red-400'
  if (severity === 'high') return 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
  if (severity === 'medium') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
  return 'bg-slate-500/10 text-slate-500'
}

export function Incidents() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<IncidentFilter>('active')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focus, setFocus] = useState<IncidentFocus>('overview')
  const { data: workloads, isLoading, error, refetch } = useDashboardWorkloads()
  const workloadList = workloads ?? []
  const incidents = buildIncidents(workloadList)

  const filtered = incidents.filter(item => {
    const term = search.trim().toLowerCase()
    const matchesTerm = term.length === 0
      || item.title.toLowerCase().includes(term)
      || item.service.toLowerCase().includes(term)
      || item.namespace.toLowerCase().includes(term)

    const matchesFilter = filter === 'all'
      || (filter === 'active' && item.status !== 'mitigated')
      || (filter === 'critical' && item.severity === 'critical')
      || (filter === 'unassigned' && item.owner === 'plataforma')

    return matchesTerm && matchesFilter
  })

  useEffect(() => {
    if (filtered.length === 0) {
      if (selectedId !== null) setSelectedId(null)
      return
    }

    if (!selectedId || !filtered.some(item => item.id === selectedId)) {
      setSelectedId(filtered[0].id)
      setFocus('overview')
    }
  }, [filtered, selectedId])

  const selected = filtered.find(item => item.id === selectedId) ?? null
  const canExecuteRemediation = Boolean(user?.canRemediate)
  const summary = useMemo(() => ({
    active: incidents.filter(item => item.status !== 'mitigated').length,
    critical: incidents.filter(item => item.severity === 'critical').length,
    services: new Set(incidents.map(item => item.service)).size,
    unassigned: incidents.filter(item => item.owner === 'plataforma').length,
  }), [incidents])

  if (isLoading) return <><Header title="Incidentes" /><PageLoading /></>
  if (error || !workloads) {
    return (
      <>
        <Header title="Incidentes" />
        <PageError message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
      </>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Incidentes" subtitle="Fila operacional com foco por incidente e detalhe no mesmo contexto." />

      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">
        <SummaryStrip
          items={[
            { label: 'Ativos', value: summary.active, helper: 'pedem atenção agora' },
            { label: 'Críticos', value: summary.critical, helper: 'maior risco' },
            { label: 'Serviços', value: summary.services, helper: 'impactados' },
            { label: 'Sem owner', value: summary.unassigned, helper: 'pedem atribuição' },
          ]}
        />

        <Card>
          <div className="grid gap-4 xl:grid-cols-[1.2fr_auto]">
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar por incidente, serviço ou namespace"
              icon={Search}
            />
            <FocusTabs
              active={filter}
              onChange={id => setFilter(id as IncidentFilter)}
              items={[
                { id: 'active', label: 'Ativos', count: summary.active },
                { id: 'critical', label: 'Críticos', count: summary.critical },
                { id: 'unassigned', label: 'Sem owner', count: summary.unassigned },
                { id: 'all', label: 'Todos', count: incidents.length },
              ]}
            />
          </div>
        </Card>

        {filtered.length === 0 ? (
          <Card>
            <EmptyState icon={Siren} title="Nenhum incidente neste recorte" description="Ajuste o filtro ou a busca." />
          </Card>
        ) : (
          <section className="grid gap-4 xl:grid-cols-[23rem_minmax(0,1fr)]">
            <Card className="h-full">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                    Fila ativa
                  </p>
                  <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                    {filtered.length} incidentes
                  </p>
                </div>
                <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                  {formatEnum(filter)}
                </span>
              </div>

              <div className="mt-4">
                <SelectionList
                  items={filtered.map(item => ({
                    id: item.id,
                    title: item.title,
                    subtitle: `${item.namespace} · ${item.cluster} · ${formatDate(item.startedAt)}`,
                    badges: (
                      <>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${severityTone(item.severity)}`}>{formatEnum(item.severity)}</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(item.status)}`}>{formatEnum(item.status)}</span>
                      </>
                    ),
                    meta: <span className="text-xs font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>{item.owner}</span>,
                  }))}
                  activeId={selected?.id ?? null}
                  onSelect={id => {
                    setSelectedId(id)
                    setFocus('overview')
                  }}
                />
              </div>
            </Card>

            {selected && (
              <div className="space-y-4">
                <Card>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-black tracking-tight" style={{ color: 'var(--color-foreground)' }}>{selected.title}</p>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${severityTone(selected.severity)}`}>{formatEnum(selected.severity)}</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(selected.status)}`}>{formatEnum(selected.status)}</span>
                      </div>
                      <p className="mt-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                        {selected.service} · {selected.namespace} · {selected.cluster}
                      </p>
                    </div>

                    <FocusTabs
                      active={focus}
                      onChange={id => setFocus(id as IncidentFocus)}
                      items={[
                        { id: 'overview', label: 'Resumo' },
                        { id: 'impact', label: 'Impacto', count: selected.evidence.length },
                        { id: 'actions', label: 'Ações', count: selected.actions.length },
                      ]}
                    />
                  </div>
                </Card>

                {focus === 'overview' && (
                  <DetailPanel
                    title="Resumo do incidente"
                    subtitle="Contexto curto para triagem rápida."
                    headerMeta={<span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>{selected.owner}</span>}
                  >
                    <div className="grid gap-3 md:grid-cols-4">
                      <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Status</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{formatEnum(selected.status)}</p></Card>
                      <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Owner</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{selected.owner}</p></Card>
                      <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Início</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{formatDate(selected.startedAt)}</p></Card>
                      <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Score</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{selected.score === null ? 'N/D' : selected.score.toFixed(1)}</p></Card>
                    </div>

                    <InlineAccordion title="Resumo" defaultOpen>
                      <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>{selected.summary}</p>
                    </InlineAccordion>

                    <InlineAccordion title="Próximo passo">
                      <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                        Priorize owner, confirme o impacto e só depois desça para sinais e trilha de correção.
                      </p>
                    </InlineAccordion>
                  </DetailPanel>
                )}

                {focus === 'impact' && (
                  <DetailPanel title="Impacto e evidências" subtitle="Sinais técnicos e leitura do alcance do incidente.">
                    <InlineAccordion title="Impacto" defaultOpen>
                      <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>{selected.impact}</p>
                    </InlineAccordion>

                    <InlineAccordion title="Evidências">
                      <div className="space-y-2">
                        {selected.evidence.map(item => (
                          <div key={item} className="rounded-2xl px-3 py-2" style={{ backgroundColor: 'var(--color-muted)' }}>
                            <p className="text-sm" style={{ color: 'var(--color-foreground)' }}>{item}</p>
                          </div>
                        ))}
                      </div>
                    </InlineAccordion>
                  </DetailPanel>
                )}

                {focus === 'actions' && (
                  <DetailPanel title="Ações do incidente" subtitle="Trilha curta para condução e mitigação.">
                    <InlineAccordion title="Próximas ações" defaultOpen>
                      <div className="space-y-2">
                        {selected.actions.map(item => (
                          <div key={item} className="rounded-2xl px-3 py-2" style={{ backgroundColor: 'var(--color-muted)' }}>
                            <p className="text-sm" style={{ color: 'var(--color-foreground)' }}>{item}</p>
                          </div>
                        ))}
                      </div>
                    </InlineAccordion>

                    <div className="flex flex-wrap gap-2">
                      {canExecuteRemediation ? (
                        <>
                          <ButtonDefault label="Atribuir owner" icon={User} visual="secondary" />
                          <ButtonDefault label="Marcar mitigado" icon={ShieldAlert} />
                        </>
                      ) : (
                        <div className="rounded-2xl border px-3 py-2 text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)', background: 'var(--color-muted)' }}>
                          Ações de remediação disponíveis somente para admin.
                        </div>
                      )}
                      {selected.githubPrUrl && (
                        <a href={selected.githubPrUrl} target="_blank" rel="noreferrer">
                          <ButtonDefault label="Abrir PR" icon={GitPullRequest} visual="secondary" />
                        </a>
                      )}
                      {selected.runbookUrl && (
                        <a href={selected.runbookUrl} target="_blank" rel="noreferrer">
                          <ButtonDefault label="Abrir runbook" icon={ExternalLink} visual="secondary" />
                        </a>
                      )}
                    </div>
                  </DetailPanel>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
