import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lightbulb, GitPullRequest, ExternalLink, Filter, Wrench, Info, AlertTriangle, XCircle, ChevronRight } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardHeader } from '@/components/ui/Card'
import { SeverityBadge } from '@/components/ui/SeverityBadge'
import { PageLoading, PageError } from '@/components/ui/PageState'
import { useRecommendations } from '@/hooks/useApi'
import type { Severity, RecommendationItem } from '@/types'

type FilterSev = 'all' | Severity

const sevIcon = (sev: Severity) => {
  if (sev === 'critical') return <XCircle size={13} className="text-red-500" />
  if (sev === 'error') return <AlertTriangle size={13} className="text-orange-500" />
  if (sev === 'warning') return <AlertTriangle size={13} className="text-yellow-500" />
  return <Info size={13} className="text-blue-500" />
}

export function Recommendations() {
  const navigate = useNavigate()
  const [filterSev, setFilterSev] = useState<FilterSev>('all')
  const [filterRemediable, setFilterRemediable] = useState(false)

  const { data: grouped, isLoading, error, refetch } = useRecommendations()

  if (isLoading) return <><Header title="Recomendacoes de Melhoria" /><PageLoading /></>
  if (error || !grouped) {
    return (
      <>
        <Header title="Recomendacoes de Melhoria" />
        <PageError message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
      </>
    )
  }

  // Flatten all items for counts
  const items: RecommendationItem[] = Object.values(grouped).flat()

  const counts = {
    critical: items.filter(i => i.severity === 'critical').length,
    error: items.filter(i => i.severity === 'error').length,
    warning: items.filter(i => i.severity === 'warning').length,
    remediable: items.filter(i => i.remediable).length,
    withPR: items.filter(i => i.hasPR).length,
  }

  // Apply filters and re-group
  const filtered = items.filter(item => {
    const matchSev = filterSev === 'all' ? true : item.severity === filterSev
    const matchRem = filterRemediable ? item.remediable : true
    return matchSev && matchRem
  }).sort((a, b) => {
    const order = { critical: 0, error: 1, warning: 2, info: 3 }
    return order[a.severity] - order[b.severity]
  })

  const groupedByApp = filtered.reduce<Record<string, RecommendationItem[]>>((acc, item) => {
    if (!acc[item.appId]) acc[item.appId] = []
    acc[item.appId].push(item)
    return acc
  }, {})

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Recomendacoes de Melhoria"
        subtitle={`${items.length} problemas detectados em ${Object.keys(grouped).length} aplicacoes`}
      />

      <div className="flex-1 p-6 space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Criticos', value: counts.critical, color: 'text-red-500', bg: 'bg-red-500/10' },
            { label: 'Erros', value: counts.error, color: 'text-orange-500', bg: 'bg-orange-500/10' },
            { label: 'Avisos', value: counts.warning, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
            { label: 'Auto-fixaveis', value: counts.remediable, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
            { label: 'Com PR Aberto', value: counts.withPR, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          ].map(({ label, value, color }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>{label}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Filter size={13} style={{ color: 'var(--color-muted-foreground)' }} />
          {(['all', 'critical', 'error', 'warning', 'info'] as FilterSev[]).map(f => (
            <button
              key={f}
              onClick={() => setFilterSev(f)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                filterSev === f ? 'bg-indigo-500 text-white' : 'hover:bg-[--color-muted] text-[--color-muted-foreground]'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'critical' ? 'Criticos' : f === 'error' ? 'Erros' : f === 'warning' ? 'Avisos' : 'Info'}
            </button>
          ))}
          <button
            onClick={() => setFilterRemediable(r => !r)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterRemediable ? 'bg-indigo-500 text-white' : 'hover:bg-[--color-muted] text-[--color-muted-foreground]'
            }`}
          >
            <Wrench size={11} />
            Auto-fixaveis
          </button>
          <span className="text-xs ml-auto" style={{ color: 'var(--color-muted-foreground)' }}>
            {filtered.length} recomendacoes
          </span>
        </div>

        {/* Grouped by app */}
        <div className="space-y-4">
          {Object.entries(groupedByApp).map(([appId, recs], gi) => {
            const first = recs[0]
            const prItem = recs.find(r => r.hasPR)
            const prNumber = prItem?.prUrl ? prItem.prUrl.split('/').pop() : null
            return (
              <motion.div
                key={appId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + gi * 0.08 }}
              >
                <Card>
                  <CardHeader className="mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/applications/${appId}`)}
                            className="text-sm font-semibold hover:text-indigo-500 transition-colors flex items-center gap-1"
                            style={{ color: 'var(--color-foreground)' }}
                          >
                            {first.appName}
                            <ChevronRight size={13} />
                          </button>
                          <span className="text-xs px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                            {first.namespace}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                            {first.squad}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {recs.filter(r => r.severity === 'critical').length > 0 && (
                          <span className="text-[10px] bg-red-500/10 text-red-500 rounded px-1.5 py-0.5">
                            {recs.filter(r => r.severity === 'critical').length} criticos
                          </span>
                        )}
                        {recs.filter(r => r.severity === 'error').length > 0 && (
                          <span className="text-[10px] bg-orange-500/10 text-orange-500 rounded px-1.5 py-0.5">
                            {recs.filter(r => r.severity === 'error').length} erros
                          </span>
                        )}
                        {prItem && prItem.prUrl && (
                          <a
                            href={prItem.prUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[10px] bg-indigo-500/10 text-indigo-500 rounded-full px-2 py-0.5 hover:bg-indigo-500/20 transition-colors"
                          >
                            <GitPullRequest size={9} />
                            PR #{prNumber}
                            <ExternalLink size={8} />
                          </a>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                    {recs.map((rec, ri) => (
                      <motion.div
                        key={`${rec.ruleId}-${ri}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.35 + gi * 0.08 + ri * 0.04 }}
                        className="py-3 flex items-start gap-3"
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {sevIcon(rec.severity)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <SeverityBadge severity={rec.severity} />
                            <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                              {rec.ruleId}
                            </span>
                            <span className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                              {rec.ruleName}
                            </span>
                          </div>
                          <p className="text-xs mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>
                            {rec.message}
                          </p>
                          <div className="flex items-start gap-1.5 p-2 rounded-md"
                            style={{ backgroundColor: 'var(--color-muted)' }}>
                            <Lightbulb size={11} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs" style={{ color: 'var(--color-foreground)' }}>
                              {rec.remediation}
                            </p>
                          </div>
                        </div>
                        <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                          {rec.remediable && (
                            <span className="flex items-center gap-1 text-[10px] bg-indigo-500/10 text-indigo-500 rounded-full px-2 py-0.5 font-medium">
                              <Wrench size={9} />
                              Auto-fix
                            </span>
                          )}
                          {rec.hasPR && (
                            <span className="flex items-center gap-1 text-[10px] bg-purple-500/10 text-purple-500 rounded-full px-2 py-0.5">
                              <GitPullRequest size={9} />
                              Em PR
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
