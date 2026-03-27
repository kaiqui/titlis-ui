import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  GitPullRequest,
  Layers3,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageError, PageLoading } from '@/components/ui/PageState'
import { ScoreBadge } from '@/components/ui/ScoreBadge'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { useWorkloadRemediation, useWorkloadScorecard } from '@/hooks/useApi'
import { formatDate, formatEnum, severityColor, statusTone } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface ApplicationDetailProps {
  backPath?: string
  backLabel?: string
  showScorecardButton?: boolean
}

export function ApplicationDetail({
  backPath = '/applications',
  backLabel = 'Voltar para workloads',
  showScorecardButton = true,
}: ApplicationDetailProps) {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const scorecardQuery = useWorkloadScorecard(id)
  const remediationQuery = useWorkloadRemediation(id)

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
        <Header title="Workload não encontrado" subtitle="O recurso pode ainda não ter sido materializado no titlis-api." />
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
  const summaryCards: Array<{ label: string; value: number; icon: LucideIcon }> = [
    { label: 'Regras totais', value: workload.totalRules, icon: Layers3 },
    { label: 'Aprovadas', value: workload.passedRules, icon: CheckCircle2 },
    { label: 'Falhas', value: workload.failedRules, icon: XCircle },
    { label: 'Criticas', value: workload.criticalFailures, icon: ShieldAlert },
    { label: 'Erros', value: workload.errorCount, icon: AlertTriangle },
    { label: 'Warnings', value: workload.warningCount, icon: ShieldCheck },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title={workload.name}
        subtitle={`${workload.namespace} · ${workload.cluster} · ${formatEnum(workload.environment)}`}
      />

      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">
        <button
          onClick={() => navigate(backPath)}
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)', backgroundColor: 'var(--color-card)' }}
          type="button"
        >
          <ArrowLeft size={14} />
          {backLabel}
        </button>

        {showScorecardButton && (
          <button
            onClick={() => navigate(`/applications/${workload.id}/scorecard`)}
            className="ml-3 inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
            type="button"
          >
            Abrir scorecard dedicado
            <ArrowRight size={14} />
          </button>
        )}

        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="h-full overflow-hidden">
              <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-center">
                <ScoreRing score={workload.overallScore} size={124} strokeWidth={8} showLabel />
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <ScoreBadge score={workload.overallScore} />
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(workload.complianceStatus)}`}>
                      {formatEnum(workload.complianceStatus)}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(remediation?.status ?? workload.remediationStatus)}`}>
                      {formatEnum(remediation?.status ?? workload.remediationStatus)}
                    </span>
                    <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-500">
                      {failedFindings.length} itens nao conformes
                    </span>
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tight" style={{ color: 'var(--color-foreground)' }}>
                      Página da aplicação com todos os itens
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: 'var(--color-muted-foreground)' }}>
                      Esta página concentra todos os itens avaliados no scorecard e o contexto operacional do workload. A visão geral de aderência e pilares fica na página dedicada de scorecard.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="h-full">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                Snapshot do backend
              </p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>Última avaliação</p>
                  <p className="mt-1 text-base font-black" style={{ color: 'var(--color-foreground)' }}>{formatDate(workload.evaluatedAt)}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>Versão</p>
                  <p className="mt-1 text-base font-black" style={{ color: 'var(--color-foreground)' }}>{workload.version ?? 'N/D'}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>Tipo Kubernetes</p>
                  <p className="mt-1 text-base font-black" style={{ color: 'var(--color-foreground)' }}>{formatEnum(workload.kind)}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>UID rastreado</p>
                  <p className="mt-1 truncate text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>{workload.id}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {summaryCards.map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                    {label}
                  </p>
                  <p className="mt-3 text-3xl font-black tracking-tight" style={{ color: 'var(--color-foreground)' }}>
                    {value}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--color-muted)' }}>
                  <Icon size={20} style={{ color: 'var(--color-primary)' }} />
                </div>
              </div>
            </Card>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Pilares do scorecard</CardTitle>
                <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                  Score, checks aprovados e falhas por pilar.
                </p>
              </div>
            </CardHeader>

            {workload.pillarScores.length === 0 && (
              <EmptyState
                icon={Layers3}
                title="Sem pilares publicados"
                description="O score geral existe, mas a API ainda nao retornou os pilares desta avaliacao."
              />
            )}

            {workload.pillarScores.length > 0 && (
              <div className="space-y-3">
                {workload.pillarScores.map(pillar => (
                  <div key={pillar.pillar} className="rounded-2xl px-4 py-4" style={{ backgroundColor: 'var(--color-muted)' }}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{formatEnum(pillar.pillar)}</p>
                        <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                          {pillar.passedChecks} aprovados · {pillar.failedChecks} falhas
                        </p>
                      </div>
                      <span className="rounded-full bg-white/60 px-3 py-1 text-xs font-semibold dark:bg-white/10" style={{ color: 'var(--color-foreground)' }}>
                        score {pillar.score ?? 'N/D'}
                      </span>
                    </div>
                    {pillar.weightedScore !== null && (
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                        Peso aplicado: {pillar.weightedScore}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Itens do scorecard</CardTitle>
                <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                  Os checks nao conformes aparecem primeiro, seguidos pelos aprovados.
                </p>
              </div>
            </CardHeader>

            {workload.validationResults.length === 0 && (
              <EmptyState
                icon={ShieldCheck}
                title="Sem itens detalhados"
                description="A API ainda nao retornou as regras avaliadas para este workload."
              />
            )}

            {workload.validationResults.length > 0 && (
              <div className="space-y-4">
                {failedFindings.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-500">
                      Nao conformes
                    </p>
                    {failedFindings.map(finding => (
                      <div key={`${finding.ruleId}-failed`} className="rounded-3xl border px-4 py-4" style={{ borderColor: 'rgba(239, 68, 68, 0.18)', backgroundColor: 'var(--color-muted)' }}>
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
                            </div>
                            <p className="mt-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                              {finding.message ?? 'Sem mensagem detalhada para esta regra.'}
                            </p>
                          </div>
                          <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-500">
                            Falhou
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full px-3 py-1" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-muted-foreground)' }}>
                            {formatEnum(finding.pillar)}
                          </span>
                          <span className="rounded-full px-3 py-1" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-muted-foreground)' }}>
                            {formatEnum(finding.ruleType)}
                          </span>
                          {finding.weight !== null && (
                            <span className="rounded-full px-3 py-1" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-muted-foreground)' }}>
                              peso {finding.weight}
                            </span>
                          )}
                          {finding.remediable && (
                            <span className="rounded-full bg-orange-500/10 px-3 py-1 font-semibold text-orange-500">
                              Remediavel
                            </span>
                          )}
                          {finding.remediationCategory && (
                            <span className="rounded-full px-3 py-1" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-muted-foreground)' }}>
                              {formatEnum(finding.remediationCategory)}
                            </span>
                          )}
                        </div>

                        {finding.actualValue && (
                          <div className="mt-4 rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--color-card)' }}>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                              Valor observado
                            </p>
                            <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                              {finding.actualValue}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {passedFindings.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-500">
                      Aprovados
                    </p>
                    {passedFindings.map(finding => (
                      <div key={`${finding.ruleId}-passed`} className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--color-muted)' }}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{finding.ruleName}</p>
                              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-500">
                                Passou
                              </span>
                            </div>
                            <p className="mt-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                              {finding.ruleId} · {formatEnum(finding.pillar)} · {formatEnum(finding.severity)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Identidade do recurso</CardTitle>
                <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                  Contexto do workload avaliado pelo scorecard.
                </p>
              </div>
            </CardHeader>
            <div className="space-y-3">
              {[
                ['Namespace', workload.namespace],
                ['Cluster', workload.cluster],
                ['Ambiente', formatEnum(workload.environment)],
                ['Kind', formatEnum(workload.kind)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--color-muted)' }}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>{label}</p>
                  <p className="mt-2 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{value}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Estado de remediação</CardTitle>
                <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                  Persistido a partir dos eventos emitidos pelo operator.
                </p>
              </div>
            </CardHeader>

            {!remediation && (
              <EmptyState
                icon={GitPullRequest}
                title="Sem remediação registrada"
                description="A API ainda não possui evento remediation_started ou remediation_updated para este workload."
              />
            )}

            {remediation && (
              <div className="space-y-3">
                <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--color-muted)' }}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>Status</p>
                  <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusTone(remediation.status)}`}>
                    {formatEnum(remediation.status)}
                  </span>
                </div>
                <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--color-muted)' }}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>Versão</p>
                  <p className="mt-2 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{remediation.version}</p>
                </div>
                <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--color-muted)' }}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>Disparado em</p>
                  <p className="mt-2 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{formatDate(remediation.triggeredAt)}</p>
                </div>
                {remediation.githubPrUrl && (
                  <a
                    href={remediation.githubPrUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
                  >
                    Abrir PR #{remediation.githubPrNumber ?? 'N/D'}
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            )}
          </Card>
        </section>
      </div>
    </div>
  )
}
