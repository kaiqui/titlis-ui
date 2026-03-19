import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import {
  Activity, AlertTriangle, GitPullRequest,
  TrendingDown, DollarSign, Target, Zap, ArrowRight
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { MetricCard } from '@/components/ui/MetricCard'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { ScoreBadge } from '@/components/ui/ScoreBadge'
import { TrendIcon } from '@/components/ui/TrendIcon'
import { PageLoading, PageError } from '@/components/ui/PageState'
import { usePlatformSummary, useApplications } from '@/hooks/useApi'
import { scoreColor, scoreRingColor } from '@/lib/utils'

const pieColors = ['#10b981', '#eab308', '#f97316', '#ef4444']

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-3 py-2 text-xs shadow-xl border"
      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>
      <p className="font-medium mb-1">{label}</p>
      <p className="text-indigo-400">Score: <span className="font-bold">{payload[0].value.toFixed(1)}</span></p>
      {payload[1] && <p className="text-red-400">Criticos: <span className="font-bold">{payload[1].value}</span></p>}
    </div>
  )
}

export function Dashboard() {
  const navigate = useNavigate()
  const { data: platformSummary, isLoading: loadingPlatform, error: errorPlatform, refetch: refetchPlatform } = usePlatformSummary()
  const { data: applications, isLoading: loadingApps, error: errorApps, refetch: refetchApps } = useApplications()

  const isLoading = loadingPlatform || loadingApps
  const error = errorPlatform || errorApps

  if (isLoading) return <><Header title="Visao Geral da Plataforma" /><PageLoading /></>
  if (error || !platformSummary || !applications) {
    return (
      <>
        <Header title="Visao Geral da Plataforma" />
        <PageError message={(error as Error)?.message} onRetry={() => { void refetchPlatform(); void refetchApps() }} />
      </>
    )
  }

  const criticalApps = applications.filter(a => a.overallScore < 70).sort((a, b) => a.overallScore - b.overallScore)

  const pieData = [
    { name: 'Excelente', value: platformSummary.excellentApps },
    { name: 'Bom', value: platformSummary.goodApps },
    { name: 'Regular', value: platformSummary.warningApps },
    { name: 'Critico', value: platformSummary.criticalApps },
  ]

  const totalSlos = Math.round(platformSummary.sloCompliance / 100 * 7)

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Visao Geral da Plataforma" subtitle="Score de maturidade e saude dos workloads" />

      <div className="flex-1 p-6 space-y-6">
        {/* KPI row */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <motion.div variants={itemVariants}>
            <MetricCard
              label="Score Medio da Plataforma"
              value={platformSummary.avgScore.toFixed(1)}
              sub="de 100 pontos"
              icon={Activity}
              iconColor="text-indigo-500"
              trend="up"
              trendValue="+2.3 nos ultimos 7 dias"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <MetricCard
              label="Apps em Estado Critico"
              value={platformSummary.criticalApps}
              sub={`de ${platformSummary.totalApps} aplicacoes`}
              icon={AlertTriangle}
              iconColor="text-red-500"
              trend="down"
              trendValue="1 novo nas ultimas 24h"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <MetricCard
              label="Compliance de SLOs"
              value={`${platformSummary.sloCompliance.toFixed(0)}%`}
              sub={`${totalSlos}/7 SLOs saudaveis`}
              icon={Target}
              iconColor="text-emerald-500"
              trend="stable"
              trendValue="estavel"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <MetricCard
              label="PRs de Auto-Remediacao"
              value={platformSummary.openPRs}
              sub="abertos aguardando merge"
              icon={GitPullRequest}
              iconColor="text-purple-500"
              trend="up"
              trendValue="2 novos esta semana"
            />
          </motion.div>
        </motion.div>

        {/* Main charts row */}
        <div className="grid grid-cols-3 gap-4">
          <motion.div
            className="col-span-2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Evolucao do Score - 30 dias</CardTitle>
                <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Score medio diario</span>
              </CardHeader>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={platformSummary.scoreHistory} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="critGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                    tickFormatter={d => d.slice(5)} axisLine={false} tickLine={false} interval={5} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                    axisLine={false} tickLine={false} domain={[50, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2}
                    fill="url(#scoreGradient)" dot={false} />
                  <Area type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={1.5}
                    fill="url(#critGradient)" dot={false} yAxisId={0} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Distribuicao de Saude</CardTitle>
              </CardHeader>
              <div className="flex flex-col items-center">
                <PieChart width={140} height={140}>
                  <Pie data={pieData} cx={65} cy={65} innerRadius={40} outerRadius={65}
                    dataKey="value" strokeWidth={2} stroke="var(--color-card)">
                    {pieData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
                  </Pie>
                </PieChart>
                <div className="w-full space-y-1.5 mt-1">
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pieColors[i] }} />
                        <span style={{ color: 'var(--color-muted-foreground)' }}>{d.name}</span>
                      </div>
                      <span className="font-semibold" style={{ color: 'var(--color-foreground)' }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-red-500" />
                  <CardTitle>Aplicacoes que Precisam de Atencao</CardTitle>
                </div>
                <button onClick={() => navigate('/applications')}
                  className="text-xs text-indigo-500 flex items-center gap-1 hover:text-indigo-400 transition-colors">
                  Ver todas <ArrowRight size={11} />
                </button>
              </CardHeader>
              <div className="space-y-3">
                {criticalApps.slice(0, 4).map((app, i) => (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.08 }}
                    onClick={() => navigate(`/applications/${app.id}`)}
                    className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-[--color-muted]"
                  >
                    <ScoreRing score={app.overallScore} size={44} strokeWidth={4} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-foreground)' }}>{app.name}</p>
                        <ScoreBadge score={app.overallScore} size="sm" />
                      </div>
                      <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                        {app.namespace} · {app.squad}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 justify-end">
                      {app.issues.critical > 0 && (
                        <span className="text-[10px] bg-red-500/10 text-red-500 rounded px-1.5 py-0.5">
                          {app.issues.critical} critico
                        </span>
                      )}
                      <span className="text-[10px] bg-orange-500/10 text-orange-500 rounded px-1.5 py-0.5">
                        {app.issues.errors} erros
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>

          <div className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-yellow-500" />
                    <CardTitle>Resumo de Problemas</CardTitle>
                  </div>
                </CardHeader>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Criticos', value: platformSummary.totalFindings.critical, color: 'text-red-500', bg: 'bg-red-500/10' },
                    { label: 'Erros', value: platformSummary.totalFindings.errors, color: 'text-orange-500', bg: 'bg-orange-500/10' },
                    { label: 'Avisos', value: platformSummary.totalFindings.warnings, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
                  ].map(item => (
                    <div key={item.label} className={`rounded-lg p-3 ${item.bg}`}>
                      <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>{item.label}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <DollarSign size={14} className="text-emerald-500" />
                    <CardTitle>Custo Mensal</CardTitle>
                  </div>
                </CardHeader>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>
                      ${platformSummary.totalMonthlyCost.toLocaleString()}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>total mensal estimado</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-red-500">~$3.000 em desperdicio</p>
                    <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>recursos ociosos detectados</p>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingDown size={14} className="text-red-500" />
                    <CardTitle>Apps com Piora</CardTitle>
                  </div>
                </CardHeader>
                <div className="space-y-2">
                  {applications.filter(a => a.trend === 'down').slice(0, 3).map(app => (
                    <div key={app.id}
                      onClick={() => navigate(`/applications/${app.id}`)}
                      className="flex items-center justify-between cursor-pointer hover:bg-[--color-muted] rounded-md p-1.5 -mx-1.5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <TrendIcon trend="down" />
                        <span className="text-sm" style={{ color: 'var(--color-foreground)' }}>{app.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${scoreColor(app.overallScore)}`}>
                          {app.overallScore.toFixed(1)}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                          {app.namespace}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* All apps quick view */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <Card>
            <CardHeader>
              <CardTitle>Todas as Aplicacoes</CardTitle>
              <button onClick={() => navigate('/applications')}
                className="text-xs text-indigo-500 flex items-center gap-1 hover:text-indigo-400 transition-colors">
                Gerenciar <ArrowRight size={11} />
              </button>
            </CardHeader>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {applications.map((app, i) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.75 + i * 0.05 }}
                  onClick={() => navigate(`/applications/${app.id}`)}
                  className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:border-indigo-500/40 hover:shadow-md"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div className="w-2 h-8 rounded-full flex-shrink-0"
                    style={{ backgroundColor: scoreRingColor(app.overallScore) }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--color-foreground)' }}>{app.name}</p>
                    <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{app.namespace}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${scoreColor(app.overallScore)}`}>
                      {app.overallScore.toFixed(0)}
                    </p>
                    <TrendIcon trend={app.trend} size={11} />
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
