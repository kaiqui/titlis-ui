import { useMemo, useState } from 'react'
import { ArrowRight, GitPullRequest, Layers3, Siren, Star, Target } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { ButtonDefault } from '@/components/jeitto/ButtonDefault'
import { Card } from '@/components/jeitto/Card'
import { EmptyState } from '@/components/jeitto/EmptyState'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { ScoreBadge } from '@/components/jeitto/ScoreBadge'
import { ScoreRing } from '@/components/jeitto/ScoreRing'
import { DetailPanel } from '@/components/sre/DetailPanel'
import { FocusTabs } from '@/components/sre/FocusTabs'
import { InlineAccordion } from '@/components/sre/InlineAccordion'
import { SelectionList } from '@/components/sre/SelectionList'
import { SummaryStrip } from '@/components/sre/SummaryStrip'
import { useAvailableTags, useDashboardWorkloads, useSloCatalog } from '@/hooks/useApi'
import { isKeyValue, TagFilterInput } from '@/components/sre/TagFilterInput'
import { Pagination } from '@/components/jeitto/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { buildClusterSummaries, buildCriticalWorkloads, buildPlatformSummary, buildRemediationQueue } from '@/lib/insights'
import { FavoriteStar } from '@/components/sre/FavoriteStar'
import { buildIncidents } from '@/lib/incidents'
import { formatEnum, formatEnvironment, formatNumber, statusTone } from '@/lib/utils'
import type { SloListItem } from '@/types'

type DashboardFocus = 'incidents' | 'workloads' | 'remediation' | 'coverage' | 'slos' | 'meus_servicos'

