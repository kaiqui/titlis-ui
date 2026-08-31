import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Gauge, Sparkles, Wrench } from 'lucide-react'
import { motion } from 'motion/react'
import { Card } from '@/components/jeitto/Card'
import { fadeInUp } from '@/lib/motion/tokens'
import { EmptyState } from '@/components/jeitto/EmptyState'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { ScoreRing } from '@/components/jeitto/ScoreRing'
import { Header } from '@/components/layout/Header'
import { useHubRollup } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { formatNumber } from '@/lib/utils'
import { overallBand, postureBand, stripIcon } from '@/lib/posture'
import { useTimeRange } from '@/hooks/useTimeRange'
import type { EstateNode, PostureTrendPoint } from '@/types'

function tierWeight(tier: string | null | undefined): number {
  if (!tier) return 1
  const t = tier.toLowerCase()
  if (/1|high|crit/.test(t)) return 3
  if (/2|med/.test(t)) return 2
  return 1
}

function collectLeaves(node: EstateNode): EstateNode[] {
  if (node.kind === 'service') return [node]
  return node.children.flatMap(collectLeaves)
}

function weakestDim(node: EstateNode) {
  const withSignal = node.dimensions.filter((d) => d.band !== 'sem_sinal' && d.strength !== null)
  if (withSignal.length === 0) return null
  return withSignal.reduce((min, d) => ((d.strength ?? 100) < (min.strength ?? 100) ? d : min))
}

