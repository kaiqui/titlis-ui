import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, ArrowLeft, ArrowRight, Bot, CheckCircle2, ExternalLink, GitPullRequest, Layers3, ShieldAlert, ShieldCheck, Sparkles, XCircle } from 'lucide-react'
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
import { AiExplainDrawer } from '@/components/ai/AiExplainDrawer'
import { useWorkloadRemediation, useWorkloadScorecard } from '@/hooks/useApi'
import { useAuth } from '@/contexts/useAuth'
import { formatDate, formatEnum, severityColor, statusTone } from '@/lib/utils'
import type { Finding } from '@/types'

interface ApplicationDetailProps {
  backPath?: string
  backLabel?: string
  showScorecardButton?: boolean
}

type DetailFocus = 'overview' | 'findings' | 'pillars' | 'remediation'
type EvaluationMetric = { label: string; value: string | number; icon: LucideIcon }

export function ApplicationDetail({
  backPath = '/applications',
  backLabel = 'Voltar para workloads',
  showScorecardButton = true,
}: ApplicationDetailProps) {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const scorecardQuery = useWorkloadScorecard(id)
  const remediationQuery = useWorkloadRemediation(id)
  const [focus, setFocus] = useState<DetailFocus>('overview')
  const [explainFinding, setExplainFinding] = useState<Finding | null>(null)

  if (scorecardQuery.isLoading) return <><Header title="Detalhe do workload" /><PageLoading /></>
  if (scorecardQuery.error) {
    return (
      <>
        <Header title="Detalhe do workload" />
        <PageError message={scorecardQuery.error instanceof Error ? scorecardQuery.error.message : undefined} onRetry={() => void scorecardQuery.refetch()} />
      </>
    )
  }

  if (!scorecardQuery.data) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header title="Service não encontrado" subtitle="O recurso pode ainda não ter sido materializado no titlis-api." />
        <EmptyState
          icon={Layers3}
          title="Nenhum scorecard encontrado"
          description="Verifique se o operator já enviou o evento scorecard_evaluated para este workload."
        />
      </div>
    )
  }

  const workload = scorecardQuery.data
  const remediation = remediationQuery.data
  const failedFindings = workload.validationResults.filter(item => !item.passed)
  const passedFindings = workload.validationResults.filter(item => item.passed)
  const remediableFindings = failedFindings.filter(f => f.remediable)
  const canUseAi = user?.canRemediate ?? false

  const evaluationMetrics: EvaluationMetric[] = [
    { label: 'Regras totais', value: workload.totalRules, icon: Layers3 },
    { label: 'Aprovadas', value: workload.passedRules, icon: CheckCircle2 },
    { label: 'Falhas', value: workload.failedRules, icon: XCircle },
    { label: 'Críticas', value: workload.criticalFailures, icon: ShieldAlert },
    { label: 'Erros', value: workload.errorCount, icon: AlertTriangle },
    { label: 'Warnings', value: workload.warningCount, icon: ShieldCheck },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <Header title={workload.name} subtitle={`${workload.namespace} · ${workload.cluster} · ${formatEnum(workload.environment)}`} />

      {explainFinding && (
        <AiExplainDrawer
          finding={explainFinding}
          workload={workload}
          onClose={() => setExplainFinding(null)}
        />
      )}

      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">
        <div className="flex flex-wrap gap-3">
          <ButtonDefault label={backLabel} visual="secondary" icon={ArrowLeft} onClick={() => navigate(backPath)} />
          {showScorecardButton && (
            <ButtonDefault
              label="Abrir scorecard dedicado"
              icon={ArrowRight}
              onClick={() => navigate(`/applications/${workload.id}/scorecard`)}
            />
          )}
          {canUseAi && remediableFindings.length > 0 && (
            <ButtonDefault
              label="Corrigir com ARIA"
              icon={Bot}
              onClick={() => navigate('/assistant', {
                state: {
                  workloadId: workload.id,
                  workloadName: workload.name,
                  namespace: workload.namespace,
                  findingIds: remediableFindings.map(f => f.ruleId),
                },
              })}
            />
          )}
        </div>

        <SummaryStrip
          items={[
            { label: 'Score', value: workload.overallScore === null ? 'N/D' : workload.overallScore.toFixed(1), helper: 'aderência atual' },
            { label: 'Falhas', value: failedFindings.length, helper: 'itens não conformes' },
            { label: 'Críticas', value: workload.criticalFailures, helper: 'prioridade máxima' },
            { label: 'Remediação', value: formatEnum(remediation?.status ?? workload.remediationStatus), helper: 'estado atual' },
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
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(remediation?.status ?? workload.remediationStatus)}`}>
                    {formatEnum(remediation?.status ?? workload.remediationStatus)}
                  </span>
                </div>
                <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                  Visão executiva primeiro. O detalhe técnico abre por área de foco.
                </p>
              </div>
            </div>

            <FocusTabs
              active={focus}
              onChange={id => setFocus(id as DetailFocus)}
              items={[
                { id: 'overview', label: 'Resumo' },
                { id: 'findings', label: 'Itens', count: workload.validationResults.length },
                { id: 'pillars', label: 'Pilares', count: workload.pillarScores.length },
                { id: 'remediation', label: 'Remediação' },
              ]}
            />
          </div>
        </Card>

        {focus === 'overview' && (
          <DetailPanel
            title="Resumo do workload"
            subtitle="Contexto operacional e leitura rápida."
            headerMeta={<span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>v{workload.version ?? 'N/D'}</span>}
          >
            <div className="grid gap-3 md:grid-cols-4">
              {[
                ['Última avaliação', formatDate(workload.evaluatedAt)],
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
              <div className="grid gap-3 md:grid-cols-3">
                {evaluationMetrics.map(({ label, value, icon: Icon }) => (
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

        {focus === 'findings' && (
          <DetailPanel title="Itens do scorecard" subtitle="Abra apenas o grupo que quiser investigar.">
            {workload.validationResults.length === 0 && (
              <EmptyState icon={ShieldCheck} title="Sem itens detalhados" description="A API ainda não retornou as regras avaliadas para este workload." />
            )}

            {workload.validationResults.length > 0 && (
              <>
                <InlineAccordion title={`Não conformes (${failedFindings.length})`} defaultOpen>
                  <div className="space-y-3">
                    {failedFindings.length === 0 && <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Nenhuma falha neste workload.</p>}
                    {failedFindings.map(finding => (
                      <div key={`${finding.ruleId}-failed`} className="rounded-3xl border px-4 py-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-muted)' }}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{finding.ruleName}</p>
                              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${severityColor(finding.severity)}`}>
                                {formatEnum(finding.severity)}
                              </span>
                              <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-muted-foreground)' }}>
                                {finding.ruleId}
                              </span>
                              {finding.remediationPending && (
                                <a
                                  href={finding.remediationPrUrl ?? undefined}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold hover:opacity-80"
                                  style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}
                                >
                                  <GitPullRequest size={10} />
                                  PR em andamento
                                </a>
                              )}
                            </div>
                            <p className="mt-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                              {finding.message ?? 'Sem mensagem detalhada para esta regra.'}
                            </p>
                          </div>
                          <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#dc2626' }}>
                            Falhou
                          </span>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-full px-3 py-1" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-muted-foreground)' }}>{formatEnum(finding.pillar)}</span>
                          <span className="rounded-full px-3 py-1" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-muted-foreground)' }}>{formatEnum(finding.ruleType)}</span>
                          {finding.weight !== null && <span className="rounded-full px-3 py-1" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-muted-foreground)' }}>peso {finding.weight}</span>}
                          {finding.remediable && <span className="rounded-full px-3 py-1 font-semibold" style={{ backgroundColor: 'rgba(249,115,22,0.1)', color: '#ea580c' }}>Remediável</span>}
                          {canUseAi && (
                            <button
                              onClick={() => setExplainFinding(finding)}
                              className="flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold transition-opacity hover:opacity-70"
                              style={{ backgroundColor: 'rgba(139,92,246,0.1)', color: '#7c3aed' }}
                            >
                              <Sparkles size={10} />
                              Explicar com ARIA
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </InlineAccordion>

                <InlineAccordion title={`Aprovados (${passedFindings.length})`}>
                  <div className="space-y-2">
                    {passedFindings.length === 0 && <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Nenhum item aprovado retornado.</p>}
                    {passedFindings.map(finding => (
                      <div key={`${finding.ruleId}-passed`} className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--color-muted)' }}>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{finding.ruleName}</p>
                          <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#059669' }}>Passou</span>
                        </div>
                        <p className="mt-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                          {finding.ruleId} · {formatEnum(finding.pillar)} · {formatEnum(finding.severity)}
                        </p>
                      </div>
                    ))}
                  </div>
                </InlineAccordion>
              </>
            )}
          </DetailPanel>
        )}

        {focus === 'pillars' && (
          <DetailPanel title="Pilares do scorecard" subtitle="Expanda só o pilar que precisa analisar.">
            {workload.pillarScores.length === 0 ? (
              <EmptyState icon={Layers3} title="Sem pilares publicados" description="O score geral existe, mas a API ainda não retornou os pilares desta avaliação." />
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

        {focus === 'remediation' && (
          <DetailPanel title="Estado de remediação" subtitle="Abra o detalhe só se houver ação registrada.">
            {workload.activeRemediation && (
              <div className="mb-4 rounded-2xl border px-4 py-4" style={{ borderColor: 'rgba(59,130,246,0.3)', backgroundColor: 'rgba(59,130,246,0.06)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <GitPullRequest size={14} style={{ color: '#3b82f6' }} />
                  <p className="text-sm font-semibold" style={{ color: '#3b82f6' }}>PR em andamento</p>
                </div>
                <p className="text-xs mb-3" style={{ color: 'var(--color-muted-foreground)' }}>
                  Findings cobertos: {workload.activeRemediation.pendingRuleIds.join(', ') || 'todos'}
                </p>
                {workload.activeRemediation.prUrl && (
                  <a href={workload.activeRemediation.prUrl} target="_blank" rel="noreferrer">
                    <ButtonDefault label={`Ver PR #${workload.activeRemediation.prNumber ?? 'N/D'}`} icon={ExternalLink} />
                  </a>
                )}
              </div>
            )}

            {!remediation ? (
              <EmptyState
                icon={GitPullRequest}
                title="Sem remediação registrada"
                description="A API ainda não possui evento remediation_started ou remediation_updated para este workload."
              />
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Status</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{formatEnum(remediation.status)}</p></Card>
                  <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Versão</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{remediation.version}</p></Card>
                  <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Disparado em</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{formatDate(remediation.triggeredAt)}</p></Card>
                </div>
                {remediation.githubPrUrl && (
                  <a href={remediation.githubPrUrl} target="_blank" rel="noreferrer">
                    <ButtonDefault label={`Abrir PR #${remediation.githubPrNumber ?? 'N/D'}`} icon={ExternalLink} />
                  </a>
                )}
              </>
            )}
          </DetailPanel>
        )}
      </div>
    </div>
  )
}
