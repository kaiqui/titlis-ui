import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Bot, Gauge, ListChecks, Sparkles } from 'lucide-react'
import { Card } from '@/components/jeitto/Card'
import { EmptyState } from '@/components/jeitto/EmptyState'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { SummaryStrip } from '@/components/sre/SummaryStrip'
import { useAiUsage } from '@/hooks/useApi'
import { useTimeRange } from '@/hooks/useTimeRange'
import { formatNumber } from '@/lib/utils'

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`
  return String(n)
}

const usdFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const usdFmtCents = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 })
function fmtUsd(n: number): string {
  return n > 0 && n < 1 ? usdFmtCents.format(n) : usdFmt.format(n)
}

function dayLabel(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
}

export function AiUsage() {
  const { days } = useTimeRange()
  const { data, isLoading, error, refetch } = useAiUsage(days)

  const chartData = useMemo(
    () => (data?.daily ?? []).map((d) => ({ label: dayLabel(d.date), tokens: d.tokens, usd: d.estimatedUsd })),
    [data],
  )

  if (isLoading) return <PageLoading />
  if (error) return <PageError message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
  if (!data) {
    return (
      <div className="px-4 py-6 lg:px-8">
        <Card>
          <EmptyState icon={Bot} title="Sem dados de consumo de IA" description="Configure o modelo de IA em Integrações e use o assistente para começar a registrar consumo." />
        </Card>
      </div>
    )
  }

  const { month } = data
  const providerModel = month.provider && month.model ? `${month.provider} / ${month.model}` : 'não configurado'

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-6 px-4 py-6 lg:px-8">
        <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
          Consumo de tokens do assistente de confiabilidade (ConfAI) — investigações, varreduras de regressão e
          relatórios executivos. O valor em dólar é uma <strong>estimativa</strong> pelo preço público
          aproximado de {providerModel} ({fmtUsd(data.pricePer1MTokensUsd)} / 1M tokens, blended) — não é fatura.
        </p>

        <SummaryStrip
          items={[
            {
              label: 'Custo estimado no mês',
              value: fmtUsd(month.estimatedUsd),
              helper: month.budgetUsd != null ? `de ~${fmtUsd(month.budgetUsd)} do limite` : `${fmtTokens(month.tokensUsed)} tokens`,
              info: 'Estimativa: tokens do mês × preço público aproximado do modelo. Não é o valor cobrado pelo provedor.',
            },
            {
              label: 'Uso do limite',
              value: month.usagePct != null ? `${month.usagePct.toFixed(0)}%` : '—',
              helper: month.monthlyTokenBudget != null
                ? `${fmtTokens(month.tokensUsed)} de ${fmtTokens(month.monthlyTokenBudget)} tokens`
                : 'sem limite definido',
              info: 'Percentual do limite mensal de tokens já consumido.',
            },
            {
              label: `Custo em ${days}d`,
              value: fmtUsd(data.windowEstimatedUsd),
              helper: `${fmtTokens(data.windowTokens)} tokens · ${data.windowRuns} execuç${data.windowRuns === 1 ? 'ão' : 'ões'}`,
              info: 'Estimativa do custo das execuções do assistente no período selecionado.',
            },
            {
              label: 'Modelo em uso',
              value: month.model ?? '—',
              helper: month.provider ?? 'configure em Integrações',
              info: 'Provedor e modelo de linguagem configurados para o tenant.',
            },
          ]}
        />

        {chartData.length >= 2 ? (
          <Card>
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <Gauge size={16} style={{ color: 'var(--color-primary)' }} />
              <p className="text-sm font-bold" style={{ color: 'var(--color-foreground)' }}>Tokens por dia</p>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtTokens(v)} width={52} />
                <Tooltip
                  cursor={{ fill: 'var(--color-muted)' }}
                  formatter={(v, _n, p) => [`${formatNumber(Number(v))} tokens · ~${fmtUsd(Number((p?.payload as { usd?: number })?.usd ?? 0))}`, 'Consumo']}
                />
                <Bar dataKey="tokens" name="Tokens" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        ) : (
          <Card>
            <EmptyState icon={Sparkles} title="Ainda sem histórico suficiente" description="O gráfico aparece com pelo menos dois dias de uso do assistente no período." />
          </Card>
        )}

        {data.byKind.length > 0 && (
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <ListChecks size={16} style={{ color: 'var(--color-primary)' }} />
              <p className="text-sm font-bold" style={{ color: 'var(--color-foreground)' }}>Consumo por tipo de tarefa</p>
            </div>
            <div className="space-y-3">
              {data.byKind.map((k) => {
                const pct = data.windowTokens > 0 ? (k.tokens / data.windowTokens) * 100 : 0
                return (
                  <div key={k.kind} className="flex items-center gap-3">
                    <span className="w-52 shrink-0 truncate text-sm" style={{ color: 'var(--color-foreground)' }}>{k.label}</span>
                    <div className="h-3 flex-1 overflow-hidden rounded-[4px]" style={{ backgroundColor: 'var(--color-muted)' }}>
                      <div className="h-full rounded-[4px]" style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: 'var(--color-primary)' }} />
                    </div>
                    <span className="w-20 shrink-0 text-right text-sm font-bold tabular-nums" style={{ color: 'var(--color-foreground)' }}>{fmtUsd(k.estimatedUsd)}</span>
                    <span className="w-14 shrink-0 text-right text-xs tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>{fmtTokens(k.tokens)}</span>
                    <span className="w-10 shrink-0 text-right text-xs tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>{k.runs}×</span>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {data.recentRuns.length > 0 && (
          <Card>
            <p className="mb-4 text-sm font-bold" style={{ color: 'var(--color-foreground)' }}>Execuções recentes</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--color-muted-foreground)' }}>
                    <th className="pb-2 pr-4 font-semibold">Tarefa</th>
                    <th className="pb-2 pr-4 font-semibold">Quando</th>
                    <th className="pb-2 pr-4 font-semibold">Status</th>
                    <th className="pb-2 pr-4 text-right font-semibold">Custo est.</th>
                    <th className="pb-2 pr-4 text-right font-semibold">Tokens</th>
                    <th className="pb-2 text-right font-semibold">Duração</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentRuns.map((r, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                      <td className="py-2.5 pr-4" style={{ color: 'var(--color-foreground)' }}>{r.label}</td>
                      <td className="py-2.5 pr-4 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                        {new Date(r.startedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5 pr-4 text-xs" style={{ color: r.status === 'ok' || r.status === 'success' ? '#12a150' : r.status === 'error' ? '#d8341a' : 'var(--color-muted-foreground)' }}>
                        {r.status}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-xs tabular-nums" style={{ color: 'var(--color-foreground)' }}>{r.tokens > 0 ? fmtUsd(r.estimatedUsd) : '—'}</td>
                      <td className="py-2.5 pr-4 text-right text-xs tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>{r.tokens > 0 ? formatNumber(r.tokens) : '—'}</td>
                      <td className="py-2.5 text-right text-xs tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
                        {r.durationMs != null ? `${(r.durationMs / 1000).toFixed(1)}s` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