export function Dashboard() {
  const navigate = useNavigate()
  const [focus, setFocus] = useState<DashboardFocus>('incidents')
  const [activeChips, setActiveChips] = useState<string[]>([])
  const tagChips = activeChips.filter(isKeyValue)
  const textChips = activeChips.filter(c => !isKeyValue(c))
  const { data: workloads, isLoading, error, refetch } = useDashboardWorkloads(undefined, tagChips.length > 0 ? tagChips : undefined)
  const { data: availableTags = [] } = useAvailableTags('workload')
  const { data: slos } = useSloCatalog()
  const workloadList = workloads ?? []
  const sloList: SloListItem[] = slos ?? []
  const myServices = workloadList.filter(w => w.isFavorite)
  const summary = buildPlatformSummary(workloadList)
  const incidents = buildIncidents(workloadList)
  const criticalWorkloads = buildCriticalWorkloads(workloadList)
  const remediationQueue = buildRemediationQueue(workloadList)
  const coverage = buildClusterSummaries(workloadList)
  const slosWithError = sloList.filter(s => s.datadogSloState === 'error').length
  const slosNotSynced = sloList.filter(s => !s.datadogSloId).length

  const [selectedMyServiceId, setSelectedMyServiceId] = useState<string | null>(myServices[0]?.id ?? null)

  const focusItems = useMemo(() => ({
    meus_servicos: myServices.map(item => ({
      id: item.id,
      title: item.name,
      subtitle: `${item.namespace} · ${item.cluster}`,
      badges: (
        <>
          <ScoreBadge score={item.overallScore} size="sm" />
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(item.complianceStatus)}`}>
            {formatEnum(item.complianceStatus)}
          </span>
        </>
      ),
      meta: <ScoreRing score={item.overallScore} size={48} strokeWidth={5} />,
      action: <FavoriteStar workloadId={item.id} isFavorite={item.isFavorite} />,
    })),
    incidents: incidents.map(item => ({
      id: item.id,
      title: item.title,
      subtitle: `${item.namespace} · ${item.cluster} · ${formatEnvironment(item.environment)}`,
      badges: (
        <>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(item.status)}`}>{formatEnum(item.status)}</span>
          <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
            {formatEnum(item.severity)}
          </span>
        </>
      ),
      meta: <span className="text-xs font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>{item.owner}</span>,
    })),
    workloads: criticalWorkloads.map(item => ({
      id: item.id,
      title: item.name,
      subtitle: `${item.namespace} · ${item.cluster}`,
      badges: (
        <>
          <ScoreBadge score={item.overallScore} size="sm" />
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(item.complianceStatus)}`}>{formatEnum(item.complianceStatus)}</span>
        </>
      ),
      meta: <ScoreRing score={item.overallScore} size={48} strokeWidth={5} />,
    })),
    remediation: remediationQueue.map(item => ({
      id: item.id,
      title: item.name,
      subtitle: `${item.namespace} · ${item.cluster}`,
      badges: (
        <>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(item.remediationStatus)}`}>{formatEnum(item.remediationStatus)}</span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(item.complianceStatus)}`}>{formatEnum(item.complianceStatus)}</span>
        </>
      ),
      meta: item.githubPrUrl
        ? <span className="text-xs font-semibold" style={{ color: 'var(--color-primary-strong)' }}>PR</span>
        : undefined,
    })),
    coverage: coverage.map(item => ({
      id: item.key,
      title: item.cluster,
      subtitle: `${formatEnvironment(item.environment)} · ${item.workloadCount} workloads`,
      badges: (
        <>
          <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
            score {formatNumber(item.averageScore)}
          </span>
        </>
      ),
      meta: <span className="text-xs font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>{item.namespaces} namespaces</span>,
    })),
    slos: sloList.map(item => ({
      id: item.sloConfigId,
      title: item.name,
      subtitle: `${item.namespace} · ${item.cluster}`,
      badges: (
        <>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(item.datadogSloState ?? 'unknown')}`}>
            {item.datadogSloState ? item.datadogSloState.toUpperCase() : 'Não sincronizado'}
          </span>
          {item.target != null && (
            <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
              {item.target}%
            </span>
          )}
        </>
      ),
      meta: <span className="text-xs font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>{item.timeframe}</span>,
    })),
  }), [coverage, criticalWorkloads, incidents, remediationQueue, sloList])

  const filteredFocusItems = useMemo(() => {
    if (textChips.length === 0) return focusItems
    const match = (item: { title: string; subtitle: string }) =>
      textChips.some(chip => {
        const term = chip.toLowerCase()
        return item.title.toLowerCase().includes(term) || item.subtitle.toLowerCase().includes(term)
      })
    return {
      meus_servicos: focusItems.meus_servicos.filter(match),
      incidents: focusItems.incidents.filter(match),
      workloads: focusItems.workloads.filter(match),
      remediation: focusItems.remediation.filter(match),
      coverage: focusItems.coverage.filter(match),
      slos: focusItems.slos.filter(match),
    }
  }, [focusItems, textChips])

  const activeFocusItems = filteredFocusItems[focus]
  const focusPagination = usePagination(activeFocusItems, 25, focus)

  const [selectedIncidentId, setSelectedIncidentId] = useState(incidents[0]?.id ?? null)
  const [selectedWorkloadId, setSelectedWorkloadId] = useState(criticalWorkloads[0]?.id ?? null)
  const [selectedRemediationId, setSelectedRemediationId] = useState(remediationQueue[0]?.id ?? null)
  const [selectedCoverageId, setSelectedCoverageId] = useState(coverage[0]?.key ?? null)
  const [selectedSloId, setSelectedSloId] = useState<string | null>(sloList[0]?.sloConfigId ?? null)

  const selectedIncident = incidents.find(item => item.id === selectedIncidentId) ?? incidents[0] ?? null
  const selectedWorkload = criticalWorkloads.find(item => item.id === selectedWorkloadId) ?? criticalWorkloads[0] ?? null
  const selectedRemediation = remediationQueue.find(item => item.id === selectedRemediationId) ?? remediationQueue[0] ?? null
  const selectedCoverage = coverage.find(item => item.key === selectedCoverageId) ?? coverage[0] ?? null
  const selectedSlo = sloList.find(s => s.sloConfigId === selectedSloId) ?? sloList[0] ?? null

  if (isLoading) return <><Header title="Dashboard" /><PageLoading /></>
  if (error || !workloads) {
    return (
      <>
        <Header title="Dashboard" />
        <PageError message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
      </>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Dashboard" subtitle="Resumo primeiro, detalhe sob demanda." />

      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">
        <Card>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                Onboarding do produto
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-foreground)' }}>
                A dashboard mostra o essencial primeiro. Use os blocos abaixo para entender onde agir.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <InlineAccordion title="Degradações" defaultOpen>
              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                Veja riscos ativos, impacto e sinais técnicos. Ideal para responder rápido ao que está degradando agora.
              </p>
            </InlineAccordion>
            <InlineAccordion title="Services">
              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                Priorize services com pior score ou baixa conformidade. É a trilha para correção estrutural.
              </p>
            </InlineAccordion>
            <InlineAccordion title="Remediação e cobertura">
              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                Acompanhe fila de ação e veja onde ainda falta scorecard ou cobertura operacional.
              </p>
            </InlineAccordion>
          </div>
        </Card>

        <SummaryStrip
          items={[
            { label: 'Degradações ativas', value: incidents.filter(item => item.status !== 'mitigated').length, helper: 'foco operacional' },
            { label: 'Em estado crítico', value: criticalWorkloads.length, helper: 'prioridade técnica' },
            { label: 'Remediações', value: remediationQueue.length, helper: 'fila aberta' },
            { label: 'Cobertura', value: `${summary.scoredWorkloads}/${summary.totalWorkloads}`, helper: 'scorecards publicados' },
          ]}
        />

        <Card>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                Área de foco
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-foreground)' }}>
                Escolha o contexto que quer aprofundar sem sair da página.
              </p>
            </div>
            <FocusTabs
              active={focus}
              onChange={id => setFocus(id as DashboardFocus)}
              items={[
                { id: 'meus_servicos', label: 'Meus serviços', count: myServices.length },
                { id: 'incidents', label: 'Degradações', count: incidents.length },
                { id: 'workloads', label: 'Services', count: criticalWorkloads.length },
                { id: 'remediation', label: 'Remediação', count: remediationQueue.length },
                { id: 'coverage', label: 'Cobertura', count: coverage.length },
                { id: 'slos', label: 'SLOs', count: sloList.length },
              ]}
            />
          </div>
        </Card>

        <Card>
          <TagFilterInput
            value={activeChips}
            onChange={setActiveChips}
            suggestions={availableTags}
            placeholder="Buscar nome, namespace ou tag (ex: env:prod)"
          />
        </Card>

        {focus === 'meus_servicos' && (
          <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <Card>
              {filteredFocusItems.meus_servicos.length === 0 ? (
                <EmptyState
                  icon={Star}
                  title="Nenhum serviço favorito"
                  description="Marque serviços com a estrela na lista de scorecards para acompanhá-los aqui."
                />
              ) : (
                <>
                  <SelectionList
                    items={focusPagination.paginatedItems}
                    activeId={selectedMyServiceId}
                    onSelect={setSelectedMyServiceId}
                  />
                  <Pagination
                    page={focusPagination.page} pageSize={focusPagination.pageSize}
                    totalItems={focusPagination.totalItems} totalPages={focusPagination.totalPages}
                    startIndex={focusPagination.startIndex} endIndex={focusPagination.endIndex}
                    onPageChange={focusPagination.setPage} onPageSizeChange={focusPagination.changePageSize}
                  />
                </>
              )}
            </Card>
            {(() => {
              const sel = myServices.find(w => w.id === selectedMyServiceId) ?? myServices[0] ?? null
              if (!sel) return null
              return (
                <DetailPanel
                  title={sel.name}
                  subtitle={`${sel.namespace} · ${sel.cluster} · ${formatEnvironment(sel.environment)}`}
                  headerMeta={
                    <ButtonDefault
                      label="Ver scorecard"
                      visual="secondary"
                      icon={ArrowRight}
                      onClick={() => navigate(`/scorecards/${sel.id}`)}
                    />
                  }
                >
                  <div className="grid gap-3 md:grid-cols-3">
                    <Card>
                      <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Score</p>
                      <p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>
                        {sel.overallScore === null ? 'N/D' : sel.overallScore.toFixed(1)}
                      </p>
                    </Card>
                    <Card>
                      <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Conformidade</p>
                      <p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>
                        {formatEnum(sel.complianceStatus)}
                      </p>
                    </Card>
                    <Card>
                      <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Remediação</p>
                      <p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>
                        {formatEnum(sel.remediationStatus) || 'Nenhuma'}
                      </p>
                    </Card>
                  </div>
                </DetailPanel>
              )
            })()}
          </section>
        )}

        {focus === 'incidents' && (
          <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <Card>
              <SelectionList items={focusPagination.paginatedItems} activeId={selectedIncident?.id ?? null} onSelect={setSelectedIncidentId} />
              <Pagination
                page={focusPagination.page} pageSize={focusPagination.pageSize}
                totalItems={focusPagination.totalItems} totalPages={focusPagination.totalPages}
                startIndex={focusPagination.startIndex} endIndex={focusPagination.endIndex}
                onPageChange={focusPagination.setPage} onPageSizeChange={focusPagination.changePageSize}
              />
            </Card>

            {selectedIncident ? (
              <DetailPanel
                title={selectedIncident.title}
                subtitle={`${selectedIncident.service} · ${selectedIncident.namespace} · ${selectedIncident.cluster}`}
                headerMeta={<span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(selectedIncident.status)}`}>{formatEnum(selectedIncident.status)}</span>}
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Severidade</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{formatEnum(selectedIncident.severity)}</p></Card>
                  <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Owner</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{selectedIncident.owner}</p></Card>
                  <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Origem</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{formatEnum(selectedIncident.source)}</p></Card>
                </div>

                <InlineAccordion title="Resumo" defaultOpen>
                  <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>{selectedIncident.summary}</p>
                </InlineAccordion>
                <InlineAccordion title="Impacto">
                  <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>{selectedIncident.impact}</p>
                </InlineAccordion>
                <InlineAccordion title="Evidências técnicas">
                  <div className="space-y-2">
                    {selectedIncident.evidence.map(item => (
                      <div key={item} className="rounded-2xl px-3 py-2" style={{ backgroundColor: 'var(--color-muted)' }}>
                        <p className="text-sm" style={{ color: 'var(--color-foreground)' }}>{item}</p>
                      </div>
                    ))}
                  </div>
                </InlineAccordion>
                <InlineAccordion title="Ações sugeridas">
                  <div className="space-y-2">
                    {selectedIncident.actions.map(item => (
                      <p key={item} className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>{item}</p>
                    ))}
                  </div>
                </InlineAccordion>

                <div className="flex flex-wrap gap-2">
                  <ButtonDefault label="Abrir degradação" icon={ArrowRight} onClick={() => navigate('/incidents')} />
                  <ButtonDefault label="Abrir serviço" visual="secondary" onClick={() => navigate(`/scorecards/${selectedIncident.workloadId}`)} />
                </div>
              </DetailPanel>
            ) : (
              <Card><EmptyState icon={Siren} title="Sem degradações ativas" description="Nada crítico no momento." /></Card>
            )}
          </section>
        )}

        {focus === 'workloads' && (
          <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <Card>
              <SelectionList items={focusPagination.paginatedItems} activeId={selectedWorkload?.id ?? null} onSelect={setSelectedWorkloadId} />
              <Pagination
                page={focusPagination.page} pageSize={focusPagination.pageSize}
                totalItems={focusPagination.totalItems} totalPages={focusPagination.totalPages}
                startIndex={focusPagination.startIndex} endIndex={focusPagination.endIndex}
                onPageChange={focusPagination.setPage} onPageSizeChange={focusPagination.changePageSize}
              />
            </Card>
            {selectedWorkload ? (
              <DetailPanel
                title={selectedWorkload.name}
                subtitle={`${selectedWorkload.namespace} · ${selectedWorkload.cluster} · ${formatEnvironment(selectedWorkload.environment)}`}
                headerMeta={<ScoreBadge score={selectedWorkload.overallScore} />}
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Score</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{formatNumber(selectedWorkload.overallScore)}</p></Card>
                  <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Conformidade</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{formatEnum(selectedWorkload.complianceStatus)}</p></Card>
                  <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Remediação</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{formatEnum(selectedWorkload.remediationStatus)}</p></Card>
                </div>
                <ButtonDefault label="Abrir aplicação" icon={ArrowRight} onClick={() => navigate(`/scorecards/${selectedWorkload.id}`)} />
              </DetailPanel>
            ) : (
              <Card><EmptyState icon={Layers3} title="Sem workloads críticos" /></Card>
            )}
          </section>
        )}

        {focus === 'remediation' && (
          <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <Card>
              <SelectionList items={focusPagination.paginatedItems} activeId={selectedRemediation?.id ?? null} onSelect={setSelectedRemediationId} />
              <Pagination
                page={focusPagination.page} pageSize={focusPagination.pageSize}
                totalItems={focusPagination.totalItems} totalPages={focusPagination.totalPages}
                startIndex={focusPagination.startIndex} endIndex={focusPagination.endIndex}
                onPageChange={focusPagination.setPage} onPageSizeChange={focusPagination.changePageSize}
              />
            </Card>
            {selectedRemediation ? (
              <DetailPanel
                title={selectedRemediation.name}
                subtitle={`${selectedRemediation.namespace} · ${selectedRemediation.cluster}`}
                headerMeta={<span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(selectedRemediation.remediationStatus)}`}>{formatEnum(selectedRemediation.remediationStatus)}</span>}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Status</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{formatEnum(selectedRemediation.remediationStatus)}</p></Card>
                  <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>PR</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{selectedRemediation.githubPrUrl ? 'Disponível' : 'Não publicado'}</p></Card>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ButtonDefault label="Abrir fila" icon={ArrowRight} onClick={() => navigate('/recommendations')} />
                  <ButtonDefault label="Abrir aplicação" visual="secondary" onClick={() => navigate(`/scorecards/${selectedRemediation.id}`)} />
                </div>
              </DetailPanel>
            ) : (
              <Card><EmptyState icon={GitPullRequest} title="Sem itens em remediação" /></Card>
            )}
          </section>
        )}

        {focus === 'coverage' && (
          <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <Card>
              <SelectionList items={focusPagination.paginatedItems} activeId={selectedCoverage?.key ?? null} onSelect={setSelectedCoverageId} />
              <Pagination
                page={focusPagination.page} pageSize={focusPagination.pageSize}
                totalItems={focusPagination.totalItems} totalPages={focusPagination.totalPages}
                startIndex={focusPagination.startIndex} endIndex={focusPagination.endIndex}
                onPageChange={focusPagination.setPage} onPageSizeChange={focusPagination.changePageSize}
              />
            </Card>
            {selectedCoverage ? (
              <DetailPanel
                title={selectedCoverage.cluster}
                subtitle={formatEnvironment(selectedCoverage.environment)}
                headerMeta={<span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>{selectedCoverage.namespaces} namespaces</span>}
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Score de confiabilidade médio</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{formatNumber(selectedCoverage.averageScore)}</p></Card>
                  <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Conformes</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{selectedCoverage.compliantCount}</p></Card>
                  <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Não conformes</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{selectedCoverage.nonCompliantCount}</p></Card>
                </div>
                <ButtonDefault label="Abrir topologia" icon={ArrowRight} onClick={() => navigate('/topology')} />
              </DetailPanel>
            ) : (
              <Card><EmptyState icon={Target} title="Sem cobertura disponível" /></Card>
            )}
          </section>
        )}

        {focus === 'slos' && (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <Card>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>Total configurados</p>
                <p className="mt-2 family-neighbor text-[1.6rem] font-black tracking-tight" style={{ color: 'var(--color-foreground)' }}>{sloList.length}</p>
                <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>SLOs ativos</p>
              </Card>
              <Card>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>Com erro</p>
                <p className="mt-2 family-neighbor text-[1.6rem] font-black tracking-tight" style={{ color: slosWithError > 0 ? '#dc2626' : 'var(--color-foreground)' }}>{slosWithError}</p>
                <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>fora do target</p>
              </Card>
              <Card>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>Não sincronizados</p>
                <p className="mt-2 family-neighbor text-[1.6rem] font-black tracking-tight" style={{ color: slosNotSynced > 0 ? 'var(--color-primary)' : 'var(--color-foreground)' }}>{slosNotSynced}</p>
                <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>sem ID no Datadog</p>
              </Card>
            </div>

            <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <Card>
                <SelectionList items={focusPagination.paginatedItems} activeId={selectedSlo?.sloConfigId ?? null} onSelect={setSelectedSloId} />
                <Pagination
                  page={focusPagination.page} pageSize={focusPagination.pageSize}
                  totalItems={focusPagination.totalItems} totalPages={focusPagination.totalPages}
                  startIndex={focusPagination.startIndex} endIndex={focusPagination.endIndex}
                  onPageChange={focusPagination.setPage} onPageSizeChange={focusPagination.changePageSize}
                />
              </Card>
              {selectedSlo ? (
                <DetailPanel
                  title={selectedSlo.name}
                  subtitle={`${selectedSlo.namespace} · ${selectedSlo.cluster}`}
                  headerMeta={
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(selectedSlo.datadogSloState ?? 'unknown')}`}>
                      {selectedSlo.datadogSloState ? selectedSlo.datadogSloState.toUpperCase() : 'Não sincronizado'}
                    </span>
                  }
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Target</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{selectedSlo.target != null ? `${selectedSlo.target}%` : '—'}</p></Card>
                    <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Warning</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{selectedSlo.warning != null ? `${selectedSlo.warning}%` : '—'}</p></Card>
                    <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Janela</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{selectedSlo.timeframe}</p></Card>
                    <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Tipo</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{formatEnum(selectedSlo.sloType)}</p></Card>
                  </div>
                  {(selectedSlo.detectedFramework || selectedSlo.lastSyncAt) && (
                    <InlineAccordion title="Detalhes">
                      <div className="space-y-2">
                        {selectedSlo.detectedFramework && (
                          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Framework detectado: <span style={{ color: 'var(--color-foreground)' }}>{selectedSlo.detectedFramework}</span></p>
                        )}
                        {selectedSlo.lastSyncAt && (
                          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Último sync: <span style={{ color: 'var(--color-foreground)' }}>{new Date(selectedSlo.lastSyncAt).toLocaleString('pt-BR')}</span></p>
                        )}
                        {selectedSlo.datadogSloId && (
                          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>ID Datadog: <span className="font-mono text-xs" style={{ color: 'var(--color-foreground)' }}>{selectedSlo.datadogSloId}</span></p>
                        )}
                      </div>
                    </InlineAccordion>
                  )}
                  <ButtonDefault label="Abrir SLOs" icon={ArrowRight} onClick={() => navigate('/slos')} />
                </DetailPanel>
              ) : (
                <Card><EmptyState icon={Target} title="Nenhum SLO configurado" description="Configure SLOs no operador para visualizá-los aqui." /></Card>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
