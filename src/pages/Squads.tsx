import { motion } from 'framer-motion'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Globe2, Layers3, Network, ShieldCheck } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { MetricCard } from '@/components/ui/MetricCard'
import { PageError, PageLoading } from '@/components/ui/PageState'
import { useDashboardWorkloads } from '@/hooks/useApi'
import { buildClusterSummaries, buildNamespaceSummaries, buildPlatformSummary } from '@/lib/insights'
import { formatEnum, formatNumber } from '@/lib/utils'

export function Squads() {
  const { data: workloads, isLoading, error, refetch } = useDashboardWorkloads()

  if (isLoading) return <><Header title="Topologia da plataforma" /><PageLoading /></>
  if (error || !workloads) {
    return (
      <>
        <Header title="Topologia da plataforma" />
        <PageError message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
      </>
    )
  }

  const summary = buildPlatformSummary(workloads)
  const clusters = buildClusterSummaries(workloads)
  const namespaces = buildNamespaceSummaries(workloads).slice(0, 8)

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title="Topologia da plataforma"
        subtitle="Leitura agregada por cluster, ambiente e namespace, construída a partir do dashboard consolidado do titlis-api."
      />

      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Clusters"
            value={summary.clusters}
            sub="escopos de cluster ativos"
            icon={Network}
            iconColor="text-orange-500"
          />
          <MetricCard
            label="Namespaces"
            value={summary.namespaces}
            sub="combinações cluster + namespace"
            icon={Layers3}
            iconColor="text-amber-500"
            delay={0.05}
          />
          <MetricCard
            label="Conformes"
            value={summary.compliantCount}
            sub="workloads em faixa saudável"
            icon={ShieldCheck}
            iconColor="text-emerald-500"
            delay={0.1}
          />
          <MetricCard
            label="Cobertura"
            value={`${summary.scoredWorkloads}/${summary.totalWorkloads}`}
            sub="workloads com scorecard"
            icon={Globe2}
            iconColor="text-slate-500"
            delay={0.15}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Score médio por cluster</CardTitle>
                <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                  Comparativo da maturidade por domínio de cluster e ambiente.
                </p>
              </div>
            </CardHeader>

            <div className="h-[320px]">
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

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Inventário por cluster</CardTitle>
                <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                  Uma leitura mais operacional da topologia atual.
                </p>
              </div>
            </CardHeader>

            <div className="space-y-3">
              {clusters.map((cluster, index) => (
                <motion.div
                  key={cluster.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.04 }}
                  className="rounded-3xl border px-4 py-4"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{cluster.cluster}</p>
                      <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{formatEnum(cluster.environment)}</p>
                    </div>
                    <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-500">
                      score {formatNumber(cluster.averageScore)}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl px-3 py-3" style={{ backgroundColor: 'var(--color-muted)' }}>
                      <p style={{ color: 'var(--color-muted-foreground)' }}>Workloads</p>
                      <p className="mt-1 font-black" style={{ color: 'var(--color-foreground)' }}>{cluster.workloadCount}</p>
                    </div>
                    <div className="rounded-2xl px-3 py-3" style={{ backgroundColor: 'var(--color-muted)' }}>
                      <p style={{ color: 'var(--color-muted-foreground)' }}>Namespaces</p>
                      <p className="mt-1 font-black" style={{ color: 'var(--color-foreground)' }}>{cluster.namespaces}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Namespaces mais representativos</CardTitle>
              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                Ordenados por volume de workloads.
              </p>
            </div>
          </CardHeader>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {namespaces.map(namespace => (
              <div key={namespace.key} className="rounded-3xl px-4 py-4" style={{ backgroundColor: 'var(--color-muted)' }}>
                <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{namespace.namespace}</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                  {namespace.cluster} · {formatEnum(namespace.environment)}
                </p>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--color-muted-foreground)' }}>Workloads</span>
                    <span className="font-black" style={{ color: 'var(--color-foreground)' }}>{namespace.workloadCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--color-muted-foreground)' }}>Score médio</span>
                    <span className="font-black" style={{ color: 'var(--color-foreground)' }}>{formatNumber(namespace.averageScore)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
