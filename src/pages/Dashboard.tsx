import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  ArrowRight,
  GitPullRequest,
  Layers3,
  ShieldAlert,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { MetricCard } from '@/components/ui/MetricCard'
import { PageError, PageLoading } from '@/components/ui/PageState'
import { ScoreBadge } from '@/components/ui/ScoreBadge'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { useDashboardWorkloads } from '@/hooks/useApi'
import {
  buildClusterSummaries,
  buildCriticalWorkloads,
  buildNamespaceSummaries,
  buildPlatformSummary,
  buildRemediationQueue,
  buildScoreBuckets,
} from '@/lib/insights'
import { formatEnum, formatNumber } from '@/lib/utils'

export function Dashboard() {
  const navigate = useNavigate()
  const { data: workloads, isLoading, error, refetch } = useDashboardWorkloads()

  if (isLoading) return <><Header title="Panorama da Operação" /><PageLoading /></>
  if (error || !workloads) {
    return (
      <>
        <Header title="Panorama da Operação" />
        <PageError message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
      </>
    )
  }

  const summary = buildPlatformSummary(workloads)
  const buckets = buildScoreBuckets(workloads)
  const clusters = buildClusterSummaries(workloads).slice(0, 5)
  const namespaces = buildNamespaceSummaries(workloads).slice(0, 5)
  const criticalWorkloads = buildCriticalWorkloads(workloads).slice(0, 5)
  const remediationQueue = buildRemediationQueue(workloads).slice(0, 5)
  const nonCompliantWorkloads = workloads
    .filter(workload => workload.complianceStatus === 'NON_COMPLIANT')
    .sort((left, right) => (left.overallScore ?? -1) - (right.overallScore ?? -1))
    .slice(0, 5)

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title="Panorama da Operação"
        subtitle="Visão executiva da saúde dos workloads, da fila de remediação e da cobertura que o titlis-api consegue sustentar hoje."
      />

      <div className="flex-1 space-y-6 px-4 py-6 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[36px] border p-6 lg:p-8"
          style={{
            borderColor: 'var(--hero-border)',
            background: 'var(--hero-background)',
          }}
        >
          <div className="grid gap-6 lg:grid-cols-[1.45fr_0.85fr] lg:items-end">
            <div className="space-y-4">
              <span
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]"
                style={{ backgroundColor: 'rgba(255,255,255,0.72)', color: 'var(--color-primary-strong)' }}
              >
                Fluxo profissional
              </span>
              <div className="max-w-3xl space-y-3">
                <h2 className="text-3xl font-black tracking-tight lg:text-5xl" style={{ color: 'var(--color-foreground)' }}>
                  Nao conformidade precisa aparecer primeiro quando ela impacta a operacao.
                </h2>
                <p className="max-w-2xl text-sm leading-6 lg:text-base" style={{ color: 'var(--color-muted-foreground)' }}>
                  O panorama agora destaca o que esta fora do esperado logo na abertura, sem esconder workloads nao conformes atras de estados secundarios.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate('/applications')}
                  className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
                  type="button"
                >
                  Ver workloads
                    <ArrowRight size={15} />
                  </button>
                <div className="inline-flex items-center gap-3 rounded-full border border-red-500/15 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400">
                  <ShieldAlert size={16} />
                  {summary.nonCompliantCount} workloads nao conformes
                </div>
                <button
                  onClick={() => navigate('/recommendations')}
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)', backgroundColor: 'var(--color-card)' }}
                  type="button"
                >
                  Abrir fila de remediação
                </button>
              </div>
            </div>

            <Card>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--color-muted-foreground)' }}>
                Cobertura atual
              </p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-3xl font-black" style={{ color: 'var(--color-foreground)' }}>
                    {summary.totalWorkloads}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>workloads ativos</p>
                </div>
                <div>
                  <p className="text-3xl font-black" style={{ color: 'var(--color-foreground)' }}>
                    {summary.clusters}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>clusters monitorados</p>
                </div>
                <div>
                  <p className="text-3xl font-black" style={{ color: 'var(--color-foreground)' }}>
                    {summary.nonCompliantCount}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>nao conformes agora</p>
                </div>
                <div>
                  <p className="text-3xl font-black" style={{ color: 'var(--color-foreground)' }}>
                    {summary.scoredWorkloads}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>com scorecard publicado</p>
                </div>
              </div>
            </Card>
          </div>
        </motion.section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Score médio"
            value={formatNumber(summary.averageScore)}
            sub={`${summary.scoredWorkloads} workloads com score`}
            icon={Activity}
            iconColor="text-orange-500"
            trend={summary.averageScore >= 85 ? 'up' : 'stable'}
            trendValue={summary.averageScore >= 85 ? 'maturidade sólida' : 'há espaço para evolução'}
          />
          <MetricCard
            label="Não conformes"
            value={summary.nonCompliantCount}
            sub="workloads abaixo da faixa esperada"
            icon={ShieldAlert}
            iconColor="text-red-500"
            trend={summary.nonCompliantCount > 0 ? 'down' : 'stable'}
            trendValue={summary.nonCompliantCount > 0 ? 'pedem atenção imediata' : 'ambiente sob controle'}
            delay={0.05}
          />
          <MetricCard
            label="Fila de remediação"
            value={summary.remediatedCount}
            sub="itens com status persistido"
            icon={GitPullRequest}
            iconColor="text-amber-500"
            trend={summary.remediatedCount > 0 ? 'up' : 'stable'}
            trendValue={summary.remediatedCount > 0 ? 'acompanhe PRs e estados' : 'nenhuma ação em aberto'}
            delay={0.1}
          />
          <MetricCard
            label="Namespaces"
            value={summary.namespaces}
            sub="escopo operacional monitorado"
            icon={Layers3}
            iconColor="text-slate-500"
            trend="stable"
            trendValue="cobertura distribuída"
            delay={0.15}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Distribuição do score operacional</CardTitle>
                <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                  Consolidação dos scorecards que a API já expõe hoje.
                </p>
              </div>
            </CardHeader>

            <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={buckets} dataKey="value" nameKey="label" innerRadius={62} outerRadius={96} paddingAngle={3}>
                      {buckets.map(bucket => (
                        <Cell key={bucket.label} fill={bucket.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                {buckets.map(bucket => (
                  <div key={bucket.label} className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--color-muted)' }}>
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: bucket.color }} />
                      <span className="font-semibold" style={{ color: 'var(--color-foreground)' }}>{bucket.label}</span>
                    </div>
                    <span className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{bucket.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Clusters em melhor forma</CardTitle>
                <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                  Ranking por score médio e cobertura.
                </p>
              </div>
            </CardHeader>

            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clusters}>
                  <XAxis dataKey="cluster" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="averageScore" radius={[10, 10, 0, 0]} fill="#f45d2d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Não conformes agora</CardTitle>
                <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                  Lista priorizada para o que ja esta explicitamente fora de conformidade.
                </p>
              </div>
            </CardHeader>

            <div className="space-y-3">
              {(nonCompliantWorkloads.length > 0 ? nonCompliantWorkloads : criticalWorkloads).map(workload => (
                <button
                  key={workload.id}
                  onClick={() => navigate(`/applications/${workload.id}`)}
                  className="flex w-full items-center gap-4 rounded-[24px] border px-4 py-4 text-left transition-transform hover:-translate-y-0.5"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-muted)' }}
                  type="button"
                >
                  <ScoreRing score={workload.overallScore} size={58} strokeWidth={5} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{workload.name}</p>
                      <ScoreBadge score={workload.overallScore} size="sm" />
                    </div>
                    <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                      {workload.namespace} · {workload.cluster} · {formatEnum(workload.environment)}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${workload.complianceStatus === 'COMPLIANT' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                    {formatEnum(workload.complianceStatus)}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Fila de remediação</CardTitle>
                  <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                    O que já tem status ou PR associado.
                  </p>
                </div>
              </CardHeader>

              <div className="space-y-3">
                {remediationQueue.length === 0 && (
                  <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                    Nenhum workload com remediação ativa neste momento.
                  </p>
                )}

                {remediationQueue.map(workload => (
                  <div key={workload.id} className="rounded-3xl border px-4 py-4" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{workload.name}</p>
                        <p className="mt-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                          {workload.namespace} · {workload.cluster}
                        </p>
                      </div>
                      <span className="rounded-full bg-orange-500/10 px-2.5 py-1 text-[11px] font-semibold text-orange-500">
                        {formatEnum(workload.remediationStatus ?? 'pendente')}
                      </span>
                    </div>
                    {workload.githubPrUrl && (
                      <a
                        href={workload.githubPrUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-orange-500"
                      >
                        Abrir PR vinculado
                        <ArrowRight size={13} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Namespaces com maior volume</CardTitle>
                  <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                    Onde a operação está mais concentrada.
                  </p>
                </div>
              </CardHeader>

              <div className="space-y-3">
                {namespaces.map(namespace => (
                  <div key={namespace.key} className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--color-muted)' }}>
                    <div>
                      <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{namespace.namespace}</p>
                      <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                        {namespace.cluster} · {formatEnum(namespace.environment)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{namespace.workloadCount}</p>
                      <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                        score {formatNumber(namespace.averageScore)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>
      </div>
    </div>
  )
}
