import { useDeferredValue, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight, GitPullRequest, Layers3, Search, XCircle } from 'lucide-react'
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
import { useDashboardWorkloads, useWorkloadRemediation, useWorkloadScorecard } from '@/hooks/useApi'
import { formatDate, formatEnum, statusTone } from '@/lib/utils'

type SortKey = 'score' | 'name' | 'namespace'
type ComplianceFilter = 'all' | 'non_compliant' | 'compliant' | 'unknown'
type WorkspaceFocus = 'overview' | 'findings' | 'pillars' | 'remediation'

export function Applications() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [cluster, setCluster] = useState('all')
  const [environment, setEnvironment] = useState('all')
  const [complianceFilter, setComplianceFilter] = useState<ComplianceFilter>('non_compliant')
  const [sortKey, setSortKey] = useState<SortKey>('score')
  const [descending, setDescending] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focus, setFocus] = useState<WorkspaceFocus>('overview')

  const deferredSearch = useDeferredValue(search)
  const { data: workloads, isLoading, error, refetch } = useDashboardWorkloads()
  const workloadList = workloads ?? []
  const clusters = ['all', ...new Set(workloadList.map(workload => workload.cluster))]
  const environments = ['all', ...new Set(workloadList.map(workload => workload.environment))]

  const filtered = workloadList
    .filter(workload => {
      const term = deferredSearch.trim().toLowerCase()
      const matchesSearch = term.length === 0
        || workload.name.toLowerCase().includes(term)
        || workload.namespace.toLowerCase().includes(term)
        || workload.cluster.toLowerCase().includes(term)

      const matchesCluster = cluster === 'all' || workload.cluster === cluster
      const matchesEnvironment = environment === 'all' || workload.environment === environment
      const matchesCompliance = complianceFilter === 'all'
        || (complianceFilter === 'non_compliant' && workload.complianceStatus === 'NON_COMPLIANT')
        || (complianceFilter === 'compliant' && workload.complianceStatus === 'COMPLIANT')
        || (complianceFilter === 'unknown' && workload.complianceStatus !== 'COMPLIANT' && workload.complianceStatus !== 'NON_COMPLIANT')

      return matchesSearch && matchesCluster && matchesEnvironment && matchesCompliance
    })
    .sort((left, right) => {
      if (sortKey === 'name') {
        return descending ? right.name.localeCompare(left.name) : left.name.localeCompare(right.name)
      }

      if (sortKey === 'namespace') {
        return descending ? right.namespace.localeCompare(left.namespace) : left.namespace.localeCompare(right.namespace)
      }

      const leftScore = left.overallScore ?? -1
      const rightScore = right.overallScore ?? -1
      return descending ? rightScore - leftScore : leftScore - rightScore
    })

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
  const remediationQuery = useWorkloadRemediation(selectedWorkload?.id ?? '')
  const detail = scorecardQuery.data
  const remediation = remediationQuery.data
  const failedFindings = detail?.validationResults.filter(item => !item.passed) ?? []
  const nonCompliantCount = workloadList.filter(workload => workload.complianceStatus === 'NON_COMPLIANT').length
  const compliantCount = workloadList.filter(workload => workload.complianceStatus === 'COMPLIANT').length
  const unknownCount = workloadList.length - nonCompliantCount - compliantCount
  const sortLabel = sortKey === 'score' ? 'Score' : sortKey === 'name' ? 'Nome' : 'Namespace'

  if (isLoading) return <><Header title="Services" /><PageLoading /></>
  if (error || !workloads) {
    return (
      <>
        <Header title="Services" />
        <PageError message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
      </>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Services" subtitle="Selecione um service e abra só a camada de detalhe que precisar." />

      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">
        <SummaryStrip
          items={[
            { label: 'Na fila', value: filtered.length, helper: 'workloads no recorte atual' },
            { label: 'Não conformes', value: nonCompliantCount, helper: 'pedem ação imediata' },
            { label: 'Conformes', value: compliantCount, helper: 'sem risco imediato' },
            { label: 'Sem classificação', value: unknownCount, helper: 'aguardando leitura completa' },
          ]}
        />

        <Card>
          <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
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

            <select
              value={environment}
              onChange={event => setEnvironment(event.target.value)}
              className="jc-select px-4 py-3 text-sm outline-none"
            >
              {environments.map(option => (
                <option key={option} value={option}>
                  {option === 'all' ? 'Todos os ambientes' : formatEnum(option)}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setSortKey(current => current === 'score' ? 'name' : current === 'name' ? 'namespace' : 'score')
                setDescending(current => !current)
              }}
              className="jc-secondary-button inline-flex items-center justify-center gap-2 px-4 py-3 text-sm"
              type="button"
            >
              {sortLabel}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <FocusTabs
              active={complianceFilter}
              onChange={id => setComplianceFilter(id as ComplianceFilter)}
              items={[
                { id: 'non_compliant', label: 'Não conformes', count: nonCompliantCount },
                { id: 'all', label: 'Todos', count: workloadList.length },
                { id: 'compliant', label: 'Conformes', count: compliantCount },
                { id: 'unknown', label: 'Sem classificação', count: unknownCount },
              ]}
            />
            <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              Ordenação: {sortLabel} · {descending ? 'desc' : 'asc'}
            </p>
          </div>
        </Card>

        {filtered.length === 0 ? (
          <Card>
            <EmptyState
              icon={Layers3}
              title="Nenhum workload encontrado"
              description="Ajuste os filtros ou a busca para ampliar a lista."
            />
          </Card>
        ) : (
          <section className="grid gap-4 xl:grid-cols-[23rem_minmax(0,1fr)]">
            <Card className="h-full">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                    Fila atual
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
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusTone(workload.remediationStatus)}`}>
                          {formatEnum(workload.remediationStatus)}
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
                      <ScoreRing score={selectedWorkload.overallScore} size={82} strokeWidth={7} showLabel />
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-black tracking-tight" style={{ color: 'var(--color-foreground)' }}>
                            {selectedWorkload.name}
                          </p>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(selectedWorkload.complianceStatus)}`}>
                            {formatEnum(selectedWorkload.complianceStatus)}
                          </span>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(remediation?.status ?? selectedWorkload.remediationStatus)}`}>
                            {formatEnum(remediation?.status ?? selectedWorkload.remediationStatus)}
                          </span>
                        </div>
                        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                          {selectedWorkload.namespace} · {selectedWorkload.cluster} · {formatEnum(selectedWorkload.environment)}
                        </p>
                      </div>
                    </div>

                    <FocusTabs
                      active={focus}
                      onChange={id => setFocus(id as WorkspaceFocus)}
                      items={[
                        { id: 'overview', label: 'Resumo' },
                        { id: 'findings', label: 'Falhas', count: detail ? failedFindings.length : undefined },
                        { id: 'pillars', label: 'Pilares', count: detail?.pillarScores.length },
                        { id: 'remediation', label: 'Remediação' },
                      ]}
                    />
                  </div>
                </Card>

                {scorecardQuery.isLoading ? (
                  <Card>
                    <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                      Carregando detalhe do workload selecionado.
                    </p>
                  </Card>
                ) : scorecardQuery.error || !detail ? (
                  <DetailPanel
                    title="Detalhe indisponível"
                    subtitle="O resumo continua visível na fila, mas o scorecard detalhado ainda não está disponível."
                    headerMeta={
                      <ButtonDefault
                        label="Abrir tela completa"
                        visual="secondary"
                        icon={ArrowRight}
                        onClick={() => navigate(`/applications/${selectedWorkload.id}`)}
                      />
                    }
                  >
                    <EmptyState
                      icon={AlertTriangle}
                      title="Não foi possível abrir o detalhe"
                      description={scorecardQuery.error instanceof Error ? scorecardQuery.error.message : 'Verifique se o operator já publicou o scorecard deste workload.'}
                    />
                  </DetailPanel>
                ) : (
                  <>
                    {focus === 'overview' && (
                      <DetailPanel
                        title="Resumo do workload"
                        subtitle="Leitura rápida da avaliação atual."
                        headerMeta={
                          <ButtonDefault
                            label="Tela completa"
                            visual="secondary"
                            icon={ArrowRight}
                            onClick={() => navigate(`/applications/${selectedWorkload.id}`)}
                          />
                        }
                      >
                        <div className="grid gap-3 md:grid-cols-4">
                          {[
                            ['Última avaliação', formatDate(detail.evaluatedAt)],
                            ['Kind', formatEnum(detail.kind)],
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
                              ['Regras', detail.totalRules],
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

                    {focus === 'findings' && (
                      <DetailPanel title="Falhas ativas" subtitle="Abra os itens reprovados sem sair da fila principal.">
                        <InlineAccordion title={`Itens não conformes (${failedFindings.length})`} defaultOpen>
                          <div className="space-y-3">
                            {failedFindings.length === 0 && (
                              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                                Nenhuma falha ativa para este workload.
                              </p>
                            )}

                            {failedFindings.map(finding => (
                              <div key={finding.ruleId} className="rounded-3xl border px-4 py-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-muted)' }}>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>
                                        {finding.ruleName}
                                      </p>
                                      <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#dc2626' }}>
                                        {formatEnum(finding.severity)}
                                      </span>
                                    </div>
                                    <p className="mt-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                                      {finding.message ?? 'Sem detalhe adicional para esta regra.'}
                                    </p>
                                  </div>
                                  <XCircle size={16} className="text-red-500" />
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                  <span className="rounded-full px-3 py-1" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-muted-foreground)' }}>
                                    {formatEnum(finding.pillar)}
                                  </span>
                                  <span className="rounded-full px-3 py-1" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-muted-foreground)' }}>
                                    {finding.ruleId}
                                  </span>
                                  {finding.remediable && (
                                    <span className="rounded-full px-3 py-1 font-semibold" style={{ backgroundColor: 'rgba(var(--color-primary-rgb),0.1)', color: 'var(--color-primary)' }}>
                                      Remediável
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </InlineAccordion>
                      </DetailPanel>
                    )}

                    {focus === 'pillars' && (
                      <DetailPanel title="Pilares" subtitle="Abra apenas o pilar que precisa de análise.">
                        {detail.pillarScores.length === 0 ? (
                          <EmptyState icon={Layers3} title="Sem pilares publicados" description="A avaliação existe, mas a API ainda não retornou o recorte por pilar." />
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

                    {focus === 'remediation' && (
                      <DetailPanel title="Remediação" subtitle="Estado atual e ação rápida para este workload.">
                        {!remediation ? (
                          <EmptyState
                            icon={GitPullRequest}
                            title="Sem remediação publicada"
                            description="Ainda não existe evento de remediação para este workload."
                          />
                        ) : (
                          <>
                            <div className="grid gap-3 md:grid-cols-3">
                              <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Status</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{formatEnum(remediation.status)}</p></Card>
                              <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Versão</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{remediation.version}</p></Card>
                              <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Disparado em</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{formatDate(remediation.triggeredAt)}</p></Card>
                            </div>

                            {remediation.githubPrUrl && (
                              <div className="flex flex-wrap gap-2">
                                <ButtonDefault
                                  label={`Abrir PR #${remediation.githubPrNumber ?? 'N/D'}`}
                                  icon={ArrowRight}
                                  onClick={() => window.open(remediation.githubPrUrl ?? '', '_blank', 'noreferrer')}
                                />
                              </div>
                            )}
                          </>
                        )}
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
