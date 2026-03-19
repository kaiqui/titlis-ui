import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Users, Globe, Package, AlertTriangle, GitPullRequest, ChevronRight, Shield, Activity } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { TrendIcon } from '@/components/ui/TrendIcon'
import { ScoreBadge } from '@/components/ui/ScoreBadge'
import { PageLoading, PageError } from '@/components/ui/PageState'
import { useSquads, useApplications } from '@/hooks/useApi'
import { scoreRingColor, scoreColor } from '@/lib/utils'

type GroupBy = 'squad' | 'product' | 'domain'

export function Squads() {
  const navigate = useNavigate()
  const [groupBy, setGroupBy] = useState<GroupBy>('squad')

  const { data: squadSummaries, isLoading: loadingSquads, error: errorSquads, refetch: refetchSquads } = useSquads()
  const { data: applications, isLoading: loadingApps, error: errorApps, refetch: refetchApps } = useApplications()

  const isLoading = loadingSquads || loadingApps
  const error = errorSquads || errorApps

  if (isLoading) return <><Header title="Times & Produtos" /><PageLoading /></>
  if (error || !squadSummaries || !applications) {
    return (
      <>
        <Header title="Times & Produtos" />
        <PageError
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => { void refetchSquads(); void refetchApps() }}
        />
      </>
    )
  }

  const getGrouped = () => {
    return squadSummaries.reduce<Record<string, typeof squadSummaries>>((acc, s) => {
      const k = groupBy === 'squad' ? s.squad : groupBy === 'product' ? s.product : s.domain
      if (!acc[k]) acc[k] = []
      acc[k].push(s)
      return acc
    }, {})
  }

  const grouped = getGrouped()

  const chartData = Object.entries(grouped).map(([name, squads]) => ({
    name: name.length > 12 ? name.slice(0, 12) + '...' : name,
    fullName: name,
    score: squads.reduce((s, q) => s + q.avgScore, 0) / squads.length,
    apps: squads.reduce((s, q) => s + q.appCount, 0),
  })).sort((a, b) => b.score - a.score)

  const appsForSquad = (squad: string) =>
    applications.filter(a => a.squad === squad)

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Times & Produtos" subtitle="Visao executiva agrupada por squad, produto ou dominio" />

      <div className="flex-1 p-6 space-y-5">
        {/* Group by switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
            Agrupar por:
          </span>
          {(['squad', 'product', 'domain'] as GroupBy[]).map(g => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                groupBy === g ? 'bg-indigo-500 text-white' : 'hover:bg-[--color-muted] text-[--color-muted-foreground]'
              }`}
            >
              {g === 'squad' && <Users size={11} />}
              {g === 'product' && <Package size={11} />}
              {g === 'domain' && <Globe size={11} />}
              {g === 'squad' ? 'Squad' : g === 'product' ? 'Produto' : 'Dominio'}
            </button>
          ))}
        </div>

        {/* Bar chart overview */}
        <motion.div
          key={groupBy}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Score Medio por {groupBy === 'squad' ? 'Squad' : groupBy === 'product' ? 'Produto' : 'Dominio'}</CardTitle>
            </CardHeader>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 20, left: -10 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                  axisLine={false} tickLine={false} angle={-20} textAnchor="end" />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                  axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload as typeof chartData[0]
                    return (
                      <div className="rounded-lg px-3 py-2 text-xs shadow-xl border"
                        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>
                        <p className="font-medium">{d.fullName}</p>
                        <p className="mt-1">Score: <span className="font-bold">{d.score.toFixed(1)}</span></p>
                        <p>Apps: <span className="font-bold">{d.apps}</span></p>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={scoreRingColor(d.score)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Squad cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {squadSummaries
            .sort((a, b) => a.avgScore - b.avgScore)
            .map((squad, i) => {
              const squadApps = appsForSquad(squad.squad)
              return (
                <motion.div
                  key={squad.squad}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.06 }}
                >
                  <Card hover>
                    <div className="flex items-start gap-4">
                      <ScoreRing score={squad.avgScore} size={64} strokeWidth={5} showLabel />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                            {squad.squad}
                          </h3>
                          <ScoreBadge score={squad.avgScore} size="sm" />
                          <TrendIcon trend={squad.trend} size={13} />
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 text-xs"
                          style={{ color: 'var(--color-muted-foreground)' }}>
                          <span className="flex items-center gap-1">
                            <Package size={10} />
                            {squad.product}
                          </span>
                          <span className="flex items-center gap-1">
                            <Globe size={10} />
                            {squad.domain}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users size={10} />
                            {squad.appCount} apps
                          </span>
                        </div>

                        {/* Score breakdown */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="rounded-md p-2" style={{ backgroundColor: 'var(--color-muted)' }}>
                            <div className="flex items-center gap-1 mb-0.5">
                              <Activity size={10} className="text-indigo-400" />
                              <span className="text-[10px]" style={{ color: 'var(--color-muted-foreground)' }}>Confiabilidade</span>
                            </div>
                            <span className={`text-sm font-bold ${scoreColor(squad.reliabilityScore)}`}>
                              {squad.reliabilityScore}
                            </span>
                          </div>
                          <div className="rounded-md p-2" style={{ backgroundColor: 'var(--color-muted)' }}>
                            <div className="flex items-center gap-1 mb-0.5">
                              <Shield size={10} className="text-purple-400" />
                              <span className="text-[10px]" style={{ color: 'var(--color-muted-foreground)' }}>Seguranca</span>
                            </div>
                            <span className={`text-sm font-bold ${scoreColor(squad.securityScore)}`}>
                              {squad.securityScore}
                            </span>
                          </div>
                        </div>

                        {/* Apps mini list */}
                        <div className="flex flex-wrap gap-1.5">
                          {squadApps.map(app => (
                            <button
                              key={app.id}
                              onClick={() => navigate(`/applications/${app.id}`)}
                              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-colors hover:border-indigo-500/50"
                              style={{
                                borderColor: 'var(--color-border)',
                                color: 'var(--color-muted-foreground)',
                              }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: scoreRingColor(app.overallScore) }} />
                              {app.name}
                              <ChevronRight size={8} />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        {squad.criticalApps > 0 && (
                          <span className="flex items-center gap-1 text-[10px] bg-red-500/10 text-red-500 rounded-full px-2 py-0.5 font-medium">
                            <AlertTriangle size={9} />
                            {squad.criticalApps} critico
                          </span>
                        )}
                        {squad.openPRs > 0 && (
                          <span className="flex items-center gap-1 text-[10px] bg-indigo-500/10 text-indigo-500 rounded-full px-2 py-0.5">
                            <GitPullRequest size={9} />
                            {squad.openPRs} PRs
                          </span>
                        )}
                      </div>
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
