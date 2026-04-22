import { useDeferredValue, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, ArrowRight, ClipboardCheck, Layers3, Search, ShieldAlert, ShieldCheck } from 'lucide-react'
import { ButtonDefault } from '@/components/jeitto/ButtonDefault'
import { Card } from '@/components/jeitto/Card'
import { EmptyState } from '@/components/jeitto/EmptyState'
import { Input } from '@/components/jeitto/Input'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { ScoreBadge } from '@/components/jeitto/ScoreBadge'
import { ScoreRing } from '@/components/jeitto/ScoreRing'
import { Header } from '@/components/layout/Header'
import { DetailPanel } from '@/components/sre/DetailPanel'
import { FocusTabs } from '@/components/sre/FocusTabs'
import { InlineAccordion } from '@/components/sre/InlineAccordion'
import { SelectionList } from '@/components/sre/SelectionList'
import { SummaryStrip } from '@/components/sre/SummaryStrip'
import { useDashboardWorkloads, useWorkloadScorecard } from '@/hooks/useApi'
import { buildPlatformSummary } from '@/lib/insights'
import { formatDate, formatEnum, formatNumber, statusTone } from '@/lib/utils'

type ComplianceFilter = 'all' | 'non_compliant' | 'compliant' | 'unknown'
type ScorecardFocus = 'overview' | 'pillars' | 'executive'

