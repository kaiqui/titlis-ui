import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CheckCircle2, Clock, GitMerge, GitPullRequest, RotateCcw, Sparkles } from 'lucide-react'
import { ButtonDefault } from '@/components/jeitto/ButtonDefault'
import { Card } from '@/components/jeitto/Card'
import { EmptyState } from '@/components/jeitto/EmptyState'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { Header } from '@/components/layout/Header'
import { SummaryStrip } from '@/components/sre/SummaryStrip'
import { useRemediationHistory } from '@/hooks/useApi'
import { formatEnvironment, formatNumber } from '@/lib/utils'
import type { RemediationTimelineItem } from '@/lib/api'

const PERIOD_OPTIONS = [
  { id: 30,  label: '30 dias' },
  { id: 90,  label: '90 dias' },
]

const ENV_COLORS: Record<string, string> = {
  prd:         'rgba(239,68,68,0.15)',
  prod:        'rgba(239,68,68,0.15)',
  production:  'rgba(239,68,68,0.15)',
  hml:         'rgba(245,158,11,0.15)',
  homolog:     'rgba(245,158,11,0.15)',
  staging:     'rgba(245,158,11,0.15)',
  stg:         'rgba(245,158,11,0.15)',
  dev:         'rgba(99,102,241,0.15)',
  development: 'rgba(99,102,241,0.15)',
  tst:         'rgba(16,185,129,0.15)',
  test:        'rgba(16,185,129,0.15)',
  qa:          'rgba(16,185,129,0.15)',
  uat:         'rgba(168,85,247,0.15)',
}

const ENV_TEXT: Record<string, string> = {
  prd:         '#ef4444',
  prod:        '#ef4444',
  production:  '#ef4444',
  hml:         '#d97706',
  homolog:     '#d97706',
  staging:     '#d97706',
  stg:         '#d97706',
  dev:         'var(--color-primary)',
  development: 'var(--color-primary)',
  tst:         '#10b981',
  test:        '#10b981',
  qa:          '#10b981',
  uat:         '#a855f7',
}

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
  const [days, setDays] = useState(90)
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

  const maxNs = byNamespace[0]?.[1] ?? 1

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
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setDays(opt.id)}
              className="rounded-full px-4 py-1.5 text-sm font-semibold transition-all"
              style={
                days === opt.id
                  ? { backgroundColor: 'var(--color-primary)', color: '#fff' }
                  : { backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }
              }
            >
              {opt.label}
            </button>
          ))}
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
                <div className="space-y-3">
                  {[
                    { label: 'Merged', count: summary.merged, color: '#10b981', icon: CheckCircle2 },
                    { label: 'Em andamento', count: inProgress, color: 'var(--color-primary)', icon: Clock },
                    { label: 'Falhou / Fechado', count: summary.failed, color: '#ef4444', icon: GitPullRequest },
                  ]
                    .filter(r => r.count > 0)
                    .map(row => (
                      <div key={row.label}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 font-semibold" style={{ color: 'var(--color-foreground)' }}>
                            <row.icon size={12} style={{ color: row.color }} />
                            {row.label}
                          </span>
                          <span style={{ color: 'var(--color-muted-foreground)' }}>
                            {row.count} · {formatNumber((row.count / summary.total_prs) * 100)}%
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--color-muted)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${(row.count / summary.total_prs) * 100}%`, backgroundColor: row.color }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </Card>

              {/* ambiente breakdown */}
              <Card>
                <p className="mb-4 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>
                  Distribuição por ambiente
                </p>
                {byEnv.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Sem dados de ambiente.</p>
                ) : (
                  <div className="space-y-3">
                    {byEnv.map(([env, count]) => (
                      <div key={env}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span
                            className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                            style={{ backgroundColor: ENV_COLORS[env] ?? 'var(--color-muted)', color: ENV_TEXT[env] ?? 'var(--color-muted-foreground)' }}
                          >
                            {formatEnvironment(env)}
                          </span>
                          <span style={{ color: 'var(--color-muted-foreground)' }}>
                            {count} PR{count !== 1 ? 's' : ''} · {formatNumber((count / summary.total_prs) * 100)}%
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--color-muted)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${(count / summary.total_prs) * 100}%`, backgroundColor: ENV_TEXT[env] ?? 'var(--color-primary)' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* ── cobertura por namespace ── */}
            {byNamespace.length > 0 && (
              <Card>
                <p className="mb-5 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>
                  Cobertura por namespace
                  <span className="ml-2 text-xs font-normal" style={{ color: 'var(--color-muted-foreground)' }}>
                    namespaces atendidos pela ARIA
                  </span>
                </p>
                <div className="space-y-3">
                  {byNamespace.map(([ns, count], idx) => (
                    <div key={ns} className="flex items-center gap-3">
                      <span
                        className="w-5 shrink-0 text-center text-[11px] font-black tabular-nums"
                        style={{ color: 'var(--color-muted-foreground)' }}
                      >
                        {idx + 1}
                      </span>
                      <span className="w-36 shrink-0 truncate font-mono text-xs font-semibold" style={{ color: 'var(--color-foreground)' }}>
                        {ns}
                      </span>
                      <div className="flex-1">
                        <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--color-muted)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${(count / maxNs) * 100}%`, background: 'linear-gradient(90deg, var(--color-primary) 0%, rgba(99,102,241,0.5) 100%)' }}
                          />
                        </div>
                      </div>
                      <span className="w-14 text-right text-xs font-semibold tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
                        {count} PR{count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

          </>
        )}
      </div>
    </div>
  )
}
