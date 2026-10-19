import { Link } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight, ExternalLink } from 'lucide-react'
import { Card } from '@/components/jeitto/Card'
import { formatCount, formatMs, formatPct, routeLabel } from '@/lib/outcome'
import type { ApplicationOutcome, ReliabilityState } from '@/types'

const IMPACT_COLOR: Record<string, string> = {
  confirmed: 'var(--color-danger)',
  probable: 'var(--color-warning)',
  potential: 'var(--color-info)',
  none: 'var(--color-success)',
  unknown: 'var(--color-muted-foreground)',
}

const STATE_STYLE: Record<ReliabilityState, { color: string; bg: string }> = {
  healthy: { color: 'var(--color-success)', bg: 'var(--color-success-soft)' },
  at_risk: { color: 'var(--color-warning)', bg: 'var(--color-warning-soft)' },
  degraded: { color: 'var(--color-danger)', bg: 'var(--color-danger-soft)' },
  not_measured: { color: 'var(--color-muted-foreground)', bg: 'var(--color-muted)' },
}

function budgetLeft(consumed: number | null): string {
  if (consumed === null) return 'N/D'
  return `${Math.max(0, Math.round((1 - consumed) * 100))}% restante`
}

function StatePill({ state, label }: { state: ReliabilityState; label: string }) {
  const s = STATE_STYLE[state]
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1 text-sm font-bold" style={{ color: s.color, backgroundColor: s.bg }}>
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
      {label}
    </span>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
      {children}
    </p>
  )
}

