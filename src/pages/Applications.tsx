import { useDeferredValue, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpDown, Search } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { PageError, PageLoading } from '@/components/ui/PageState'
import { ScoreBadge } from '@/components/ui/ScoreBadge'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { useDashboardWorkloads } from '@/hooks/useApi'
import { formatEnum, statusTone } from '@/lib/utils'

type SortKey = 'score' | 'name' | 'namespace'
type ComplianceFilter = 'all' | 'non_compliant' | 'compliant' | 'unknown'

export function Applications() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [cluster, setCluster] = useState('all')
  const [environment, setEnvironment] = useState('all')
  const [complianceFilter, setComplianceFilter] = useState<ComplianceFilter>('non_compliant')
  const [sortKey, setSortKey] = useState<SortKey>('score')
  const [descending, setDescending] = useState(false)

  const deferredSearch = useDeferredValue(search)
  const { data: workloads, isLoading, error, refetch } = useDashboardWorkloads()

  if (isLoading) return <><Header title="Workloads monitorados" /><PageLoading /></>
  if (error || !workloads) {
    return (
      <>
        <Header title="Workloads monitorados" />
        <PageError message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
      </>
    )
  }

  const clusters = ['all', ...new Set(workloads.map(workload => workload.cluster))]
  const environments = ['all', ...new Set(workloads.map(workload => workload.environment))]

  const filtered = workloads
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

  const nonCompliantCount = workloads.filter(workload => workload.complianceStatus === 'NON_COMPLIANT').length
  const compliantCount = workloads.filter(workload => workload.complianceStatus === 'COMPLIANT').length
  const unknownCount = workloads.length - nonCompliantCount - compliantCount

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title="Workloads monitorados"
        subtitle="Catálogo operacional alinhado ao endpoint /v1/dashboard, com foco imediato em não conformidade, cluster, ambiente e namespace."
      />

      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">
        <Card className="overflow-hidden">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {[
              { value: 'non_compliant', label: 'Não conformes', count: nonCompliantCount },
              { value: 'all', label: 'Todos', count: workloads.length },
              { value: 'compliant', label: 'Conformes', count: compliantCount },
              { value: 'unknown', label: 'Sem classificação', count: unknownCount },
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setComplianceFilter(option.value as ComplianceFilter)}
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
                style={{
                  borderColor: complianceFilter === option.value ? 'rgba(239, 68, 68, 0.25)' : 'var(--color-border)',
                  backgroundColor: complianceFilter === option.value ? 'rgba(239, 68, 68, 0.10)' : 'var(--color-card)',
                  color: complianceFilter === option.value ? 'rgb(220 38 38)' : 'var(--color-foreground)',
                }}
                type="button"
              >
                {option.label}
                <span className="rounded-full bg-black/6 px-2 py-0.5 text-xs dark:bg-white/10">{option.count}</span>
              </button>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_0.7fr_0.7fr_auto]">
            <label className="relative">
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
            </label>

            <select
              value={cluster}
              onChange={event => setCluster(event.target.value)}
              className="rounded-2xl border px-4 py-3 text-sm outline-none"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-muted)',
                color: 'var(--color-foreground)',
              }}
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
              className="rounded-2xl border px-4 py-3 text-sm outline-none"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-muted)',
                color: 'var(--color-foreground)',
              }}
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
              className="inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-card)',
                color: 'var(--color-foreground)',
              }}
              type="button"
            >
              <ArrowUpDown size={15} />
              Ordenar
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            <span>{filtered.length} workloads na visualização atual.</span>
            <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-500">
              {nonCompliantCount} não conformes no ambiente
            </span>
            <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-500">
              ordenação por {sortKey === 'score' ? 'score' : sortKey === 'name' ? 'nome' : 'namespace'}
            </span>
          </div>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          {filtered.map((workload, index) => (
            <motion.div
              key={workload.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.02 }}
            >
              <Card hover onClick={() => navigate(`/applications/${workload.id}`)} className="h-full">
                <div className="flex items-start gap-4">
                  <ScoreRing score={workload.overallScore} size={72} strokeWidth={6} showLabel />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-lg font-black tracking-tight" style={{ color: 'var(--color-foreground)' }}>
                        {workload.name}
                      </h3>
                      <ScoreBadge score={workload.overallScore} size="sm" />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full px-3 py-1" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                        {workload.namespace}
                      </span>
                      <span className="rounded-full px-3 py-1" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                        {workload.cluster}
                      </span>
                      <span className="rounded-full px-3 py-1" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                        {formatEnum(workload.environment)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--color-muted)' }}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                          Conformidade
                        </p>
                        <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusTone(workload.complianceStatus)}`}>
                          {formatEnum(workload.complianceStatus)}
                        </span>
                      </div>
                      <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--color-muted)' }}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                          Remediação
                        </p>
                        <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusTone(workload.remediationStatus)}`}>
                          {formatEnum(workload.remediationStatus)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={event => {
                          event.stopPropagation()
                          navigate(`/applications/${workload.id}`)
                        }}
                        className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-colors"
                        style={{
                          borderColor: 'var(--color-border)',
                          backgroundColor: 'var(--color-card)',
                          color: 'var(--color-foreground)',
                        }}
                        type="button"
                      >
                        Abrir aplicação
                      </button>
                      <button
                        onClick={event => {
                          event.stopPropagation()
                          navigate(`/applications/${workload.id}/scorecard`)
                        }}
                        className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-600"
                        type="button"
                      >
                        Abrir scorecard
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
