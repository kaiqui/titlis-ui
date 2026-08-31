import { useMemo, type ReactNode } from 'react'
import { motion } from 'motion/react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BarChart3, CheckCircle2, Clock, GitMerge, GitPullRequest, Layers, PieChart, RotateCcw, Sparkles } from 'lucide-react'
import { ButtonDefault } from '@/components/jeitto/ButtonDefault'
import { Card } from '@/components/jeitto/Card'
import { EmptyState } from '@/components/jeitto/EmptyState'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { Header } from '@/components/layout/Header'
import { SummaryStrip } from '@/components/sre/SummaryStrip'
import { useRemediationHistory } from '@/hooks/useApi'
import { useTimeRange } from '@/hooks/useTimeRange'
import { formatEnvironment, formatNumber } from '@/lib/utils'
import type { RemediationTimelineItem } from '@/lib/api'

// Paleta categórica validada (CVD-safe) para status/ambiente — ver skill dataviz.
// prod=vermelho · staging=âmbar · dev=azul · test/qa=verde · uat=roxo

const ENV_TEXT: Record<string, string> = {
  prd:         '#ef4444',
  prod:        '#ef4444',
  production:  '#ef4444',
  hml:         '#d97706',
  homolog:     '#d97706',
  staging:     '#d97706',
  stg:         '#d97706',
  dev:         '#3b82f6',
  development: '#3b82f6',
  tst:         '#059669',
  test:        '#059669',
  qa:          '#059669',
  uat:         '#a855f7',
}

const STATUS_COLORS = { merged: '#059669', inProgress: 'var(--color-primary)', failed: '#ef4444' }

function getMondayKey(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setUTCDate(d.getUTCDate() + diff)
  return monday.toISOString().split('T')[0]
}

function formatWeekLabel(isoDate: string): string {
  const [, month, day] = isoDate.split('-')
  return `${day}/${month}`
}

function avgMergeHours(items: RemediationTimelineItem[]): number | null {
  const merged = items.filter(i => i.status === 'PR_MERGED' && i.resolved_at)
  if (!merged.length) return null
  const total = merged.reduce((sum, i) => {
    return sum + (new Date(i.resolved_at!).getTime() - new Date(i.triggered_at).getTime())
  }, 0)
  return total / merged.length / 3_600_000
}

function formatDuration(hours: number | null): string {
  if (hours === null) return '—'
  if (hours < 24) return `${Math.round(hours)}h`
  return `${Math.round(hours / 24)}d`
}

interface ChartEmptyOverlayProps {
  icon: typeof BarChart3
  title: string
  description: string
  skeleton: ReactNode
}

function ChartEmptyOverlay({ icon: Icon, title, description, skeleton }: ChartEmptyOverlayProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ minHeight: 176 }}>
      <div className="pointer-events-none select-none opacity-[0.35] blur-[1.5px]" aria-hidden="true">
        {skeleton}
      </div>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl px-6 text-center"
        style={{ background: 'linear-gradient(180deg, transparent 0%, var(--color-card) 55%)' }}
      >
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: 'var(--color-muted)' }}
        >
          <Icon size={16} style={{ color: 'var(--color-muted-foreground)' }} />
        </div>
        <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>
          {title}
        </p>
        <p className="max-w-[26rem] text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
          {description}
        </p>
      </div>
    </div>
  )
}

const FAKE_BAR_ROW_STYLE = { backgroundColor: 'var(--color-muted)' } as const
const FAKE_FILL_STYLE = { backgroundColor: 'var(--color-border)' } as const

function RingSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="flex flex-col items-center gap-2 rounded-2xl px-3 py-4" style={FAKE_BAR_ROW_STYLE}>
          <div className="h-16 w-16 rounded-full" style={{ border: '6px solid var(--color-border)' }} />
          <span className="h-2.5 w-14 rounded-full" style={FAKE_FILL_STYLE} />
          <span className="h-2 w-8 rounded-full" style={FAKE_FILL_STYLE} />
        </div>
      ))}
    </div>
  )
}

const StatusSkeleton = () => <RingSkeleton count={3} />
const EnvSkeleton = () => <RingSkeleton count={3} />
const NamespaceSkeleton = () => <RingSkeleton count={4} />

/** Anel de progresso SVG animado — usado em todo card de métrica desta página. */
function ProgressRing({ pct, color, size = 64, strokeWidth = 6, children }: { pct: number; color: string; size?: number; strokeWidth?: number; children: ReactNode }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, pct))
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-border)" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}

/** Card de métrica com anel de progresso — usado por status, ambiente e namespace. */
interface RingMetric {
  key: string
  label: ReactNode
  value: number
  pct: number
  color: string
  icon?: typeof CheckCircle2
  rank?: number
}

