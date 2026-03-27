import { useDeferredValue, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  ClipboardCheck,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { PageError, PageLoading } from '@/components/ui/PageState'
import { ScoreBadge } from '@/components/ui/ScoreBadge'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { useDashboardWorkloads } from '@/hooks/useApi'
import { buildPlatformSummary } from '@/lib/insights'
import { formatEnum, formatNumber, statusTone } from '@/lib/utils'

type ComplianceFilter = 'all' | 'non_compliant' | 'compliant' | 'unknown'

export function Scorecards() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [cluster, setCluster] = useState('all')
  const [complianceFilter, setComplianceFilter] = useState<ComplianceFilter>('all')
  const deferredSearch = useDeferredValue(search)
  const { data: workloads, isLoading, error, refetch } = useDashboardWorkloads()

  if (isLoading) return <><Header title="Scorecards" /><PageLoading /></>
  if (error || !workloads) {
    return (
      <>
        <Header title="Scorecards" />
        <PageError message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
      </>
    )
  }

  const summary = buildPlatformSummary(workloads)
  const clusters = ['all', ...new Set(workloads.map(workload => workload.cluster))]
  const filtered = workloads
    .filter(workload => {
      const term = deferredSearch.trim().toLowerCase()
      const matchesSearch = term.length === 0
        || workload.name.toLowerCase().includes(term)
        || workload.namespace.toLowerCase().includes(term)
        || workload.cluster.toLowerCase().includes(term)
      const matchesCluster = cluster === 'all' || workload.cluster === cluster
      const matchesCompliance = complianceFilter === 'all'
        || (complianceFilter === 'non_compliant' && workload.complianceStatus === 'NON_COMPLIANT')
        || (complianceFilter === 'compliant' && workload.complianceStatus === 'COMPLIANT')
        || (complianceFilter === 'unknown' && workload.complianceStatus !== 'NON_COMPLIANT' && workload.complianceStatus !== 'COMPLIANT')

      return matchesSearch && matchesCluster && matchesCompliance
    })
    .sort((left, right) => (right.overallScore ?? -1) - (left.overallScore ?? -1))

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title="Scorecards"
        subtitle="Página dedicada para navegar pelos scorecards publicados, entender aderência geral e abrir o detalhe completo de cada workload."
      />

      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[36px] border p-6 lg:p-8"
          style={{ borderColor: 'var(--hero-border)', background: 'var(--hero-background)' }}
        >
          <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div className="space-y-4">
              <span
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={{ backgroundColor: 'rgba(255,255,255,0.72)', color: 'var(--color-primary-strong)' }}
              >
                Navegação de scorecard
              </span>
              <div className="space-y-3">
                <h2 className="text-3xl font-black tracking-tight lg:text-5xl" style={{ color: 'var(--color-foreground)' }}>
                  A visão geral do scorecard agora tem lugar próprio na navegação.
                </h2>
                <p className="max-w-2xl text-sm leading-6 lg:text-base" style={{ color: 'var(--color-muted-foreground)' }}>
                  Aqui a leitura é de aderência geral, score consolidado e estado de conformidade. Ao clicar em uma aplicação, você abre direto todos os itens do scorecard dela.
                </p>
              </div>
            </div>

            <Card>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                Resumo atual
              </p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-3xl font-black" style={{ color: 'var(--color-foreground)' }}>
                    {summary.scoredWorkloads}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>scorecards publicados</p>
                </div>
                <div>
                  <p className="text-3xl font-black" style={{ color: 'var(--color-foreground)' }}>
                    {formatNumber(summary.averageScore)}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>score médio</p>
                </div>
                <div>
                  <p className="text-3xl font-black text-red-500">
                    {summary.nonCompliantCount}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>não conformes</p>
                </div>
                <div>
                  <p className="text-3xl font-black text-emerald-500">
                    {summary.compliantCount}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>conformes</p>
                </div>
              </div>
            </Card>
          </div>
        </motion.section>

        <Card className="overflow-hidden">
          <div className="grid gap-4 lg:grid-cols-[1.25fr_0.7fr_auto]">
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

            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'Todos' },
                { value: 'non_compliant', label: 'Não conformes' },
                { value: 'compliant', label: 'Conformes' },
                { value: 'unknown', label: 'Sem classificação' },
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setComplianceFilter(option.value as ComplianceFilter)}
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold transition-colors"
                  style={{
                    borderColor: complianceFilter === option.value ? 'rgba(244, 93, 45, 0.25)' : 'var(--color-border)',
                    backgroundColor: complianceFilter === option.value ? 'rgba(244, 93, 45, 0.12)' : 'var(--color-card)',
                    color: 'var(--color-foreground)',
                  }}
                  type="button"
                >
                  <SlidersHorizontal size={14} />
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <section className="grid gap-4 xl:grid-cols-2">
          {filtered.map((workload, index) => (
            <motion.div
              key={workload.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.02 }}
            >
              <Card hover onClick={() => navigate(`/scorecards/${workload.id}`)} className="h-full">
                <div className="flex items-start gap-4">
                  <ScoreRing score={workload.overallScore} size={84} strokeWidth={7} showLabel />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-lg font-black tracking-tight" style={{ color: 'var(--color-foreground)' }}>
                        {workload.name}
                      </h3>
                      <ScoreBadge score={workload.overallScore} size="sm" />
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(workload.complianceStatus)}`}>
                        {formatEnum(workload.complianceStatus)}
                      </span>
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
                        <div className="flex items-center gap-2">
                          <ClipboardCheck size={15} style={{ color: 'var(--color-primary)' }} />
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                            Aderência geral
                          </p>
                        </div>
                        <p className="mt-2 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>
                          {workload.overallScore === null ? 'N/D' : `${workload.overallScore.toFixed(1)} pontos`}
                        </p>
                      </div>
                      <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--color-muted)' }}>
                        <div className="flex items-center gap-2">
                          {workload.complianceStatus === 'NON_COMPLIANT'
                            ? <ShieldAlert size={15} className="text-red-500" />
                            : <ShieldCheck size={15} className="text-emerald-500" />}
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                            Estado
                          </p>
                        </div>
                        <p className="mt-2 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>
                          {formatEnum(workload.complianceStatus)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={event => {
                          event.stopPropagation()
                          navigate(`/scorecards/${workload.id}`)
                        }}
                        className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-600"
                        type="button"
                      >
                        Ver itens do scorecard
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </section>
      </div>
    </div>
  )
}
