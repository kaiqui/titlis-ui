import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Layers3,
  Target,
  XCircle,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageError, PageLoading } from '@/components/ui/PageState'
import { ScoreBadge } from '@/components/ui/ScoreBadge'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { useWorkloadScorecard } from '@/hooks/useApi'
import { formatDate, formatEnum, statusTone } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

export function ScorecardDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const scorecardQuery = useWorkloadScorecard(id)

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
  const overviewCards: Array<{ label: string; value: string | number; icon: LucideIcon }> = [
    { label: 'Aderência geral', value: `${adherence}%`, icon: Target },
    { label: 'Regras totais', value: workload.totalRules, icon: Layers3 },
    { label: 'Aprovadas', value: workload.passedRules, icon: CheckCircle2 },
    { label: 'Falhas', value: workload.failedRules, icon: XCircle },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title={`Scorecard · ${workload.name}`}
        subtitle={`${workload.namespace} · ${workload.cluster} · ${formatEnum(workload.environment)}`}
      />

      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/applications')}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)', backgroundColor: 'var(--color-card)' }}
            type="button"
          >
            <ArrowLeft size={14} />
            Voltar para workloads
          </button>

          <button
            onClick={() => navigate(`/applications/${workload.id}`)}
            className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
            type="button"
          >
            Abrir página da aplicação
            <ArrowRight size={14} />
          </button>
        </div>

        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="h-full overflow-hidden">
              <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-center">
                <ScoreRing score={workload.overallScore} size={132} strokeWidth={9} showLabel />
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <ScoreBadge score={workload.overallScore} />
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(workload.complianceStatus)}`}>
                      {formatEnum(workload.complianceStatus)}
                    </span>
                    <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-500">
                      versão {workload.version ?? 'N/D'}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tight" style={{ color: 'var(--color-foreground)' }}>
                      Aderência geral e pilares do scorecard
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: 'var(--color-muted-foreground)' }}>
                      Esta página concentra a visão geral do scorecard: aderência, score consolidado, distribuição por pilar e resumo da avaliação atual.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="h-full">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                Contexto da última avaliação
              </p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>Avaliado em</p>
                  <p className="mt-1 text-base font-black" style={{ color: 'var(--color-foreground)' }}>{formatDate(workload.evaluatedAt)}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>Tipo Kubernetes</p>
                  <p className="mt-1 text-base font-black" style={{ color: 'var(--color-foreground)' }}>{formatEnum(workload.kind)}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>Namespace</p>
                  <p className="mt-1 text-base font-black" style={{ color: 'var(--color-foreground)' }}>{workload.namespace}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>Cluster</p>
                  <p className="mt-1 text-base font-black" style={{ color: 'var(--color-foreground)' }}>{workload.cluster}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {overviewCards.map(({ label, value, icon: Icon }) => (
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

        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Pilares</CardTitle>
                <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                  Como o score geral se distribui entre os pilares avaliados.
                </p>
              </div>
            </CardHeader>

            {workload.pillarScores.length === 0 && (
              <EmptyState
                icon={Layers3}
                title="Sem pilares publicados"
                description="A API ainda não retornou os pilares desta avaliação."
              />
            )}

            {workload.pillarScores.length > 0 && (
              <div className="space-y-3">
                {workload.pillarScores.map(pillar => (
                  <div key={pillar.pillar} className="rounded-3xl border px-4 py-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-muted)' }}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-black" style={{ color: 'var(--color-foreground)' }}>
                          {formatEnum(pillar.pillar)}
                        </p>
                        <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                          {pillar.passedChecks} checks aprovados · {pillar.failedChecks} falhas
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black" style={{ color: 'var(--color-foreground)' }}>
                          {pillar.score ?? 'N/D'}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                          weighted {pillar.weightedScore ?? 'N/D'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--color-card)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pillar.score ?? 0}%`, backgroundColor: 'var(--color-primary)' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Leitura executiva</CardTitle>
                <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                  Resumo rápido para entender a posição geral do workload.
                </p>
              </div>
            </CardHeader>

            <div className="space-y-3">
              {[
                ['Score geral', workload.overallScore === null ? 'N/D' : workload.overallScore.toFixed(1)],
                ['Aderência', `${adherence}%`],
                ['Falhas críticas', String(workload.criticalFailures)],
                ['Itens detalhados', String(workload.validationResults.length)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--color-muted)' }}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                    {label}
                  </p>
                  <p className="mt-2 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-3xl border px-4 py-4" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
                  <Activity size={18} />
                </div>
                <div>
                  <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>
                    Página da aplicação
                  </p>
                  <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                    Use a página da aplicação para abrir todos os itens do scorecard, ver as falhas uma a uma e acompanhar remediação.
                  </p>
                  <button
                    onClick={() => navigate(`/applications/${workload.id}`)}
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
                    type="button"
                  >
                    Ir para a aplicação
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </div>
  )
}
