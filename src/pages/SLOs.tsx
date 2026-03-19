import { motion } from 'framer-motion'
import {
  AreaChart, Area, ResponsiveContainer,
} from 'recharts'
import { Target, AlertTriangle, CheckCircle2, XCircle, Flame, TrendingUp } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { PageLoading, PageError } from '@/components/ui/PageState'
import { useSLOs } from '@/hooks/useApi'
import type { SLO } from '@/types'

function sloStatusLabel(status: SLO['status']) {
  switch (status) {
    case 'healthy': return { label: 'Saudavel', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle2 }
    case 'at_risk': return { label: 'Em Risco', color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: AlertTriangle }
    case 'breached': return { label: 'Violado', color: 'text-red-500', bg: 'bg-red-500/10', icon: XCircle }
    case 'no_data': return { label: 'Sem Dados', color: 'text-gray-400', bg: 'bg-gray-500/10', icon: Target }
  }
}

function burnRateColor(rate: number) {
  if (rate > 5) return 'text-red-500'
  if (rate > 2) return 'text-orange-500'
  if (rate > 1) return 'text-yellow-500'
  return 'text-emerald-500'
}

function BudgetBar({ value }: { value: number }) {
  const color = value > 50 ? '#10b981' : value > 20 ? '#eab308' : '#ef4444'
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-muted)' }}>
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  )
}

function SLOChart({ history }: { history: Array<{ date: string; score: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={48}>
      <AreaChart data={history} margin={{ top: 2, right: 2, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="sloGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={1.5}
          fill="url(#sloGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function SLOs() {
  const { data: slos, isLoading, error, refetch } = useSLOs()

  if (isLoading) return <><Header title="SLOs & Confiabilidade" /><PageLoading /></>
  if (error || !slos) {
    return (
      <>
        <Header title="SLOs & Confiabilidade" />
        <PageError message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
      </>
    )
  }

  const healthy = slos.filter(s => s.status === 'healthy').length
  const atRisk = slos.filter(s => s.status === 'at_risk').length
  const breached = slos.filter(s => s.status === 'breached').length

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="SLOs & Confiabilidade" subtitle="Service Level Objectives gerenciados pelo Titlis Operator" />

      <div className="flex-1 p-6 space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total de SLOs', value: slos.length, icon: Target, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
            { label: 'Saudaveis', value: healthy, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { label: 'Em Risco', value: atRisk, icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
            { label: 'Violados', value: breached, icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
          ].map(({ label, value, icon: Icon, color, bg }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <Card>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                    <Icon size={16} className={color} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{label}</p>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Compliance bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                  Compliance Global de SLOs
                </p>
                <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                  Percentual de SLOs dentro do target
                </p>
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1.5">
                  <span style={{ color: 'var(--color-muted-foreground)' }}>0%</span>
                  <span className="font-semibold text-emerald-500">
                    {((healthy / slos.length) * 100).toFixed(0)}%
                  </span>
                  <span style={{ color: 'var(--color-muted-foreground)' }}>100%</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-muted)' }}>
                  <motion.div
                    className="h-full rounded-full bg-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${(healthy / slos.length) * 100}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
                  />
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-emerald-500">
                  {((healthy / slos.length) * 100).toFixed(0)}%
                </p>
                <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                  {healthy}/{slos.length} saudaveis
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* SLO list */}
        <div className="space-y-3">
          {slos
            .sort((a, b) => {
              const order = { breached: 0, at_risk: 1, no_data: 2, healthy: 3 }
              return order[a.status] - order[b.status]
            })
            .map((slo, i) => {
              const statusInfo = sloStatusLabel(slo.status)
              const StatusIcon = statusInfo.icon
              return (
                <motion.div
                  key={slo.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.07 }}
                >
                  <Card hover>
                    <div className="flex items-start gap-4">
                      {/* Status */}
                      <div className={`w-8 h-8 rounded-lg ${statusInfo.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <StatusIcon size={15} className={statusInfo.color} />
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                            {slo.name}
                          </h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                            {slo.framework}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 text-xs"
                          style={{ color: 'var(--color-muted-foreground)' }}>
                          <span>{slo.service}</span>
                          <span>·</span>
                          <span>{slo.namespace}</span>
                          <span>·</span>
                          <span>Squad: <span className="font-medium" style={{ color: 'var(--color-foreground)' }}>{slo.squad}</span></span>
                        </div>

                        {/* Metrics row */}
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-[10px] mb-1" style={{ color: 'var(--color-muted-foreground)' }}>
                              Target vs Atual
                            </p>
                            <div className="flex items-baseline gap-1.5">
                              <span className={`text-sm font-bold ${statusInfo.color}`}>
                                {slo.current.toFixed(2)}%
                              </span>
                              <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                                / {slo.target}%
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] mb-1" style={{ color: 'var(--color-muted-foreground)' }}>
                              Error Budget
                            </p>
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className={slo.errorBudgetRemaining > 20 ? 'text-emerald-500' : 'text-red-500'}>
                                  {slo.errorBudgetRemaining.toFixed(1)}% restante
                                </span>
                              </div>
                              <BudgetBar value={slo.errorBudgetRemaining} />
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] mb-1" style={{ color: 'var(--color-muted-foreground)' }}>
                              Burn Rate
                            </p>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <Flame size={11} className={burnRateColor(slo.burnRate1h)} />
                                <span className={`text-xs font-medium ${burnRateColor(slo.burnRate1h)}`}>
                                  {slo.burnRate1h}x <span className="font-normal text-[10px]" style={{ color: 'var(--color-muted-foreground)' }}>1h</span>
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <TrendingUp size={11} className={burnRateColor(slo.burnRate7d)} />
                                <span className={`text-xs font-medium ${burnRateColor(slo.burnRate7d)}`}>
                                  {slo.burnRate7d}x <span className="font-normal text-[10px]" style={{ color: 'var(--color-muted-foreground)' }}>7d</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Mini chart */}
                      <div className="w-28 flex-shrink-0">
                        <SLOChart history={slo.history} />
                        <p className="text-[10px] text-center mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
                          14 dias
                        </p>
                      </div>
                    </div>

                    {/* Burn rate alert */}
                    {(slo.status === 'breached' || slo.burnRate1h > 5) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20"
                      >
                        <Flame size={12} className="text-red-500 flex-shrink-0" />
                        <p className="text-xs text-red-600 dark:text-red-400">
                          {slo.status === 'breached'
                            ? `SLO violado. Budget de erro esgotado. Burn rate critico de ${slo.burnRate1h}x na ultima hora.`
                            : `Burn rate elevado (${slo.burnRate1h}x). Risco de violacao de SLO nas proximas horas.`}
                        </p>
                      </motion.div>
                    )}
                  </Card>
                </motion.div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
