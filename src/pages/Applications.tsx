import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, ArrowUpDown, Server, GitPullRequest } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { ScoreBadge } from '@/components/ui/ScoreBadge'
import { TrendIcon } from '@/components/ui/TrendIcon'
import { PillarBar } from '@/components/ui/PillarBar'
import { PageLoading, PageError } from '@/components/ui/PageState'
import { useApplications, useApplicationNamespaces } from '@/hooks/useApi'

type SortKey = 'score' | 'name' | 'errors'
type FilterScore = 'all' | 'critical' | 'warning' | 'good' | 'excellent'

export function Applications() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('score')
  const [sortAsc, setSortAsc] = useState(true)
  const [filterScore, setFilterScore] = useState<FilterScore>('all')
  const [filterNs, setFilterNs] = useState('all')

  const { data: applications, isLoading, error, refetch } = useApplications()
  const { data: namespacesData } = useApplicationNamespaces()

  if (isLoading) return <><Header title="Aplicacoes" /><PageLoading /></>
  if (error || !applications) {
    return (
      <>
        <Header title="Aplicacoes" />
        <PageError message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
      </>
    )
  }

  const namespaces = ['all', ...(namespacesData ?? Array.from(new Set(applications.map(a => a.namespace))))]

  const filtered = applications
    .filter(a => {
      const q = search.toLowerCase()
      const matchSearch = a.name.toLowerCase().includes(q) ||
        a.squad.toLowerCase().includes(q) ||
        a.namespace.toLowerCase().includes(q)
      const matchScore =
        filterScore === 'all' ? true :
        filterScore === 'critical' ? a.overallScore < 70 :
        filterScore === 'warning' ? (a.overallScore >= 70 && a.overallScore < 80) :
        filterScore === 'good' ? (a.overallScore >= 80 && a.overallScore < 90) :
        a.overallScore >= 90
      const matchNs = filterNs === 'all' ? true : a.namespace === filterNs
      return matchSearch && matchScore && matchNs
    })
    .sort((a, b) => {
      let diff = 0
      if (sortKey === 'score') diff = a.overallScore - b.overallScore
      if (sortKey === 'name') diff = a.name.localeCompare(b.name)
      if (sortKey === 'errors') diff = (a.issues.errors + a.issues.critical) - (b.issues.errors + b.issues.critical)
      return sortAsc ? diff : -diff
    })

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(s => !s)
    else { setSortKey(key); setSortAsc(false) }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Aplicacoes" subtitle={`${applications.length} workloads monitorados`} />

      <div className="flex-1 p-6 space-y-5">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--color-muted-foreground)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, squad, namespace..."
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none transition-colors"
              style={{
                backgroundColor: 'var(--color-muted)',
                color: 'var(--color-foreground)',
                border: '1px solid var(--color-border)',
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={13} style={{ color: 'var(--color-muted-foreground)' }} />
            {(['all', 'critical', 'warning', 'good', 'excellent'] as FilterScore[]).map(f => (
              <button
                key={f}
                onClick={() => setFilterScore(f)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                  filterScore === f
                    ? 'bg-indigo-500 text-white'
                    : 'hover:bg-[--color-muted] text-[--color-muted-foreground]'
                }`}
              >
                {f === 'all' ? 'Todos' : f === 'critical' ? 'Critico' : f === 'warning' ? 'Regular' : f === 'good' ? 'Bom' : 'Excelente'}
              </button>
            ))}
          </div>

          <select
            value={filterNs}
            onChange={e => setFilterNs(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg outline-none cursor-pointer"
            style={{
              backgroundColor: 'var(--color-muted)',
              color: 'var(--color-foreground)',
              border: '1px solid var(--color-border)',
            }}
          >
            {namespaces.map(ns => (
              <option key={ns} value={ns}>{ns === 'all' ? 'Todos namespaces' : ns}</option>
            ))}
          </select>
        </div>

        {/* Sort bar */}
        <div className="flex items-center gap-4 px-1">
          <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            {filtered.length} resultados
          </span>
          <div className="flex items-center gap-2 ml-auto">
            {(['score', 'name', 'errors'] as SortKey[]).map(key => (
              <button
                key={key}
                onClick={() => toggleSort(key)}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                  sortKey === key ? 'text-indigo-500' : 'hover:text-[--color-foreground]'
                }`}
                style={{ color: sortKey === key ? undefined : 'var(--color-muted-foreground)' }}
              >
                <ArrowUpDown size={10} />
                {key === 'score' ? 'Score' : key === 'name' ? 'Nome' : 'Problemas'}
              </button>
            ))}
          </div>
        </div>

        {/* Apps grid */}
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((app, i) => (
              <motion.div
                key={app.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
              >
                <Card
                  hover
                  onClick={() => navigate(`/applications/${app.id}`)}
                  className="group"
                >
                  <div className="flex items-start gap-4">
                    <ScoreRing score={app.overallScore} size={64} strokeWidth={5} showLabel />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--color-foreground)' }}>
                          {app.name}
                        </h3>
                        <ScoreBadge score={app.overallScore} size="sm" />
                        <TrendIcon trend={app.trend} size={13} />
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
                        <span className="flex items-center gap-1 text-xs"
                          style={{ color: 'var(--color-muted-foreground)' }}>
                          <Server size={10} />
                          {app.namespace}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                          {app.kind}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                          Squad: <span className="font-medium" style={{ color: 'var(--color-foreground)' }}>{app.squad}</span>
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          app.tier === 'tier-1' ? 'bg-purple-500/10 text-purple-500' :
                          app.tier === 'tier-2' ? 'bg-blue-500/10 text-blue-500' :
                          'bg-gray-500/10 text-gray-500'
                        }`}>
                          {app.tier}
                        </span>
                      </div>

                      {/* Pillar mini bars */}
                      <div className="space-y-1">
                        {Object.entries(app.pillarScores).slice(0, 3).map(([pillar, data]) => (
                          <PillarBar key={pillar} pillar={pillar} data={data} />
                        ))}
                      </div>
                    </div>

                    {/* Right column */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="flex items-center gap-1.5">
                        {app.issues.critical > 0 && (
                          <span className="text-[10px] bg-red-500/10 text-red-500 rounded px-1.5 py-0.5 font-medium">
                            {app.issues.critical}C
                          </span>
                        )}
                        {app.issues.errors > 0 && (
                          <span className="text-[10px] bg-orange-500/10 text-orange-500 rounded px-1.5 py-0.5 font-medium">
                            {app.issues.errors}E
                          </span>
                        )}
                        {app.issues.warnings > 0 && (
                          <span className="text-[10px] bg-yellow-500/10 text-yellow-600 rounded px-1.5 py-0.5 font-medium">
                            {app.issues.warnings}W
                          </span>
                        )}
                      </div>
                      {app.remediationPR && (
                        <span className="flex items-center gap-1 text-[10px] bg-indigo-500/10 text-indigo-500 rounded-full px-2 py-0.5">
                          <GitPullRequest size={9} />
                          PR #{app.remediationPR.prNumber}
                        </span>
                      )}
                      {app.monthlyCostUsd && (
                        <span className="text-[10px]" style={{ color: 'var(--color-muted-foreground)' }}>
                          ${app.monthlyCostUsd}/mo
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      </div>
    </div>
  )
}
