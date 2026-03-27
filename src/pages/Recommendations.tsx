import { useDeferredValue, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  GitPullRequest,
  Search,
  ShieldAlert,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { MetricCard } from '@/components/ui/MetricCard'
import { PageError, PageLoading } from '@/components/ui/PageState'
import { useDashboardWorkloads } from '@/hooks/useApi'
import { buildRemediationQueue } from '@/lib/insights'
import { formatEnum, statusTone } from '@/lib/utils'

export function Recommendations() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const { data: workloads, isLoading, error, refetch } = useDashboardWorkloads()

  if (isLoading) return <><Header title="Remediação & prioridades" /><PageLoading /></>
  if (error || !workloads) {
    return (
      <>
        <Header title="Remediação & prioridades" />
        <PageError message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
      </>
    )
  }

  const queue = buildRemediationQueue(workloads)
  const visible = queue.filter(item => {
    const term = deferredSearch.trim().toLowerCase()
    if (!term) return true
    return item.name.toLowerCase().includes(term) || item.namespace.toLowerCase().includes(term) || item.cluster.toLowerCase().includes(term)
  })

  const withPr = visible.filter(item => item.githubPrUrl)
  const withoutPr = visible.filter(item => !item.githubPrUrl)

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title="Remediação & prioridades"
        subtitle="Fila operacional montada com base no dashboard consolidado e no estado de remediação persistido na API."
      />

      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">
        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Itens priorizados"
            value={queue.length}
            sub="não conformes ou com remediação ativa"
            icon={ShieldAlert}
            iconColor="text-red-500"
            trend={queue.length > 0 ? 'down' : 'stable'}
            trendValue={queue.length > 0 ? 'acompanhar diariamente' : 'nenhuma pendência agora'}
          />
          <MetricCard
            label="Com PR aberto"
            value={withPr.length}
            sub="ações rastreáveis no repositório"
            icon={GitPullRequest}
            iconColor="text-orange-500"
            trend={withPr.length > 0 ? 'up' : 'stable'}
            trendValue={withPr.length > 0 ? 'foco em merge e follow-up' : 'sem PRs vinculados'}
            delay={0.05}
          />
          <MetricCard
            label="Sem PR"
            value={withoutPr.length}
            sub="pedem investigação manual"
            icon={Wrench}
            iconColor="text-amber-500"
            trend={withoutPr.length > 0 ? 'down' : 'stable'}
            trendValue={withoutPr.length > 0 ? 'avaliar causa raiz' : 'todos os itens têm trilha'}
            delay={0.1}
          />
        </section>

        <Card>
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted-foreground)' }} />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar por workload, namespace ou cluster"
              className="w-full rounded-2xl border py-3 pl-11 pr-4 text-sm outline-none"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-muted)',
                color: 'var(--color-foreground)',
              }}
            />
          </div>
        </Card>

        {visible.length === 0 && (
          <Card>
            <EmptyState
              icon={Sparkles}
              title="Nenhuma prioridade na fila"
              description="Os dados atuais da API não indicam workloads não conformes nem remediações em andamento."
            />
          </Card>
        )}

        {visible.length > 0 && (
          <section className="space-y-4">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>PRs e ações em andamento</CardTitle>
                  <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                    Itens com rastreabilidade mais clara para conduzir o fluxo de correção.
                  </p>
                </div>
              </CardHeader>

              <div className="space-y-3">
                {visible.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.02 }}
                  >
                    <Card className="border-transparent" >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => navigate(`/applications/${item.id}`)}
                              className="truncate text-left text-lg font-black tracking-tight transition-colors hover:text-orange-500"
                              style={{ color: 'var(--color-foreground)' }}
                              type="button"
                            >
                              {item.name}
                            </button>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(item.remediationStatus ?? item.complianceStatus)}`}>
                              {formatEnum(item.remediationStatus ?? item.complianceStatus)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                            {item.namespace} · {item.cluster} · {formatEnum(item.environment)}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {item.githubPrUrl ? (
                            <a
                              href={item.githubPrUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
                            >
                              Abrir PR
                              <GitPullRequest size={14} />
                            </a>
                          ) : (
                            <span className="rounded-full px-4 py-2 text-sm font-semibold" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-muted-foreground)' }}>
                              Sem PR publicado
                            </span>
                          )}

                          <button
                            onClick={() => navigate(`/applications/${item.id}`)}
                            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)', backgroundColor: 'var(--color-card)' }}
                            type="button"
                          >
                            Ver detalhe
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </Card>
          </section>
        )}
      </div>
    </div>
  )
}
