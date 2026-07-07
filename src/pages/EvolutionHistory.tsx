import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowDownRight, ArrowUpRight, LineChart as LineChartIcon, Minus, RotateCcw, Sparkles, TrendingUp, Wrench } from 'lucide-react'
import { ButtonDefault } from '@/components/jeitto/ButtonDefault'
import { Card } from '@/components/jeitto/Card'
import { EmptyState } from '@/components/jeitto/EmptyState'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { Header } from '@/components/layout/Header'
import { SummaryStrip } from '@/components/sre/SummaryStrip'
import { useReliabilityEvolution, useReliabilityTree } from '@/hooks/useApi'
import { formatNumber } from '@/lib/utils'
import type { ReliabilityMover, ReliabilityNode } from '@/types'

const PERIOD_OPTIONS = [
  { id: 7, label: '7 dias' },
  { id: 30, label: '30 dias' },
  { id: 90, label: '90 dias' },
  { id: 180, label: '180 dias' },
]

const KIND_LABEL: Record<string, string> = {
  estate: 'Hub', product: 'Produto', team: 'Time', service: 'Serviço',
  workload: 'Workload', queue: 'Fila',
}

const PILLAR_LABEL: Record<string, string> = {
  resilience: 'Resiliência', security: 'Segurança', performance: 'Performance',
  operational: 'Operacional', cost: 'Custo', compliance: 'Compliance',
  observability: 'Observabilidade', coverage: 'Cobertura',
}

const SEVERITY_LABEL: Record<string, string> = {
  critical: 'Crítica', error: 'Erro', warning: 'Aviso', info: 'Info',
}

function formatDayLabel(isoDate: string): string {
  return `${isoDate.slice(8, 10)}/${isoDate.slice(5, 7)}`
}

interface ChartPoint {
  label: string
  ri?: number
  proj?: number
  isToday?: boolean
}

// Continua a série a partir de hoje numa rampa linear até o RI potencial —
// a projeção assume os findings remediáveis resolvidos ao longo do horizonte.
function buildChartData(
  trend: { date: string; ri: number }[],
  potentialRi: number | null,
  days: number,
): { data: ChartPoint[]; todayLabel: string | null } {
  const data: ChartPoint[] = trend.map((p) => ({ label: formatDayLabel(p.date), ri: p.ri }))
  if (trend.length === 0) return { data, todayLabel: null }

  const last = trend[trend.length - 1]
  const todayLabel = formatDayLabel(last.date)
  data[data.length - 1].isToday = true

  if (potentialRi != null && potentialRi > last.ri + 0.05) {
    const horizon = Math.min(Math.max(Math.round(days / 3), 7), 30)
    data[data.length - 1].proj = last.ri
    const base = new Date(`${last.date}T00:00:00Z`)
    for (let i = 1; i <= horizon; i++) {
      const d = new Date(base)
      d.setUTCDate(base.getUTCDate() + i)
      data.push({
        label: formatDayLabel(d.toISOString().slice(0, 10)),
        proj: last.ri + ((potentialRi - last.ri) * i) / horizon,
      })
    }
  }
  return { data, todayLabel }
}

interface EvolutionTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string }>
  label?: string
}

function EvolutionTooltip({ active, payload, label }: EvolutionTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-2xl px-4 py-3 text-sm shadow-lg"
      style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
    >
      <p className="mb-1 font-semibold">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: 'var(--color-muted-foreground)' }}>
          {p.dataKey === 'ri' ? 'RI' : 'RI projetado'}: <span className="font-black" style={{ color: 'var(--color-foreground)' }}>{formatNumber(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta == null) return <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>—</span>
  const stable = Math.abs(delta) < 0.05
  const color = stable ? 'var(--color-muted-foreground)' : delta > 0 ? '#10b981' : '#ef4444'
  const Icon = stable ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <span className="flex items-center gap-1 text-xs font-black tabular-nums" style={{ color }}>
      <Icon size={13} />
      {stable ? 'estável' : `${delta > 0 ? '+' : ''}${formatNumber(delta)}`}
    </span>
  )
}

