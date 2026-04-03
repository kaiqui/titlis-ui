import { useMemo, useState } from 'react'
import { ArrowRight, GitPullRequest, Info, Layers3, Siren, Target } from 'lucide-react'
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
import { useDashboardWorkloads } from '@/hooks/useApi'
import { buildClusterSummaries, buildCriticalWorkloads, buildPlatformSummary, buildRemediationQueue } from '@/lib/insights'
import { buildIncidents } from '@/lib/incidents'
import { formatEnum, formatNumber, statusTone } from '@/lib/utils'

type DashboardFocus = 'incidents' | 'workloads' | 'remediation' | 'coverage'

export function Dashboard() {
  const navigate = useNavigate()
  const [focus, setFocus] = useState<DashboardFocus>('incidents')
  const { data: workloads, isLoading, error, refetch } = useDashboardWorkloads()
  const workloadList = workloads ?? []
  const summary = buildPlatformSummary(workloadList)
  const incidents = buildIncidents(workloadList)
  const criticalWorkloads = buildCriticalWorkloads(workloadList)
  const remediationQueue = buildRemediationQueue(workloadList)
  const coverage = buildClusterSummaries(workloadList)

  const focusItems = useMemo(() => ({
    incidents: incidents.map(item => ({
      id: item.id,
      title: item.title,
      subtitle: `${item.namespace} · ${item.cluster} · ${formatEnum(item.environment)}`,
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
      subtitle: `${formatEnum(item.environment)} · ${item.workloadCount} workloads`,
      badges: (
        <>
          <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
            score {formatNumber(item.averageScore)}
          </span>
        </>
      ),
      meta: <span className="text-xs font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>{item.namespaces} namespaces</span>,
    })),
  }), [coverage, criticalWorkloads, incidents, remediationQueue])

  const [selectedIncidentId, setSelectedIncidentId] = useState(incidents[0]?.id ?? null)
  const [selectedWorkloadId, setSelectedWorkloadId] = useState(criticalWorkloads[0]?.id ?? null)
  const [selectedRemediationId, setSelectedRemediationId] = useState(remediationQueue[0]?.id ?? null)
  const [selectedCoverageId, setSelectedCoverageId] = useState(coverage[0]?.key ?? null)

  const selectedIncident = incidents.find(item => item.id === selectedIncidentId) ?? incidents[0] ?? null
  const selectedWorkload = criticalWorkloads.find(item => item.id === selectedWorkloadId) ?? criticalWorkloads[0] ?? null
  const selectedRemediation = remediationQueue.find(item => item.id === selectedRemediationId) ?? remediationQueue[0] ?? null
  const selectedCoverage = coverage.find(item => item.key === selectedCoverageId) ?? coverage[0] ?? null

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
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
              <Info size={14} />
              menos texto, mais foco
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <InlineAccordion title="Incidentes" defaultOpen>
              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                Veja riscos ativos, impacto e sinais técnicos. Ideal para responder rápido ao que está degradando agora.
              </p>
            </InlineAccordion>
            <InlineAccordion title="Workloads">
              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                Priorize workloads com pior score ou baixa conformidade. É a trilha para correção estrutural.
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
            { label: 'Incidentes ativos', value: incidents.filter(item => item.status !== 'mitigated').length, helper: 'foco operacional' },
            { label: 'Workloads críticos', value: criticalWorkloads.length, helper: 'prioridade técnica' },
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
                { id: 'incidents', label: 'Incidentes', count: incidents.length },
                { id: 'workloads', label: 'Workloads', count: criticalWorkloads.length },
                { id: 'remediation', label: 'Remediação', count: remediationQueue.length },
                { id: 'coverage', label: 'Cobertura', count: coverage.length },
              ]}
            />
          </div>
        </Card>

        {focus === 'incidents' && (
          <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <Card>
              <SelectionList items={focusItems.incidents} activeId={selectedIncident?.id ?? null} onSelect={setSelectedIncidentId} />
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
                  <ButtonDefault label="Abrir incidente" icon={ArrowRight} onClick={() => navigate('/incidents')} />
                  <ButtonDefault label="Abrir serviço" visual="secondary" onClick={() => navigate(`/applications/${selectedIncident.workloadId}`)} />
                </div>
              </DetailPanel>
            ) : (
              <Card><EmptyState icon={Siren} title="Sem incidentes ativos" description="Nada crítico no momento." /></Card>
            )}
          </section>
        )}

        {focus === 'workloads' && (
          <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <Card>
              <SelectionList items={focusItems.workloads} activeId={selectedWorkload?.id ?? null} onSelect={setSelectedWorkloadId} />
            </Card>
            {selectedWorkload ? (
              <DetailPanel
                title={selectedWorkload.name}
                subtitle={`${selectedWorkload.namespace} · ${selectedWorkload.cluster} · ${formatEnum(selectedWorkload.environment)}`}
                headerMeta={<ScoreBadge score={selectedWorkload.overallScore} />}
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Score</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{formatNumber(selectedWorkload.overallScore)}</p></Card>
                  <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Conformidade</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{formatEnum(selectedWorkload.complianceStatus)}</p></Card>
                  <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Remediação</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{formatEnum(selectedWorkload.remediationStatus)}</p></Card>
                </div>
                <ButtonDefault label="Abrir aplicação" icon={ArrowRight} onClick={() => navigate(`/applications/${selectedWorkload.id}`)} />
              </DetailPanel>
            ) : (
              <Card><EmptyState icon={Layers3} title="Sem workloads críticos" /></Card>
            )}
          </section>
        )}

        {focus === 'remediation' && (
          <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <Card>
              <SelectionList items={focusItems.remediation} activeId={selectedRemediation?.id ?? null} onSelect={setSelectedRemediationId} />
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
                  <ButtonDefault label="Abrir aplicação" visual="secondary" onClick={() => navigate(`/applications/${selectedRemediation.id}`)} />
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
              <SelectionList items={focusItems.coverage} activeId={selectedCoverage?.key ?? null} onSelect={setSelectedCoverageId} />
            </Card>
            {selectedCoverage ? (
              <DetailPanel
                title={selectedCoverage.cluster}
                subtitle={formatEnum(selectedCoverage.environment)}
                headerMeta={<span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>{selectedCoverage.namespaces} namespaces</span>}
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Score médio</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{formatNumber(selectedCoverage.averageScore)}</p></Card>
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
      </div>
    </div>
  )
}