function Sparkline({ points }: { points: PostureTrendPoint[] }) {
  const vals = points.map((p) => p.trust).filter((v): v is number => v !== null)
  if (vals.length < 2) return null
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1
  const w = 140
  const h = 34
  const step = w / (vals.length - 1)
  const coords = vals.map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`).join(' ')
  const up = vals[vals.length - 1] >= vals[0]
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-label="tendência da postura">
      <polyline points={coords} fill="none" stroke={up ? '#16a34a' : '#ef4444'} strokeWidth={2} strokeLinejoin="round" />
    </svg>
  )
}

export function Reliability() {
  const { data: root, isLoading, isError, refetch } = useHubRollup()
  const { days } = useTimeRange()
  const { data: trend = [] } = useQuery({ queryKey: ['hub-trend', days], queryFn: () => api.hub.trend('', days), staleTime: 60_000 })
  const [dimFilter, setDimFilter] = useState<string | null>(null)

  const leaves = useMemo(() => (root ? collectLeaves(root) : []), [root])
  const ranked = useMemo(() => {
    const withRisk = leaves.map((l) => {
      const weak = weakestDim(l)
      const lift = l.topMoves.reduce((s, m) => s + m.totalLift, 0)
      return { leaf: l, risk: (100 - (l.trustScore ?? 0)) * tierWeight(l.tier), weak, lift }
    })
    const filtered = dimFilter
      ? withRisk.filter((r) => r.leaf.dimensions.some((d) => d.dimension === dimFilter && (d.band === 'fragil' || d.band === 'exposto')))
      : withRisk
    return filtered.sort((a, b) => b.risk - a.risk).slice(0, 40)
  }, [leaves, dimFilter])

  if (isLoading) return <><Header timeRange title="Confiabilidade" /><PageLoading /></>
  if (isError) return <><Header timeRange title="Confiabilidade" /><PageError message="Falha ao carregar." onRetry={() => refetch()} /></>
  if (!root || root.serviceCount === 0) {
    return (
      <>
        <Header timeRange title="Confiabilidade" subtitle="Onde a postura dói mais — e o que consertar primeiro." />
        <EmptyState icon={Gauge} title="Sem serviços avaliados" description="Conecte Datadog e GitHub em Integrações e rode a coleta." />
      </>
    )
  }

  const band = postureBand(overallBand(root.postureWeighted))

  return (
    <div className="flex min-h-screen flex-col" data-testid="reliability-view">
      <Header timeRange title="Confiabilidade" subtitle="Onde a postura dói mais — e o que consertar primeiro." />
      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">
        <Card className="p-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <ScoreRing score={root.postureWeighted} size={88} strokeWidth={8} showFraction />
              <div>
                <p className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full px-3 py-1 text-sm font-bold" style={{ color: band.color, backgroundColor: 'var(--color-muted)' }}>
                    {formatNumber(root.postureWeighted)} · {band.label}
                  </span>
                </p>
                <p className="mt-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                  índice ponderado por tier · pior {formatNumber(root.postureWorst)} · confiança {root.confidencePct}% · {root.serviceCount} serviços
                </p>
              </div>
            </div>
            <Sparkline points={trend} />
          </div>
        </Card>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {root.dimensions.map((d) => {
            const dband = postureBand(d.band)
            const active = dimFilter === d.dimension
            return (
              <button
                key={d.dimension}
                type="button"
                onClick={() => setDimFilter(active ? null : d.dimension)}
                className="rounded-xl border p-3 text-left transition-colors"
                style={{ borderColor: active ? dband.color : 'var(--color-border)', backgroundColor: active ? 'var(--color-muted)' : 'transparent' }}
              >
                <p className="truncate text-xs font-semibold">{d.label}</p>
                <p className="mt-1 text-lg font-black" style={{ color: dband.color }}>{d.strength === null ? 'n/a' : Math.round(d.strength)}</p>
                <p className="text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>
                  {d.fragileCount} frágei{d.fragileCount === 1 ? 's' : 's'}
                </p>
              </button>
            )
          })}
        </div>

        {root.topMoves.length > 0 && (
          <Card className="p-5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
              Oportunidades — o que move o ponteiro do estate
            </p>
            <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {root.topMoves.map((m, i) => (
                <div key={m.code} className="flex items-baseline gap-3 py-2 text-sm">
                  <span className="font-mono text-xs" style={{ color: 'var(--color-primary)' }}>{String(i + 1).padStart(2, '0')}</span>
                  <span className="min-w-0">{stripIcon(m.description)}</span>
                  <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px]" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                    {m.serviceCount} serviço{m.serviceCount === 1 ? '' : 's'}
                  </span>
                  {m.isRemediable && (
                    <Link to="/aria" className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium" style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>
                      <Wrench size={10} />ARIA
                    </Link>
                  )}
                  <span className="ml-auto shrink-0 font-mono text-xs" style={{ color: '#16a34a' }}>+{Math.round(m.totalLift / Math.max(1, m.serviceCount))}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-black tracking-tight">Serviços por risco ponderado</p>
            {dimFilter && (
              <button type="button" onClick={() => setDimFilter(null)} className="text-xs" style={{ color: 'var(--color-primary)' }}>
                limpar filtro
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="reliability-ranking">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide" style={{ color: 'var(--color-muted-foreground)' }}>
                  <th className="pb-2 pr-4 font-semibold">Serviço</th>
                  <th className="pb-2 pr-4 font-semibold">Postura</th>
                  <th className="pb-2 pr-4 font-semibold">Dimensão frágil</th>
                  <th className="pb-2 pr-4 font-semibold">Lift</th>
                  <th className="pb-2 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {ranked.map(({ leaf, weak, lift }, i) => {
                  const lband = postureBand(overallBand(leaf.trustScore ?? null))
                  return (
                    <motion.tr key={leaf.path} {...fadeInUp} transition={{ ...fadeInUp.transition, delay: Math.min(i * 0.01, 0.15) }} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                      <td className="py-2 pr-4 font-medium">
                        {leaf.workloadUid ? (
                          <Link to={`/coverage/${encodeURIComponent(leaf.workloadUid)}`} className="hover:underline">{leaf.name}</Link>
                        ) : leaf.name}
                        {leaf.tier && <span className="ml-2 text-[10px]" style={{ color: 'var(--color-muted-foreground)' }}>tier {leaf.tier}</span>}
                      </td>
                      <td className="py-2 pr-4">
                        <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ color: lband.color, backgroundColor: 'var(--color-muted)' }}>
                          {formatNumber(leaf.trustScore ?? null)} · {lband.label}
                        </span>
                      </td>
                      <td className="py-2 pr-4" style={{ color: 'var(--color-muted-foreground)' }}>{weak ? weak.label : 'sinal insuficiente'}</td>
                      <td className="py-2 pr-4 font-mono text-xs" style={{ color: '#16a34a' }}>{lift > 0 ? `+${Math.round(lift)}` : '—'}</td>
                      <td className="py-2">
                        <Link to="/aria" className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--color-primary)' }}>
                          <Sparkles size={12} />ARIA
                        </Link>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {ranked.length === 0 && <p className="mt-3 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Nenhum serviço nesse filtro.</p>}
        </Card>
      </div>
    </div>
  )
}

export default Reliability