export function ReliabilityOutcome({ outcome }: { outcome: ApplicationOutcome }) {
  const { result, objectives } = outcome
  const thresholdLabel = formatMs(objectives.latencyThresholdMs)
  const budget = result ? Math.max(result.availabilityBudgetConsumed ?? 0, result.latencyBudgetConsumed ?? 0) : null
  const worstRoutes = outcome.routes.slice(0, 10)

  return (
    <div className="space-y-4" data-testid="reliability-outcome">
      <Card className="p-5">
        <SectionLabel>Resultado para o cliente · {outcome.window.days} dias até {outcome.window.to}</SectionLabel>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="min-w-0 space-y-2 lg:w-1/3">
            <StatePill state={outcome.state} label={outcome.stateLabel} />
            <ul className="space-y-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              {outcome.reasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
            {(outcome.team || outcome.product) && (
              <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                {outcome.team ? `Time ${outcome.team}` : 'Sem dono'}{outcome.product ? ` · ${outcome.product}` : ''}
              </p>
            )}
          </div>
          {result ? (
            <dl className="grid min-w-0 flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <dt className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Disponibilidade</dt>
                <dd className="text-lg font-bold tabular-nums">{formatPct(result.availabilityPct)}</dd>
                <dd className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>objetivo {formatPct(objectives.availabilityPct)}</dd>
              </div>
              <div>
                <dt className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Latência ≤ {thresholdLabel}</dt>
                <dd className="text-lg font-bold tabular-nums">{formatPct(result.latencyPct)}</dd>
                <dd className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>objetivo {formatPct(objectives.latencyPct)}</dd>
              </div>
              <div>
                <dt className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Error budget</dt>
                <dd className="text-lg font-bold tabular-nums">{budgetLeft(budget)}</dd>
                <dd className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>pior entre disponibilidade e latência</dd>
              </div>
              <div>
                <dt className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Requisições</dt>
                <dd className="text-lg font-bold tabular-nums">{formatCount(result.requests)}</dd>
                <dd className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{formatCount(result.failures)} falharam</dd>
              </div>
            </dl>
          ) : (
            <p className="min-w-0 flex-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              Sem tráfego de entrada medido neste período. A postura abaixo diz se o serviço está preparado,
              mas não se o cliente foi atendido.
            </p>
          )}
        </div>
      </Card>

      {worstRoutes.length > 0 && (
        <Card className="p-5">
          <SectionLabel>Onde dói · rotas de entrada</SectionLabel>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                  <th className="py-1.5 pr-3 font-medium">Rota</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Requisições</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Falhas</th>
                  <th className="py-1.5 pr-3 text-right font-medium">p95 (pior dia)</th>
                  <th className="py-1.5 pr-3 text-right font-medium">≤ {thresholdLabel}</th>
                  <th className="py-1.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {worstRoutes.map((r) => (
                  <tr key={r.resource} className="tabular-nums">
                    <td className="max-w-[320px] truncate py-2 pr-3 font-mono text-xs" title={r.resource}>{routeLabel(r.resource)}</td>
                    <td className="py-2 pr-3 text-right">{formatCount(r.requests)}</td>
                    <td className="py-2 pr-3 text-right">{formatPct(r.failurePct)}</td>
                    <td className="py-2 pr-3 text-right">{formatMs(r.p95MsWorstDay)}</td>
                    <td className="py-2 pr-3 text-right">{formatPct(r.latencyPct)}</td>
                    <td className="py-2 text-xs">
                      {r.status === 'below_objective' ? (
                        <span style={{ color: 'var(--color-danger)' }}>fora do objetivo</span>
                      ) : r.status === 'low_volume' ? (
                        <span style={{ color: 'var(--color-muted-foreground)' }}>pouco volume</span>
                      ) : (
                        <span style={{ color: 'var(--color-success)' }}>ok</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {outcome.dependencies.measured && (
        <Card className="p-5">
          <SectionLabel>Dependências observadas · últimas 24h</SectionLabel>
          <p className="mb-3 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            <ArrowUpRight className="mr-1 inline h-3.5 w-3.5" />
            {outcome.dependencies.isEntrypoint
              ? 'Ponto de entrada: nenhum serviço interno chama este.'
              : `${outcome.dependencies.upstreamCount ?? 0} serviço(s) interno(s) chamam este.`}
          </p>
          {outcome.dependencies.downstream.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Nenhuma chamada de saída observada.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {outcome.dependencies.downstream.map((d) => {
                const cause = outcome.dependencies.probableCause === d.target
                const bad = d.status === 'degraded' || d.state === 'degraded'
                return (
                  <div
                    key={`${d.target}-${d.external}`}
                    className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                    style={{ borderColor: cause ? 'var(--color-danger)' : 'var(--color-border)' }}
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 truncate text-sm font-medium">
                        <ArrowDownRight className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{d.target}</span>
                        {d.external && <span className="text-[11px] font-normal" style={{ color: 'var(--color-muted-foreground)' }}>externo</span>}
                      </p>
                      <p className="text-xs tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
                        {formatCount(d.calls)} chamadas · erro {formatPct(d.errorPct)}
                      </p>
                    </div>
                    <span className="whitespace-nowrap text-xs font-semibold" style={{ color: bad ? 'var(--color-danger)' : 'var(--color-success)' }}>
                      {cause ? 'causa provável' : bad ? 'degradada' : 'ok'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {(outcome.impact?.length ?? 0) > 0 && (
        <Card className="p-5">
          <SectionLabel>Impacto no cliente</SectionLabel>
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {outcome.impact!.map((j) => (
              <div key={j.key} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2 text-sm">
                <span className="font-medium">{j.name}{j.tier ? ` (${j.tier})` : ''}</span>
                <span className="text-xs font-bold" style={{ color: IMPACT_COLOR[j.level] }}>{j.levelLabel.toUpperCase()}</span>
                {j.failedRequests !== null && <span className="text-xs tabular-nums">{formatCount(j.failedRequests)} requisições falharam</span>}
                <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                  {j.isResponsible ? 'este serviço é o elo responsável' : j.responsibleLink ? `elo responsável: ${j.responsibleLink}` : j.reasons[0] ?? ''}
                </span>
                <Link to="/journeys" className="ml-auto text-xs hover:underline" style={{ color: 'var(--color-primary)' }}>ver jornada</Link>
              </div>
            ))}
          </div>
        </Card>
      )}

      {outcome.actions.length > 0 && (
        <Card className="p-5">
          <SectionLabel>Ações</SectionLabel>
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {outcome.actions.map((a) => (
              <div key={a.code} className="space-y-1 py-2.5">
                <div className="flex items-baseline gap-3 text-sm">
                  <span className="font-mono text-xs" style={{ color: 'var(--color-primary)' }}>{a.code}</span>
                  <span className="min-w-0">{a.message.replace(/^[❌✅⏭]\s*/u, '')}</span>
                  {outcome.team && <span className="ml-auto whitespace-nowrap text-xs" style={{ color: 'var(--color-muted-foreground)' }}>dono {outcome.team}</span>}
                </div>
                {a.evidence.map((e) => (
                  <p key={`${e.source}-${e.locator}`} className="pl-14 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                    {e.detail ?? e.locator}
                    {e.link && (
                      <a href={e.link} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
                        <ExternalLink className="h-3 w-3" />
                        ver evidência
                      </a>
                    )}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
