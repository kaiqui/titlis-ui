import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { Activity, ArrowLeft, ArrowRight, CheckCircle2, Layers3, Target, XCircle } from 'lucide-react'
import { ButtonDefault } from '@/components/jeitto/ButtonDefault'
import { Card } from '@/components/jeitto/Card'
import { EmptyState } from '@/components/jeitto/EmptyState'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { ScoreBadge } from '@/components/jeitto/ScoreBadge'
import { ScoreRing } from '@/components/jeitto/ScoreRing'
import { Header } from '@/components/layout/Header'
import { DetailPanel } from '@/components/sre/DetailPanel'
import { FocusTabs } from '@/components/sre/FocusTabs'
import { InlineAccordion } from '@/components/sre/InlineAccordion'
import { SummaryStrip } from '@/components/sre/SummaryStrip'
import { useWorkloadScorecard } from '@/hooks/useApi'
import { formatDate, formatEnum, statusTone } from '@/lib/utils'

type ScorecardFocus = 'overview' | 'pillars' | 'executive'
type OverviewMetric = { label: string; value: string | number; icon: LucideIcon }

export function ScorecardDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const scorecardQuery = useWorkloadScorecard(id)
  const [focus, setFocus] = useState<ScorecardFocus>('overview')

  if (scorecardQuery.isLoading) return <><Header title="Scorecard da aplicação" /><PageLoading /></>
  if (scorecardQuery.error) {
    return (
      <>
        <Header title="Scorecard da aplicação" />
        <PageError message={scorecardQuery.error instanceof Error ? scorecardQuery.error.message : undefined} onRetry={() => void scorecardQuery.refetch()} />
      </>
    )
  }

  if (!scorecardQuery.data) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header title="Scorecard não encontrado" subtitle="A aplicação pode ainda não ter sido avaliada pelo operator." />
        <EmptyState
          icon={Layers3}
          title="Sem scorecard disponível"
          description="Verifique se o evento scorecard_evaluated já chegou ao titlis-api."
        />
      </div>
    )
  }

  const workload = scorecardQuery.data
  const adherence = workload.totalRules > 0 ? Math.round((workload.passedRules / workload.totalRules) * 100) : 0
  const overviewMetrics: OverviewMetric[] = [
    { label: 'Aderência geral', value: `${adherence}%`, icon: Target },
    { label: 'Regras totais', value: workload.totalRules, icon: Layers3 },
    { label: 'Aprovadas', value: workload.passedRules, icon: CheckCircle2 },
    { label: 'Falhas', value: workload.failedRules, icon: XCircle },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <Header title={`Scorecard · ${workload.name}`} subtitle={`${workload.namespace} · ${workload.cluster} · ${formatEnum(workload.environment)}`} />

      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">
        <div className="flex flex-wrap gap-3">
          <ButtonDefault label="Voltar para workloads" visual="secondary" icon={ArrowLeft} onClick={() => navigate('/applications')} />
          <ButtonDefault label="Abrir aplicação" icon={ArrowRight} onClick={() => navigate(`/applications/${workload.id}`)} />
        </div>

        <SummaryStrip
          items={[
            { label: 'Aderência', value: `${adherence}%`, helper: 'regras aprovadas' },
            { label: 'Score', value: workload.overallScore === null ? 'N/D' : workload.overallScore.toFixed(1), helper: 'score geral' },
            { label: 'Falhas', value: workload.failedRules, helper: 'regras com falha' },
            { label: 'Pilares', value: workload.pillarScores.length, helper: 'dimensões avaliadas' },
          ]}
        />

        <Card>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
              <ScoreRing score={workload.overallScore} size={88} strokeWidth={7} showLabel />
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <ScoreBadge score={workload.overallScore} />
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(workload.complianceStatus)}`}>
                    {formatEnum(workload.complianceStatus)}
                  </span>
                  <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                    versão {workload.version ?? 'N/D'}
                  </span>
                </div>
                <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                  Use o foco abaixo para abrir só a camada que quiser analisar.
                </p>
              </div>
            </div>

            <FocusTabs
              active={focus}
              onChange={id => setFocus(id as ScorecardFocus)}
              items={[
                { id: 'overview', label: 'Resumo' },
                { id: 'pillars', label: 'Pilares', count: workload.pillarScores.length },
                { id: 'executive', label: 'Executivo' },
              ]}
            />
          </div>
        </Card>

        {focus === 'overview' && (
          <DetailPanel title="Resumo do scorecard" subtitle="Contexto e leitura rápida da última avaliação.">
            <div className="grid gap-3 md:grid-cols-4">
              {[
                ['Avaliado em', formatDate(workload.evaluatedAt)],
                ['Kind', formatEnum(workload.kind)],
                ['Namespace', workload.namespace],
                ['Cluster', workload.cluster],
              ].map(([label, value]) => (
                <Card key={label}>
                  <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{label}</p>
                  <p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{value}</p>
                </Card>
              ))}
            </div>

            <InlineAccordion title="Contagem da avaliação" defaultOpen>
              <div className="grid gap-3 md:grid-cols-4">
                {overviewMetrics.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--color-muted)' }}>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{label}</p>
                      <p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{value}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--color-card)' }}>
                      <Icon size={16} style={{ color: 'var(--color-primary)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </InlineAccordion>
          </DetailPanel>
        )}

        {focus === 'pillars' && (
          <DetailPanel title="Pilares" subtitle="Abra apenas o pilar necessário.">
            {workload.pillarScores.length === 0 ? (
              <EmptyState icon={Layers3} title="Sem pilares publicados" description="A API ainda não retornou os pilares desta avaliação." />
            ) : (
              <div className="space-y-3">
                {workload.pillarScores.map(pillar => (
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
          <DetailPanel title="Leitura executiva" subtitle="Resumo curto para decisão rápida.">
            <div className="grid gap-3 md:grid-cols-4">
              {[
                ['Score geral', workload.overallScore === null ? 'N/D' : workload.overallScore.toFixed(1)],
                ['Aderência', `${adherence}%`],
                ['Falhas críticas', String(workload.criticalFailures)],
                ['Itens detalhados', String(workload.validationResults.length)],
              ].map(([label, value]) => (
                <Card key={label}>
                  <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{label}</p>
                  <p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{value}</p>
                </Card>
              ))}
            </div>

            <InlineAccordion title="Ação recomendada" defaultOpen>
              <div className="flex items-start gap-3 rounded-3xl border px-4 py-4" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-primary)' }}>
                  <Activity size={18} />
                </div>
                <div>
                  <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>
                    Abrir página da aplicação
                  </p>
                  <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                    Use a página da aplicação para ver as falhas uma a uma e acompanhar a remediação.
                  </p>
                  <ButtonDefault label="Ir para a aplicação" icon={ArrowRight} className="mt-3" onClick={() => navigate(`/applications/${workload.id}`)} />
                </div>
              </div>
            </InlineAccordion>
          </DetailPanel>
        )}
      </div>
    </div>
  )
}