export function Scorecards() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [cluster, setCluster] = useState('all')
  const [complianceFilter, setComplianceFilter] = useState<ComplianceFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focus, setFocus] = useState<ScorecardFocus>('overview')
  const deferredSearch = useDeferredValue(search)
  const { data: workloads, isLoading, error, refetch } = useDashboardWorkloads()
  const workloadList = workloads ?? []
  const summary = buildPlatformSummary(workloadList)
  const clusters = ['all', ...new Set(workloadList.map(workload => workload.cluster))]
  const filtered = workloadList
    .filter(workload => {
      const term = deferredSearch.trim().toLowerCase()
      const matchesSearch = term.length === 0
        || workload.name.toLowerCase().includes(term)
        || workload.namespace.toLowerCase().includes(term)
        || workload.cluster.toLowerCase().includes(term)
      const matchesCluster = cluster === 'all' || workload.cluster === cluster
      const matchesCompliance = complianceFilter === 'all'
        || (complianceFilter === 'non_compliant' && workload.complianceStatus === 'NON_COMPLIANT')
        || (complianceFilter === 'compliant' && workload.complianceStatus === 'COMPLIANT')
        || (complianceFilter === 'unknown' && workload.complianceStatus !== 'NON_COMPLIANT' && workload.complianceStatus !== 'COMPLIANT')

      return matchesSearch && matchesCluster && matchesCompliance
    })
    .sort((left, right) => (left.overallScore ?? -1) - (right.overallScore ?? -1))

  useEffect(() => {
    if (filtered.length === 0) {
      if (selectedId !== null) setSelectedId(null)
      return
    }

    if (!selectedId || !filtered.some(workload => workload.id === selectedId)) {
      setSelectedId(filtered[0].id)
      setFocus('overview')
    }
  }, [filtered, selectedId])

  const selectedWorkload = filtered.find(workload => workload.id === selectedId) ?? null
  const scorecardQuery = useWorkloadScorecard(selectedWorkload?.id ?? '')
  const detail = scorecardQuery.data
  const adherence = detail && detail.totalRules > 0 ? Math.round((detail.passedRules / detail.totalRules) * 100) : null

  if (isLoading) return <><Header title="Termômetro de Confiabilidade" /><PageLoading /></>
  if (error || !workloads) {
    return (
      <>
        <Header title="Termômetro de Confiabilidade" />
        <PageError message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
      </>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Termômetro de Confiabilidade" subtitle="Escolha um workload e aprofunde só o scorecard em foco." />

      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">
        <SummaryStrip
          items={[
            { label: 'Publicados', value: summary.scoredWorkloads, helper: 'scorecards disponíveis' },
            { label: 'Score de confiabilidade médio', value: formatNumber(summary.averageScore), helper: 'aderência da plataforma' },
            { label: 'Não conformes', value: summary.nonCompliantCount, helper: 'pedem priorização' },
            { label: 'Cluster', value: cluster === 'all' ? 'Todos' : cluster, helper: 'recorte atual' },
          ]}
        />

        <Card>
          <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar por workload, namespace ou cluster"
              icon={Search}
            />

            <select
              value={cluster}
              onChange={event => setCluster(event.target.value)}
              className="jc-select px-4 py-3 text-sm outline-none"
            >
              {clusters.map(option => (
                <option key={option} value={option}>
                  {option === 'all' ? 'Todos os clusters' : option}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <FocusTabs
              active={complianceFilter}
              onChange={id => setComplianceFilter(id as ComplianceFilter)}
              items={[
                { id: 'all', label: 'Todos', count: workloadList.length },
                { id: 'non_compliant', label: 'Não conformes', count: summary.nonCompliantCount },
                { id: 'compliant', label: 'Conformes', count: summary.compliantCount },
                { id: 'unknown', label: 'Sem classificação', count: workloadList.length - summary.nonCompliantCount - summary.compliantCount },
              ]}
            />
            <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              Ordenação: menor score primeiro
            </p>
          </div>
        </Card>

        {filtered.length === 0 ? (
          <Card>
            <EmptyState
              icon={ClipboardCheck}
              title="Nenhum scorecard encontrado"
              description="Ajuste a busca ou os filtros."
            />
          </Card>
        ) : (
          <section className="grid gap-4 xl:grid-cols-[23rem_minmax(0,1fr)]">
            <Card className="h-full">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                    Prioridade
                  </p>
                  <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                    {filtered.length} workloads
                  </p>
                </div>
                <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                  {cluster === 'all' ? 'Todos os clusters' : cluster}
                </span>
              </div>

              <div className="mt-4">
                <SelectionList
                  items={filtered.map(workload => ({
                    id: workload.id,
                    title: workload.name,
                    subtitle: `${workload.namespace} · ${workload.cluster} · ${formatEnum(workload.environment)}`,
                    badges: (
                      <>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusTone(workload.complianceStatus)}`}>
                          {formatEnum(workload.complianceStatus)}
                        </span>
                        <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                          score {workload.overallScore === null ? 'N/D' : workload.overallScore.toFixed(1)}
                        </span>
                      </>
                    ),
                    meta: <ScoreBadge score={workload.overallScore} size="sm" />,
                  }))}
                  activeId={selectedId}
                  onSelect={id => {
                    setSelectedId(id)
                    setFocus('overview')
                  }}
                />
              </div>
            </Card>

            {selectedWorkload && (
              <div className="space-y-4">
                <Card>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex items-center gap-4">
                      <ScoreRing score={selectedWorkload.overallScore} size={84} strokeWidth={7} showLabel showFraction />
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-black tracking-tight" style={{ color: 'var(--color-foreground)' }}>
                            {selectedWorkload.name}
                          </p>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(selectedWorkload.complianceStatus)}`}>
                            {formatEnum(selectedWorkload.complianceStatus)}
                          </span>
                        </div>
                        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                          {selectedWorkload.namespace} · {selectedWorkload.cluster} · {formatEnum(selectedWorkload.environment)}
                        </p>
                      </div>
                    </div>

                    <FocusTabs
                      active={focus}
                      onChange={id => setFocus(id as ScorecardFocus)}
                      items={[
                        { id: 'overview', label: 'Resumo' },
                        { id: 'pillars', label: 'Pilares', count: detail?.pillarScores.length },
                        { id: 'executive', label: 'Executivo' },
                      ]}
                    />
                  </div>
                </Card>

                {scorecardQuery.isLoading ? (
                  <Card>
                    <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                      Carregando scorecard do workload selecionado.
                    </p>
                  </Card>
                ) : scorecardQuery.error || !detail ? (
                  <DetailPanel
                    title="Scorecard indisponível"
                    subtitle="O item continua na fila, mas o detalhamento não pôde ser carregado."
                    headerMeta={
                      <ButtonDefault
                        label="Tela completa"
                        visual="secondary"
                        icon={ArrowRight}
                        onClick={() => navigate(`/scorecards/${selectedWorkload.id}`)}
                      />
                    }
                  >
                    <EmptyState
                      icon={Layers3}
                      title="Sem detalhe para este scorecard"
                      description={scorecardQuery.error instanceof Error ? scorecardQuery.error.message : 'Verifique se o evento scorecard_evaluated já chegou ao titlis-api.'}
                    />
                  </DetailPanel>
                ) : (
                  <>
                    {focus === 'overview' && (
                      <DetailPanel
                        title="Resumo do scorecard"
                        subtitle="Leitura rápida da avaliação atual."
                        headerMeta={
                          <ButtonDefault
                            label="Tela completa"
                            visual="secondary"
                            icon={ArrowRight}
                            onClick={() => navigate(`/scorecards/${selectedWorkload.id}`)}
                          />
                        }
                      >
                        <div className="grid gap-3 md:grid-cols-4">
                          {[
                            ['Avaliado em', formatDate(detail.evaluatedAt)],
                            ['Aderência', adherence === null ? 'N/D' : `${adherence}%`],
                            ['Score', detail.overallScore === null ? 'N/D' : detail.overallScore.toFixed(1)],
                            ['Versão', detail.version ?? 'N/D'],
                          ].map(([label, value]) => (
                            <Card key={label}>
                              <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{label}</p>
                              <p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{value}</p>
                            </Card>
                          ))}
                        </div>

                        <InlineAccordion title="Contagem da avaliação" defaultOpen>
                          <div className="grid gap-3 md:grid-cols-4">
                            {[
                              ['Regras totais', detail.totalRules],
                              ['Aprovadas', detail.passedRules],
                              ['Falhas', detail.failedRules],
                              ['Críticas', detail.criticalFailures],
                            ].map(([label, value]) => (
                              <Card key={label}>
                                <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{label}</p>
                                <p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{value}</p>
                              </Card>
                            ))}
                          </div>
                        </InlineAccordion>
                      </DetailPanel>
                    )}

                    {focus === 'pillars' && (
                      <DetailPanel title="Pilares" subtitle="Abra apenas o pilar em investigação.">
                        {detail.pillarScores.length === 0 ? (
                          <EmptyState icon={Layers3} title="Sem pilares publicados" description="A API ainda não retornou o detalhamento por pilar." />
                        ) : (
                          <div className="space-y-3">
                            {detail.pillarScores.map(pillar => (
                              <InlineAccordion key={pillar.pillar} title={`${formatEnum(pillar.pillar)} · score ${pillar.score ?? 'N/D'}`} defaultOpen={pillar.failedChecks > 0}>
                                <div className="grid gap-3 md:grid-cols-3">
                                  <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Aprovados</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{pillar.passedChecks}</p></Card>
                                  <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Falhas</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{pillar.failedChecks}</p></Card>
                                  <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Peso aplicado</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{pillar.weightedScore ?? 'N/D'}</p></Card>
                                </div>
                              </InlineAccordion>
                            ))}
                          </div>
                        )}
                      </DetailPanel>
                    )}

                    {focus === 'executive' && (
                      <DetailPanel title="Leitura executiva" subtitle="O que importa para priorização agora.">
                        <div className="grid gap-3 md:grid-cols-3">
                          <Card>
                            <div className="flex items-center gap-2">
                              <ClipboardCheck size={15} style={{ color: 'var(--color-primary)' }} />
                              <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Aderência</p>
                            </div>
                            <p className="mt-2 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>
                              {adherence === null ? 'N/D' : `${adherence}%`}
                            </p>
                          </Card>
                          <Card>
                            <div className="flex items-center gap-2">
                              {detail.complianceStatus === 'NON_COMPLIANT'
                                ? <ShieldAlert size={15} className="text-red-500" />
                                : <ShieldCheck size={15} className="text-emerald-500" />}
                              <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Estado</p>
                            </div>
                            <p className="mt-2 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>
                              {formatEnum(detail.complianceStatus)}
                            </p>
                          </Card>
                          <Card>
                            <div className="flex items-center gap-2">
                              <Activity size={15} style={{ color: 'var(--color-primary)' }} />
                              <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Ação</p>
                            </div>
                            <p className="mt-2 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>
                              {detail.criticalFailures > 0 ? 'Priorizar falhas críticas' : 'Manter monitoramento'}
                            </p>
                          </Card>
                        </div>

                        <InlineAccordion title="Próximo passo" defaultOpen>
                          <div className="rounded-3xl border px-4 py-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-muted)' }}>
                            <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>
                              {detail.criticalFailures > 0 ? 'Abrir o workload para tratar as falhas críticas primeiro.' : 'Revisar pilares com falhas para evitar regressão.'}
                            </p>
                            <p className="mt-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                              A leitura executiva resume o risco. Use a tela completa quando precisar navegar item por item.
                            </p>
                            <ButtonDefault
                              label="Abrir workload"
                              icon={ArrowRight}
                              className="mt-3"
                              onClick={() => navigate(`/applications/${selectedWorkload.id}`)}
                            />
                          </div>
                        </InlineAccordion>
                      </DetailPanel>
                    )}
                  </>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