function MetricRingGrid({ metrics, columnsClassName = 'grid-cols-2 sm:grid-cols-3' }: { metrics: RingMetric[]; columnsClassName?: string }) {
  return (
    <div className={`grid gap-3 ${columnsClassName}`}>
      {metrics.map(metric => (
        <div
          key={metric.key}
          className="relative flex flex-col items-center gap-2 rounded-2xl px-3 py-4 text-center"
          style={{ backgroundColor: 'var(--color-muted)' }}
        >
          {metric.rank !== undefined && (
            <span
              className="absolute left-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-black tabular-nums"
              style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-muted-foreground)' }}
            >
              {metric.rank}
            </span>
          )}
          <ProgressRing pct={metric.pct} color={metric.color} size={64}>
            <span className="text-sm font-black tabular-nums" style={{ color: metric.color }}>
              {metric.value}
            </span>
          </ProgressRing>
          <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--color-foreground)' }}>
            {metric.icon && <metric.icon size={12} style={{ color: metric.color }} />}
            <span className="max-w-[6.5rem] truncate">{metric.label}</span>
          </div>
          <span className="text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>
            {formatNumber(metric.pct)}%
          </span>
        </div>
      ))}
    </div>
  )
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; name: string; color: string }>
  label?: string
}

function ChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-2xl px-4 py-3 text-sm shadow-lg"
      style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
    >
      <p className="font-semibold mb-1.5">Semana de {label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name === 'opened' ? 'PRs abertos' : 'Merged'}: <span className="font-black">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

