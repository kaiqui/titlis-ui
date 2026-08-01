import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  ArrowDownRight, ArrowUpRight, Clock, Minus, PlugZap, Search, TrendingUp, Users, Wallet,
} from 'lucide-react'
import { Card } from '@/components/jeitto/Card'
import { EmptyState } from '@/components/jeitto/EmptyState'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { Header } from '@/components/layout/Header'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'

const PERIOD_OPTIONS = [7, 30, 90] as const
const NO_TEAM_LABEL = '(sem time)'

function formatDayLabel(isoDate: string): string {
  return `${isoDate.slice(8, 10)}/${isoDate.slice(5, 7)}`
}

function VariationBadge({ pct }: { pct: number | null }) {
  if (pct == null) {
    return <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>sem período anterior</span>
  }
  const stable = Math.abs(pct) < 0.5
  const Icon = stable ? Minus : pct > 0 ? ArrowUpRight : ArrowDownRight
  const color = stable ? 'var(--color-muted-foreground)' : pct > 0 ? '#ef4444' : '#10b981'
  return (
    <span className="flex items-center gap-1 text-sm font-black tabular-nums" style={{ color }}>
      <Icon size={14} />
      {stable ? 'estável' : `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`}
    </span>
  )
}

export function Costs() {
  const [days, setDays] = useState<(typeof PERIOD_OPTIONS)[number]>(30)
  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState('')

  const summaryQuery = useQuery({ queryKey: ['costs-summary', days], queryFn: () => api.costs.summary(days) })
  const teamsQuery = useQuery({ queryKey: ['costs-teams', days], queryFn: () => api.costs.teams(days) })
  const workloadsQuery = useQuery({ queryKey: ['costs-workloads', days], queryFn: () => api.costs.workloads(days) })

  const summary = summaryQuery.data
  const teams = teamsQuery.data
  const workloads = workloadsQuery.data

  const currencyFmt = useMemo(
    () => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: summary?.currency || 'USD' }),
    [summary?.currency],
  )

  const chartData = useMemo(
    () => (summary?.dailyCosts ?? []).map(p => ({ label: formatDayLabel(p.date), custo: p.totalCost })),
    [summary?.dailyCosts],
  )

  const filteredWorkloads = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (workloads?.workloads ?? []).filter(w => {
      const matchesSearch = !q
        || w.workloadName.toLowerCase().includes(q)
        || w.namespace.toLowerCase().includes(q)
        || w.clusterName.toLowerCase().includes(q)
      const matchesTeam = !teamFilter || (w.team ?? NO_TEAM_LABEL) === teamFilter
      return matchesSearch && matchesTeam
    })
  }, [workloads, search, teamFilter])

  if (summaryQuery.isLoading || teamsQuery.isLoading || workloadsQuery.isLoading) {
    return <><Header title="Custos" /><PageLoading /></>
  }
  if (summaryQuery.isError || teamsQuery.isError || workloadsQuery.isError || !summary || !teams || !workloads) {
    return (
      <>
        <Header title="Custos" />
        <PageError message="Falha ao carregar dados de custo." onRetry={() => { void summaryQuery.refetch(); void teamsQuery.refetch(); void workloadsQuery.refetch() }} />
      </>
    )
  }

  const hasData = summary.dailyCosts.some(p => p.totalCost > 0) || workloads.workloads.length > 0
  const avgDaily = summary.totalCost / days

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Custos" subtitle="Alocação de custo de infraestrutura por workload, time e namespace." />

      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">
        {!summary.configured && !hasData ? (
          <Card>
            <EmptyState
              icon={PlugZap}
              title="Coleta de custos não configurada"
              description="Conecte o billing da sua cloud para começar a coletar o custo por workload."
            />
            <div className="flex justify-center pb-2">
              <Link
                to="/settings/integrations"
                className="rounded-xl px-4 py-2 text-sm font-bold transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
              >
                Configurar em Integrações
              </Link>
            </div>
          </Card>
        ) : !hasData ? (
          <Card>
            <EmptyState
              icon={Clock}
              title="Aguardando primeira coleta"
              description={
                summary.lastCollectionAt
                  ? `Última coleta em ${formatDate(summary.lastCollectionAt)} — os dados do billing têm latência de até 48h.`
                  : 'A coleta roda diariamente. Os dados do billing export têm latência de até 48h.'
              }
            />
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                Custo alocado por workload (rateio proporcional de CPU + memória) · dados D-1 do billing export
              </p>
              <div className="flex items-center gap-1 rounded-xl border p-1" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
                {PERIOD_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setDays(opt)}
                    className="rounded-lg px-3 py-1 text-xs font-semibold transition-colors"
                    style={days === opt
                      ? { backgroundColor: 'var(--color-primary)', color: '#fff' }
                      : { color: 'var(--color-muted-foreground)' }}
                  >
                    {opt} dias
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card className="p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted-foreground)' }}>
                  <Wallet size={14} /> Total no período
                </div>
                <p className="mt-2 text-2xl font-black tabular-nums" style={{ color: 'var(--color-foreground)' }}>
                  {currencyFmt.format(summary.totalCost)}
                </p>
                <p className="mt-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>últimos {days} dias</p>
              </Card>
              <Card className="p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted-foreground)' }}>
                  <TrendingUp size={14} /> Variação
                </div>
                <div className="mt-2"><VariationBadge pct={summary.variationPct} /></div>
                <p className="mt-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>vs. {days} dias anteriores</p>
              </Card>
              <Card className="p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted-foreground)' }}>
                  <Users size={14} /> Média diária
                </div>
                <p className="mt-2 text-2xl font-black tabular-nums" style={{ color: 'var(--color-foreground)' }}>
                  {currencyFmt.format(avgDaily)}
                </p>
                <p className="mt-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{workloads.workloads.length} workloads com custo</p>
              </Card>
              <Card className="p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted-foreground)' }}>
                  <Clock size={14} /> Última coleta
                </div>
                <p className="mt-2 text-2xl font-black tabular-nums" style={{ color: 'var(--color-foreground)' }}>
                  {formatDate(summary.lastCollectionAt)}
                </p>
                <p className="mt-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>coleta diária automática</p>
              </Card>
            </div>

            {chartData.length >= 2 && (
              <Card className="p-5">
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <TrendingUp size={16} style={{ color: 'var(--color-primary)' }} />
                  <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>Custo diário</p>
                  <span className="ml-auto text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                    dias sem coleta aparecem como zero
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={chartData} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} minTickGap={28} />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => currencyFmt.format(v)}
                      width={90}
                    />
                    <Tooltip
                      cursor={{ stroke: 'var(--color-border)' }}
                      formatter={(value) => [currencyFmt.format(Number(value)), 'Custo']}
                    />
                    <Line type="monotone" dataKey="custo" name="Custo" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}

            {teams.teams.length > 0 && (
              <Card className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Users size={16} style={{ color: 'var(--color-primary)' }} />
                  <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>Custo por time</p>
                </div>
                <div className="flex flex-col gap-3">
                  {teams.teams.map(t => (
                    <div key={t.team} className="flex items-center gap-3">
                      <span
                        className="w-36 shrink-0 truncate text-sm font-semibold"
                        style={{ color: t.team === NO_TEAM_LABEL ? 'var(--color-muted-foreground)' : 'var(--color-foreground)' }}
                      >
                        {t.team}
                      </span>
                      <div className="h-4 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--color-muted)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.max(t.sharePct, 1)}%`, backgroundColor: 'var(--color-primary)' }}
                        />
                      </div>
                      <span className="w-24 shrink-0 text-right text-sm font-bold tabular-nums" style={{ color: 'var(--color-foreground)' }}>
                        {currencyFmt.format(t.totalCost)}
                      </span>
                      <span className="w-14 shrink-0 text-right text-xs tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
                        {t.sharePct.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card className="p-5">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>Workloads</p>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted-foreground)' }} />
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Buscar workload, namespace ou cluster…"
                      className="input-field w-64 pl-8 text-sm"
                    />
                  </div>
                  <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)} className="jc-select px-3 py-2 text-sm outline-none">
                    <option value="">Todos os times</option>
                    {teams.teams.map(t => (
                      <option key={t.team} value={t.team}>{t.team}</option>
                    ))}
                  </select>
                </div>
              </div>

              {filteredWorkloads.length === 0 ? (
                <p className="py-8 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                  Nenhum workload encontrado com os filtros atuais.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs font-semibold uppercase tracking-wide" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}>
                        <th className="pb-2 pr-4">Workload</th>
                        <th className="pb-2 pr-4">Namespace</th>
                        <th className="pb-2 pr-4">Cluster</th>
                        <th className="pb-2 pr-4">Time</th>
                        <th className="pb-2 pr-4 text-right">Total no período</th>
                        <th className="pb-2 text-right">Média/dia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredWorkloads.map(w => (
                        <tr key={w.workloadId} className="border-b last:border-0" style={{ borderColor: 'var(--color-border)' }}>
                          <td className="py-2.5 pr-4 font-semibold" style={{ color: 'var(--color-foreground)' }}>{w.workloadName}</td>
                          <td className="py-2.5 pr-4" style={{ color: 'var(--color-muted-foreground)' }}>{w.namespace}</td>
                          <td className="py-2.5 pr-4" style={{ color: 'var(--color-muted-foreground)' }}>{w.clusterName}</td>
                          <td className="py-2.5 pr-4" style={{ color: 'var(--color-muted-foreground)' }}>{w.team ?? NO_TEAM_LABEL}</td>
                          <td className="py-2.5 pr-4 text-right font-bold tabular-nums" style={{ color: 'var(--color-foreground)' }}>
                            {currencyFmt.format(w.totalCost)}
                          </td>
                          <td className="py-2.5 text-right tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
                            {currencyFmt.format(w.avgDailyCost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
