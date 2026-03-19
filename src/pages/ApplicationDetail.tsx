import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts'
import {
  ArrowLeft, Server, GitPullRequest, ExternalLink,
  Clock, User, Tag, Box, Shield, Activity, DollarSign, CheckCircle2,
  XCircle, AlertTriangle, Info
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { PillarBar } from '@/components/ui/PillarBar'
import { FindingRow } from '@/components/ui/FindingRow'
import { ScoreBadge } from '@/components/ui/ScoreBadge'
import { TrendIcon } from '@/components/ui/TrendIcon'
import { PageLoading, PageError } from '@/components/ui/PageState'
import { useApplication } from '@/hooks/useApi'
import { formatDate, pillarLabel } from '@/lib/utils'

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-3 py-2 text-xs shadow-xl border"
      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>
      <p>{label}: <span className="font-bold">{payload[0].value.toFixed(1)}</span></p>
    </div>
  )
}

export function ApplicationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: app, isLoading, error, refetch } = useApplication(id ?? '')

  if (isLoading) return <><Header title="Aplicacao" /><PageLoading /></>
  if (error || !app) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header title="Aplicacao nao encontrada" />
        {error ? (
          <PageError message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p style={{ color: 'var(--color-muted-foreground)' }}>Aplicacao nao encontrada</p>
              <button onClick={() => navigate('/applications')} className="mt-4 text-indigo-500 text-sm">
                Voltar para lista
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const radarData = Object.entries(app.pillarScores).map(([pillar, data]) => ({
    pillar: pillarLabel(pillar).slice(0, 5),
    score: data.score,
  }))

  const allPassed = Object.values(app.pillarScores).reduce((s, p) => s + p.passedChecks, 0)
  const allTotal = Object.values(app.pillarScores).reduce((s, p) => s + p.totalChecks, 0)

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={app.name} subtitle={`${app.namespace} · ${app.kind} · ${app.squad}`} />

      <div className="flex-1 p-6 space-y-5">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate('/applications')}
          className="flex items-center gap-1.5 text-sm transition-colors hover:text-indigo-500"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          <ArrowLeft size={14} />
          Aplicacoes
        </button>

        {/* Hero row */}
        <div className="grid grid-cols-3 gap-4">
          {/* Score card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="flex items-center gap-5">
              <ScoreRing score={app.overallScore} size={96} strokeWidth={7} showLabel />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ScoreBadge score={app.overallScore} />
                  <TrendIcon trend={app.trend} />
                </div>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>
                  {app.overallScore.toFixed(1)}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                  Score geral de maturidade
                </p>
                <p className="text-xs mt-2" style={{ color: 'var(--color-muted-foreground)' }}>
                  {allPassed}/{allTotal} checks passaram
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Metadata */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="h-full">
              <CardTitle className="mb-3">Informacoes</CardTitle>
              <div className="space-y-2">
                {[
                  { icon: Server, label: 'Namespace', value: app.namespace },
                  { icon: Box, label: 'Tipo', value: app.kind },
                  { icon: Tag, label: 'Tier', value: app.tier },
                  { icon: User, label: 'Squad', value: app.squad },
                  { icon: Activity, label: 'Produto', value: app.product },
                  { icon: Clock, label: 'Avaliado', value: formatDate(app.lastEvaluated) },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    <Icon size={12} style={{ color: 'var(--color-muted-foreground)' }} />
                    <span style={{ color: 'var(--color-muted-foreground)' }}>{label}:</span>
                    <span className="font-medium" style={{ color: 'var(--color-foreground)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Issues + PR */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <Card>
              <CardTitle className="mb-3">Problemas</CardTitle>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg p-2.5 bg-red-500/10 text-center">
                  <p className="text-lg font-bold text-red-500">{app.issues.critical}</p>
                  <p className="text-[10px] text-red-400">Criticos</p>
                </div>
                <div className="rounded-lg p-2.5 bg-orange-500/10 text-center">
                  <p className="text-lg font-bold text-orange-500">{app.issues.errors}</p>
                  <p className="text-[10px] text-orange-400">Erros</p>
                </div>
                <div className="rounded-lg p-2.5 bg-yellow-500/10 text-center">
                  <p className="text-lg font-bold text-yellow-500">{app.issues.warnings}</p>
                  <p className="text-[10px] text-yellow-400">Avisos</p>
                </div>
              </div>
            </Card>

            {app.remediationPR && (
              <Card>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                    <GitPullRequest size={14} className="text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: 'var(--color-foreground)' }}>
                      PR #{app.remediationPR.prNumber} Aberto
                    </p>
                    <p className="text-[10px] mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>
                      {app.remediationPR.issuesFixed.length} issues para corrigir
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {app.remediationPR.issuesFixed.map(rule => (
                        <span key={rule} className="text-[10px] bg-indigo-500/10 text-indigo-500 rounded px-1.5 py-0.5">
                          {rule}
                        </span>
                      ))}
                    </div>
                  </div>
                  <a
                    href={app.remediationPR.prUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-500 hover:text-indigo-400 transition-colors flex-shrink-0"
                    onClick={e => e.stopPropagation()}
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>
              </Card>
            )}
          </motion.div>
        </div>

        {/* Scorecards + Radar row */}
        <div className="grid grid-cols-3 gap-4">
          {/* Pillar scorecards */}
          <motion.div
            className="col-span-2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield size={14} className="text-indigo-500" />
                  <CardTitle>Scorecard por Pilar</CardTitle>
                </div>
                <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                  Pesos: Resiliencia 30% | Seguranca 25% | Compliance 20% | Performance 15% | Operacional 10% | Custo 10%
                </span>
              </CardHeader>
              <div className="space-y-4">
                {Object.entries(app.pillarScores).map(([pillar, data], i) => (
                  <motion.div
                    key={pillar}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.06 }}
                  >
                    <PillarBar pillar={pillar} data={data} delay={0.35 + i * 0.07} />
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Radar */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="h-full flex flex-col">
              <CardTitle className="mb-3">Radar de Maturidade</CardTitle>
              <div className="flex-1 flex items-center justify-center">
                <RadarChart width={220} height={220} data={radarData}>
                  <PolarGrid stroke="var(--color-border)" />
                  <PolarAngleAxis dataKey="pillar" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} />
                  <Radar name="score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                </RadarChart>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Score history */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-indigo-500" />
                <CardTitle>Historico de Score - 14 dias</CardTitle>
              </div>
            </CardHeader>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={app.scoreHistory} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                  tickFormatter={d => d.slice(5)} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                  axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2}
                  dot={false} activeDot={{ r: 4, fill: '#6366f1' }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Findings */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-orange-500" />
                <CardTitle>Problemas Detectados ({app.findings.length})</CardTitle>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                <CheckCircle2 size={12} className="text-emerald-500" />
                {allPassed} checks OK
                <XCircle size={12} className="text-red-500 ml-1" />
                {allTotal - allPassed} falharam
              </div>
            </CardHeader>
            {app.findings.length === 0 ? (
              <div className="flex items-center gap-2 py-4 text-sm"
                style={{ color: 'var(--color-muted-foreground)' }}>
                <CheckCircle2 size={16} className="text-emerald-500" />
                Nenhum problema detectado. Excelente!
              </div>
            ) : (
              <div>
                {app.findings.map((f, i) => (
                  <motion.div
                    key={f.ruleId}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                  >
                    <FindingRow finding={f} />
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Cost & Efficiency */}
        {app.monthlyCostUsd && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <DollarSign size={14} className="text-emerald-500" />
                  <CardTitle>Custo e Eficiencia (CAST AI)</CardTitle>
                </div>
                <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                  Dados de rightsizing
                </span>
              </CardHeader>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Custo Mensal', value: `$${app.monthlyCostUsd?.toLocaleString()}`, sub: 'estimado', color: 'text-emerald-500' },
                  { label: 'Eficiencia CPU', value: `${app.cpuEfficiencyPct}%`, sub: 'utilizacao media', color: app.cpuEfficiencyPct! < 60 ? 'text-orange-500' : 'text-emerald-500' },
                  { label: 'Eficiencia Mem', value: `${app.memoryEfficiencyPct}%`, sub: 'utilizacao media', color: app.memoryEfficiencyPct! < 60 ? 'text-orange-500' : 'text-emerald-500' },
                  { label: 'Desperdicio', value: `$${app.wasteUsd?.toLocaleString()}`, sub: 'recursos ociosos', color: 'text-red-500' },
                ].map(item => (
                  <div key={item.label} className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-muted)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--color-muted-foreground)' }}>{item.label}</p>
                    <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>{item.sub}</p>
                  </div>
                ))}
              </div>
              {app.wasteUsd && app.wasteUsd > 200 && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <Info size={13} className="text-orange-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    Alto desperdicio detectado. Recomenda-se revisar os resource requests/limits.
                    Um PR de auto-remediacao pode ser criado automaticamente pelo Titlis Operator.
                  </p>
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}