export function RemediationHistory({ standalone = true }: { standalone?: boolean }) {
  const { days } = useTimeRange()
  const { data, isLoading, error, refetch } = useRemediationHistory(days)

  const items: RemediationTimelineItem[] = data?.items ?? []

  const avgHours = useMemo(() => avgMergeHours(items), [items])

  const weeklyData = useMemo(() => {
    const map: Record<string, { week: string; label: string; opened: number; merged: number }> = {}
    items.forEach(item => {
      const key = getMondayKey(item.triggered_at)
      if (!map[key]) map[key] = { week: key, label: formatWeekLabel(key), opened: 0, merged: 0 }
      map[key].opened++
      if (item.status === 'PR_MERGED') map[key].merged++
    })
    return Object.values(map).sort((a, b) => a.week.localeCompare(b.week))
  }, [items])

  const byEnv = useMemo(() => {
    const map: Record<string, number> = {}
    items.forEach(i => {
      const key = (i.environment ?? 'unknown').toLowerCase()
      map[key] = (map[key] ?? 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [items])

  const byNamespace = useMemo(() => {
    const map: Record<string, number> = {}
    items.forEach(i => {
      map[i.namespace] = (map[i.namespace] ?? 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [items])

  if (isLoading) return standalone ? <><Header title="Impacto de Remediação" /><PageLoading /></> : <PageLoading />
  if (error || !data) {
    return standalone
      ? <><Header title="Impacto de Remediação" /><PageError message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} /></>
      : <PageError message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
  }

  const { summary } = data
  const inProgress = summary.total_prs - summary.merged - summary.failed

  return (
    <div className={standalone ? 'flex min-h-screen flex-col' : 'flex flex-col'}>
      {standalone && (
        <Header
          title="Impacto de Remediação"
          subtitle="Visão executiva do valor gerado pela ARIA — compliance resolvido, velocidade e cobertura da plataforma."
        />
      )}

      <div className="flex-1 space-y-6 px-4 py-6 lg:px-8">

        {/* ── controles ── */}
        <div className="flex flex-wrap items-center gap-2">
          <ButtonDefault visual="ghost" label="Atualizar" icon={RotateCcw} onClick={() => void refetch()} />
        </div>

        {items.length === 0 ? (
          <Card>
            <EmptyState
              icon={GitPullRequest}
              title="Nenhuma remediação neste período"
              description="A ARIA ainda não abriu PRs neste intervalo de tempo."
            />
          </Card>
        ) : (
          <>
            {/* ── callout de destaque ── */}
            {summary.success_rate !== null && summary.success_rate >= 60 && (
              <div
                className="flex items-center gap-3 rounded-3xl px-5 py-4"
                style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(16,185,129,0.07) 100%)', border: '1px solid rgba(99,102,241,0.2)' }}
              >
                <Sparkles size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                <p className="text-sm" style={{ color: 'var(--color-foreground)' }}>
                  Nos últimos <span className="font-black">{days} dias</span>, a ARIA resolveu{' '}
                  <span className="font-black">{summary.merged}</span> problema{summary.merged !== 1 ? 's' : ''} de compliance
                  {summary.success_rate !== null && (
                    <> com uma taxa de sucesso de <span className="font-black">{formatNumber(summary.success_rate)}%</span></>
                  )}.
                  {avgHours !== null && avgHours < 72 && (
                    <> Em média, cada PR foi mergeado em <span className="font-black">{formatDuration(avgHours)}</span>.</>
                  )}
                </p>
              </div>
            )}

            {/* ── KPIs ── */}
            <SummaryStrip
              items={[
                {
                  label: 'PRs abertos pela ARIA',
                  value: summary.total_prs,
                  helper: `últimos ${days} dias`,
                },
                {
                  label: 'Merged',
                  value: summary.merged,
                  helper: 'problemas resolvidos',
                },
                {
                  label: 'Taxa de sucesso',
                  value: summary.success_rate !== null ? `${formatNumber(summary.success_rate)}%` : '—',
                  helper: 'merged / (merged + falhou)',
                },
                {
                  label: 'Tempo médio de merge',
                  value: formatDuration(avgHours),
                  helper: avgHours !== null ? 'entre abertura e merge' : 'nenhum PR mergeado',
                },
              ]}
            />

            {/* ── tendência semanal ── */}
            {weeklyData.length >= 2 && (
              <Card>
                <div className="mb-5 flex items-center gap-2">
                  <GitMerge size={16} style={{ color: 'var(--color-primary)' }} />
                  <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>Tendência semanal</p>
                  <span className="ml-auto text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                    PRs abertos vs merged por semana
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={weeklyData} barCategoryGap="30%" barGap={3}>
                    <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
                    <Bar dataKey="opened" name="opened" fill="rgba(99,102,241,0.35)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="merged" name="merged" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 flex items-center gap-5 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'rgba(99,102,241,0.5)' }} />
                    PRs abertos
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: '#10b981' }} />
                    Merged
                  </span>
                </div>
              </Card>
            )}

            {/* ── status + ambiente ── */}
            <div className="grid gap-5 lg:grid-cols-2">

              {/* status breakdown */}
              <Card>
                <p className="mb-4 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>
                  Distribuição por status
                </p>
                {(() => {
                  const statusRows: RingMetric[] = [
                    { key: 'merged', label: 'Merged', value: summary.merged, pct: summary.total_prs > 0 ? (summary.merged / summary.total_prs) * 100 : 0, color: STATUS_COLORS.merged, icon: CheckCircle2 },
                    { key: 'in_progress', label: 'Em andamento', value: inProgress, pct: summary.total_prs > 0 ? (inProgress / summary.total_prs) * 100 : 0, color: STATUS_COLORS.inProgress, icon: Clock },
                    { key: 'failed', label: 'Falhou / Fechado', value: summary.failed, pct: summary.total_prs > 0 ? (summary.failed / summary.total_prs) * 100 : 0, color: STATUS_COLORS.failed, icon: GitPullRequest },
                  ].filter(r => r.value > 0)

                  if (statusRows.length === 0) {
                    return (
                      <ChartEmptyOverlay
                        icon={PieChart}
                        title="Nenhum status para exibir"
                        description="Assim que a ARIA abrir remediações neste período, a distribuição por status aparece aqui."
                        skeleton={<StatusSkeleton />}
                      />
                    )
                  }

                  return <MetricRingGrid metrics={statusRows} />
                })()}
              </Card>

              {/* ambiente breakdown */}
              <Card>
                <p className="mb-4 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>
                  Distribuição por ambiente
                </p>
                {byEnv.length === 0 ? (
                  <ChartEmptyOverlay
                    icon={BarChart3}
                    title="Nenhum dado de ambiente"
                    description="Os workloads remediados ainda não têm ambiente identificado neste período."
                    skeleton={<EnvSkeleton />}
                  />
                ) : (
                  <MetricRingGrid
                    metrics={byEnv.map(([env, count]) => ({
                      key: env,
                      value: count,
                      pct: summary.total_prs > 0 ? (count / summary.total_prs) * 100 : 0,
                      color: ENV_TEXT[env] ?? 'var(--color-primary)',
                      label: formatEnvironment(env),
                    }))}
                  />
                )}
              </Card>
            </div>

            {/* ── cobertura por namespace ── */}
            <Card>
              <p className="mb-5 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>
                Cobertura por namespace
                <span className="ml-2 text-xs font-normal" style={{ color: 'var(--color-muted-foreground)' }}>
                  namespaces atendidos pela ARIA
                </span>
              </p>
              {byNamespace.length === 0 ? (
                <ChartEmptyOverlay
                  icon={Layers}
                  title="Nenhum namespace coberto ainda"
                  description="Quando a ARIA remediar workloads neste período, o ranking de namespaces atendidos aparece aqui."
                  skeleton={<NamespaceSkeleton />}
                />
              ) : (
                <MetricRingGrid
                  columnsClassName="grid-cols-2 sm:grid-cols-4"
                  metrics={byNamespace.map(([ns, count], idx) => ({
                    key: ns,
                    value: count,
                    pct: summary.total_prs > 0 ? (count / summary.total_prs) * 100 : 0,
                    color: 'var(--color-primary)',
                    rank: idx + 1,
                    label: <span className="font-mono">{ns}</span>,
                  }))}
                />
              )}
            </Card>

          </>
        )}
      </div>
    </div>
  )
}