function MoverRow({ mover }: { mover: ReliabilityMover }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border px-4 py-2.5" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>{mover.name}</p>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
            {KIND_LABEL[mover.kind] ?? mover.kind}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
          {mover.riStart != null && mover.riEnd != null
            ? `RI ${formatNumber(mover.riStart)} → ${formatNumber(mover.riEnd)}`
            : 'sem série no período'}
        </p>
      </div>
      <DeltaBadge delta={mover.delta} />
    </div>
  )
}

function ScopeSelect({ label, value, options, onChange }: {
  label: string
  value: string
  options: ReliabilityNode[]
  onChange: (path: string) => void
}) {
  return (
    <label className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={options.length === 0}
        className="rounded-xl border px-3 py-1.5 text-sm font-semibold outline-none disabled:opacity-50"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }}
      >
        <option value="">Todos</option>
        {options.map((o) => (
          <option key={o.path} value={o.path}>{o.name}</option>
        ))}
      </select>
    </label>
  )
}

function findByPath(node: ReliabilityNode, path: string): ReliabilityNode | null {
  if (node.path === path) return node
  for (const c of node.children) {
    const f = findByPath(c, path)
    if (f) return f
  }
  return null
}

export function EvolutionHistory({ standalone = true }: { standalone?: boolean }) {
  const [days, setDays] = useState(90)
  const [productPath, setProductPath] = useState('')
  const [teamPath, setTeamPath] = useState('')
  const [servicePath, setServicePath] = useState('')

  const treeQuery = useReliabilityTree()
  const root = servicePath || teamPath || productPath
  const { data, isLoading, error, refetch } = useReliabilityEvolution(root, days)

  const tree = treeQuery.data ?? null
  const products = useMemo(() => (tree?.children ?? []).filter((c) => c.kind === 'product'), [tree])
  const teams = useMemo(() => {
    if (!tree || !productPath) return []
    return (findByPath(tree, productPath)?.children ?? []).filter((c) => c.kind === 'team')
  }, [tree, productPath])
  const services = useMemo(() => {
    if (!tree || !teamPath) return []
    return (findByPath(tree, teamPath)?.children ?? []).filter((c) => c.kind === 'service')
  }, [tree, teamPath])

  const trend = useMemo(() => data?.trend ?? [], [data])
  const projection = data?.projection ?? null
  const { data: chartData, todayLabel } = useMemo(
    () => buildChartData(trend, projection?.potentialRi ?? null, days),
    [trend, projection?.potentialRi, days],
  )

  const periodDelta = useMemo(() => {
    if (trend.length < 2) return null
    return trend[trend.length - 1].ri - trend[0].ri
  }, [trend])

  const risers = useMemo(
    () => (data?.movers ?? []).filter((m) => (m.delta ?? 0) > 0.05).slice(0, 6),
    [data],
  )
  const fallers = useMemo(
    () => (data?.movers ?? []).filter((m) => (m.delta ?? 0) < -0.05).sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0)).slice(0, 6),
    [data],
  )

  if (isLoading || treeQuery.isLoading) {
    return standalone ? <><Header title="Histórico & Evolução" /><PageLoading /></> : <PageLoading />
  }
  if (error) {
    const msg = error instanceof Error ? error.message : undefined
    return standalone
      ? <><Header title="Histórico & Evolução" /><PageError message={msg} onRetry={() => void refetch()} /></>
      : <PageError message={msg} onRetry={() => void refetch()} />
  }

  const current = data?.current ?? null
  const scopeName = current ? (current.kind === 'estate' ? 'todo o hub' : current.name) : 'todo o hub'
  const potentialRi = projection?.potentialRi ?? null
  const currentRi = current?.ri ?? null
  const potentialGain = potentialRi != null && currentRi != null ? potentialRi - currentRi : null
  const openFindings = (projection?.opportunities ?? []).reduce((sum, o) => sum + o.occurrences, 0)
  const remediableFindings = (projection?.opportunities ?? []).filter((o) => o.remediable).reduce((sum, o) => sum + o.occurrences, 0)

  return (
    <div className={standalone ? 'flex min-h-screen flex-col' : 'flex flex-col'}>
      {standalone && (
        <Header
          title="Histórico & Evolução"
          subtitle="Evolução da confiabilidade por hub, produto, time e serviço — e para onde ela vai se os findings forem resolvidos."
        />
      )}

      <div className="flex-1 space-y-6 px-4 py-6 lg:px-8">

        {/* ── filtros ── */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <ScopeSelect
            label="Produto"
            value={productPath}
            options={products}
            onChange={(p) => { setProductPath(p); setTeamPath(''); setServicePath('') }}
          />
          <ScopeSelect
            label="Time"
            value={teamPath}
            options={teams}
            onChange={(p) => { setTeamPath(p); setServicePath('') }}
          />
          <ScopeSelect
            label="Serviço"
            value={servicePath}
            options={services}
            onChange={setServicePath}
          />
          <span className="h-6 w-px" style={{ backgroundColor: 'var(--color-border)' }} />
          {PERIOD_OPTIONS.map((opt) => (
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

        {!data || !current ? (
          <Card>
            <EmptyState
              icon={LineChartIcon}
              title="Sem dados de evolução"
              description="Assim que o operator enviar avaliações de score, a série histórica começa a acumular aqui."
            />
          </Card>
        ) : (
          <>
            {/* ── narrativa executiva ── */}
            {potentialGain != null && potentialGain > 0.05 && currentRi != null && (
              <div
                className="flex items-center gap-3 rounded-3xl px-5 py-4"
                style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(16,185,129,0.07) 100%)', border: '1px solid rgba(99,102,241,0.2)' }}
              >
                <Sparkles size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                <p className="text-sm" style={{ color: 'var(--color-foreground)' }}>
                  Resolvendo os <span className="font-black">{remediableFindings}</span> finding{remediableFindings !== 1 ? 's' : ''} remediáve{remediableFindings !== 1 ? 'is' : 'l'} abertos,
                  a confiabilidade de <span className="font-black">{scopeName}</span> sobe de{' '}
                  <span className="font-black">{formatNumber(currentRi)}</span> para{' '}
                  <span className="font-black">{formatNumber(potentialRi!)}</span>{' '}
                  (<span className="font-black" style={{ color: '#10b981' }}>+{formatNumber(potentialGain)} pts</span>).
                </p>
              </div>
            )}

            {/* ── KPIs ── */}
            <SummaryStrip
              items={[
                {
                  label: 'RI atual',
                  value: currentRi != null ? formatNumber(currentRi) : 'N/D',
                  helper: KIND_LABEL[current.kind] ?? current.kind,
                  info: 'Índice de Confiabilidade (0–100) do escopo selecionado hoje.',
                },
                {
                  label: 'Variação no período',
                  value: periodDelta != null ? `${periodDelta > 0 ? '+' : ''}${formatNumber(periodDelta)}` : '—',
                  helper: `últimos ${days} dias`,
                  info: 'Diferença entre o RI de hoje e o primeiro dia da série no período.',
                },
                {
                  label: 'RI potencial',
                  value: potentialRi != null ? formatNumber(potentialRi) : '—',
                  helper: 'se findings remediáveis forem resolvidos',
                  info: 'Projeção determinística: RI resultante se todos os findings remediáveis abertos hoje forem corrigidos. Sem IA — só as regras.',
                },
                {
                  label: 'Débito remediável',
                  value: projection ? formatNumber(projection.remediableDebt) : '—',
                  helper: projection && projection.totalDebt > 0
                    ? `${Math.round((projection.remediableDebt / projection.totalDebt) * 100)}% do débito total`
                    : 'pts recuperáveis',
                  info: 'Parte do débito de confiabilidade que pode ser recuperada via remediação (ARIA ou manual).',
                },
                {
                  label: 'Cobertura',
                  value: `${Math.round(current.coverage * 100)}%`,
                  helper: `${current.scoredLeaves}/${current.totalLeaves} avaliados`,
                  info: 'Fração de workloads/filas do escopo com scorecard avaliado. Baixa cobertura = RI otimista.',
                },
              ]}
            />

            {/* ── gráfico: histórico + projeção ── */}
            {chartData.length >= 2 ? (
              <Card>
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <TrendingUp size={16} style={{ color: 'var(--color-primary)' }} />
                  <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>
                    Evolução da confiabilidade — {scopeName}
                  </p>
                  <span className="ml-auto text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                    série diária contínua · projeção assume findings remediáveis resolvidos
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={28}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<EvolutionTooltip />} cursor={{ stroke: 'var(--color-border)' }} />
                    {todayLabel && (
                      <ReferenceLine
                        x={todayLabel}
                        stroke="var(--color-muted-foreground)"
                        strokeDasharray="2 4"
                        label={{ value: 'hoje', fontSize: 10, fill: 'var(--color-muted-foreground)', position: 'top' }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="ri"
                      name="RI"
                      stroke="var(--color-primary)"
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="proj"
                      name="RI projetado"
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray="6 5"
                      dot={false}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-3 flex items-center gap-5 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-5 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }} />
                    Histórico
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg width={20} height={2} aria-hidden><line x1={0} y1={1} x2={20} y2={1} stroke="#10b981" strokeWidth={2} strokeDasharray="4 3" /></svg>
                    Projeção (findings resolvidos)
                  </span>
                </div>
              </Card>
            ) : (
              <Card>
                <EmptyState
                  icon={LineChartIcon}
                  title="Série ainda curta"
                  description="A evolução aparece assim que houver pelo menos dois dias de avaliação no período selecionado."
                />
              </Card>
            )}

            {/* ── movers ── */}
            {(risers.length > 0 || fallers.length > 0) && (
              <div className="grid gap-5 lg:grid-cols-2">
                <Card>
                  <p className="mb-4 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>
                    Maiores evoluções
                    <span className="ml-2 text-xs font-normal" style={{ color: 'var(--color-muted-foreground)' }}>Δ RI no período</span>
                  </p>
                  {risers.length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Nenhuma evolução no período.</p>
                  ) : (
                    <div className="space-y-2">
                      {risers.map((m) => <MoverRow key={m.path} mover={m} />)}
                    </div>
                  )}
                </Card>
                <Card>
                  <p className="mb-4 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>
                    Maiores regressões
                    <span className="ml-2 text-xs font-normal" style={{ color: 'var(--color-muted-foreground)' }}>onde a confiabilidade caiu</span>
                  </p>
                  {fallers.length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Nenhuma regressão no período. 🎉</p>
                  ) : (
                    <div className="space-y-2">
                      {fallers.map((m) => <MoverRow key={m.path} mover={m} />)}
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* ── oportunidades (visão futura) ── */}
            {projection && projection.opportunities.length > 0 && (
              <Card>
                <p className="mb-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>
                  Para onde podemos chegar
                </p>
                <p className="mb-4 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                  Findings abertos agregados por regra, ordenados pelo ganho de RI ao resolver — {openFindings} ocorrência{openFindings !== 1 ? 's' : ''} no escopo.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--color-muted-foreground)' }}>
                        <th className="pb-2 pr-4 font-semibold">Regra</th>
                        <th className="pb-2 pr-4 font-semibold">Pilar</th>
                        <th className="pb-2 pr-4 font-semibold">Severidade</th>
                        <th className="pb-2 pr-4 text-right font-semibold">Ocorrências</th>
                        <th className="pb-2 pr-4 text-right font-semibold">Ganho de RI</th>
                        <th className="pb-2 font-semibold">Remediação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projection.opportunities.map((o) => (
                        <tr key={o.ruleId} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                          <td className="py-2.5 pr-4">
                            <p className="font-mono text-xs font-semibold" style={{ color: 'var(--color-foreground)' }}>{o.ruleId}</p>
                            {o.message && <p className="mt-0.5 max-w-md truncate text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>{o.message}</p>}
                          </td>
                          <td className="py-2.5 pr-4 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                            {o.pillar ? (PILLAR_LABEL[o.pillar.toLowerCase()] ?? o.pillar) : '—'}
                          </td>
                          <td className="py-2.5 pr-4 text-xs" style={{ color: o.severity === 'critical' ? '#ef4444' : o.severity === 'error' ? '#f59e0b' : 'var(--color-muted-foreground)' }}>
                            {o.severity ? (SEVERITY_LABEL[o.severity.toLowerCase()] ?? o.severity) : '—'}
                          </td>
                          <td className="py-2.5 pr-4 text-right text-xs tabular-nums" style={{ color: 'var(--color-foreground)' }}>{o.occurrences}</td>
                          <td className="py-2.5 pr-4 text-right text-xs font-black tabular-nums" style={{ color: '#10b981' }}>
                            +{formatNumber(o.riGain)}
                          </td>
                          <td className="py-2.5">
                            {o.remediable ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-900/30 px-2 py-0.5 text-[11px] font-semibold text-indigo-300">
                                <Wrench size={11} /> remediável
                              </span>
                            ) : (
                              <span className="text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>manual</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
