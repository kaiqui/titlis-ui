import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, Download, FileQuestion, Printer } from 'lucide-react'
import { Card } from '@/components/jeitto/Card'
import { ButtonDefault } from '@/components/jeitto/ButtonDefault'
import { EmptyState } from '@/components/jeitto/EmptyState'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { Header } from '@/components/layout/Header'
import { SummaryStrip } from '@/components/sre/SummaryStrip'
import { useTeamReport } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { downloadCsv } from '@/lib/exportCsv'
import { formatPct, routeLabel } from '@/lib/outcome'
import { formatNumber } from '@/lib/utils'
import type { ReliabilityState, TeamReport as TeamReportData } from '@/types'

const STATE_COLOR: Record<ReliabilityState, string> = {
  healthy: 'var(--color-success)',
  at_risk: 'var(--color-warning)',
  degraded: 'var(--color-danger)',
  not_measured: 'var(--color-muted-foreground)',
}

const STATE_LABEL: Record<ReliabilityState, string> = {
  healthy: 'Saudável', at_risk: 'Em risco', degraded: 'Degradado', not_measured: 'Não medido',
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
      {children}
    </p>
  )
}

function delta(cur: number | null, prev: number | null, digits = 2): string {
  if (cur === null || prev === null) return ''
  const d = cur - prev
  if (Math.abs(d) < 10 ** -digits) return ' (=)'
  return ` (${d > 0 ? '+' : ''}${d.toFixed(digits).replace('.', ',')})`
}

function indicators(r: TeamReportData) {
  const i = r.indicators
  return [
    {
      label: 'Atendimento das jornadas',
      value: i.journeyAttainment ? `${i.journeyAttainment.withinObjective}/${i.journeyAttainment.measured}` : 'N/D',
      helper: i.journeyAttainment ? 'jornadas T0/T1 do time dentro do objetivo' : 'nenhuma jornada confirmada do time',
    },
    {
      label: 'Pior jornada',
      value: i.worstJourney ? i.worstJourney.name : 'N/D',
      helper: i.worstJourney ? `elo mais fraco: ${i.worstJourney.weakestService ?? 'n/d'}` : 'sem jornada medida',
    },
    {
      label: 'Risco ponderado',
      value: i.weightedRisk.toFixed(4).replace('.', ','),
      helper: 'tier × distância do objetivo × certeza',
    },
    {
      label: 'Cobertura de dados',
      value: `${i.coveragePct}%`,
      helper: `${i.measuredServices} de ${i.totalServices} serviços com resultado medido`,
    },
  ]
}

export function TeamReport() {
  const { team = '' } = useParams()
  const [days] = useState(30)
  const report = useTeamReport(team, days)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  if (report.isLoading) return <><Header title={`Time ${team}`} /><PageLoading /></>
  if (report.isError) return <><Header title={`Time ${team}`} /><PageError message="Falha ao carregar o relatório." onRetry={() => report.refetch()} /></>
  const r = report.data
  if (!r) {
    return (
      <>
        <Header title={`Time ${team}`} />
        <EmptyState icon={FileQuestion} title="Nenhum serviço deste time" description="O time vem do Datadog Service Catalog ou do repositório do serviço." />
      </>
    )
  }

  async function handleCsv() {
    setExporting(true)
    setExportError(null)
    try {
      downloadCsv(`titlis-time-${team}-${r!.window.to}.csv`, await api.reports.teamCsv(team, days))
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Falha ao exportar.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title={`Time ${r.team}`} subtitle={`Confiabilidade para o cliente · ${r.window.from} a ${r.window.to}, comparado com os ${r.previousWindow.days} dias anteriores`} />

      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8" data-testid="team-report">
        <h1 className="hidden text-2xl font-bold print:block">Time {r.team} · {r.window.from} a {r.window.to}</h1>

        <div className="flex flex-wrap items-center gap-3" data-print-hide>
          <ButtonDefault label={exporting ? 'Exportando…' : 'Exportar CSV'} visual="secondary" icon={Download} onClick={handleCsv} />
          <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            <Printer className="h-3.5 w-3.5" />
            Para PDF, use Imprimir do navegador (Ctrl+P).
          </span>
          {exportError && <span className="text-xs" style={{ color: 'var(--color-danger)' }}>{exportError}</span>}
        </div>

        {r.dataStatus === 'insufficient_data' && (
          <p className="jc-alert jc-alert-warning flex items-center gap-1.5">
            <AlertTriangle size={13} />
            Dados insuficientes: só {r.indicators.coveragePct}% dos serviços do time têm resultado medido. Os indicadores abaixo não representam o time.
          </p>
        )}

        <SummaryStrip items={indicators(r)} />

        <Card className="p-5 break-inside-avoid">
          <Label>Serviços · resultado e postura</Label>
          <p className="mb-3 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            Postura ponderada por tier {formatNumber(r.indicators.postureWeighted)} · pior {formatNumber(r.indicators.postureWorst)} · SLOs válidos {r.slos.valid}, com defeito {r.slos.invalid}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                  <th className="py-1.5 pr-3 font-medium">Serviço</th>
                  <th className="py-1.5 pr-3 font-medium">Estado</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Disponibilidade</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Latência</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Postura</th>
                  <th className="py-1.5 pr-3 font-medium">Rotas fora do objetivo</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {r.services.map((s) => (
                  <tr key={s.service} className="align-top tabular-nums">
                    <td className="py-2 pr-3">
                      {s.uid ? <Link to={`/coverage/${encodeURIComponent(s.uid)}`} className="font-medium hover:underline">{s.service}</Link> : s.service}
                      <p className="text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>
                        {[s.product, s.tier ? `tier ${s.tier}` : null].filter(Boolean).join(' · ')}
                        {s.ownership === 'conflict' && <span style={{ color: 'var(--color-warning)' }}> · dono em conflito com {s.conflictWith}</span>}
                      </p>
                    </td>
                    <td className="py-2 pr-3 text-xs font-semibold" style={{ color: STATE_COLOR[s.state] }}>{s.stateLabel}</td>
                    <td className="py-2 pr-3 text-right">{formatPct(s.availabilityPct)}<span className="text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>{delta(s.availabilityPct, s.previousAvailabilityPct)}</span></td>
                    <td className="py-2 pr-3 text-right">{formatPct(s.latencyPct)}</td>
                    <td className="py-2 pr-3 text-right">{formatNumber(s.trustScore)}<span className="text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>{delta(s.trustScore, s.previousTrustScore, 1)}</span></td>
                    <td className="py-2 pr-3 font-mono text-xs">
                      {s.routesBelowObjective.length === 0 ? '—' : s.routesBelowObjective.map((rt) => (
                        <p key={rt}>{routeLabel(rt)}{s.recurringRoutes.includes(rt) && <span style={{ color: 'var(--color-danger)' }}> · recorrente</span>}</p>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {(r.journeysOwned.length > 0 || r.journeysDependingOnTeam.length > 0) && (
          <Card className="p-5 break-inside-avoid">
            <Label>Jornadas</Label>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-semibold">Do time</p>
                {r.journeysOwned.length === 0 ? <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Nenhuma.</p> : r.journeysOwned.map((j) => (
                  <p key={j.journeyKey} className="text-sm">
                    {j.name}{j.tier ? ` (${j.tier})` : ''} · <span style={{ color: STATE_COLOR[j.state] }}>{STATE_LABEL[j.state]}</span>
                  </p>
                ))}
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold">De outros times que dependem deste</p>
                {r.journeysDependingOnTeam.length === 0 ? <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Nenhuma.</p> : r.journeysDependingOnTeam.map((j) => (
                  <p key={j.journeyKey} className="text-sm">
                    {j.name} · time {j.ownerTeam ?? 'sem dono'} · via {j.services.join(', ')}
                  </p>
                ))}
              </div>
            </div>
          </Card>
        )}

        {r.findings.length > 0 && (
          <Card className="p-5 break-inside-avoid">
            <Label>Problemas priorizados</Label>
            <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {r.findings.map((f) => (
                <div key={`${f.service}-${f.code}`} className="flex items-baseline gap-3 py-2 text-sm">
                  <span className="font-mono text-xs font-bold" style={{ color: f.priority === 'P0' ? 'var(--color-danger)' : f.priority === 'P1' ? 'var(--color-warning)' : 'var(--color-muted-foreground)' }}>{f.priority}</span>
                  <span className="min-w-0">{f.message}</span>
                  <span className="ml-auto whitespace-nowrap font-mono text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{f.service} · {f.code}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {r.recommendations.length > 0 && (
          <Card className="p-5 break-inside-avoid">
            <Label>Recomendações</Label>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {r.recommendations.map((rec) => <li key={rec}>{rec}</li>)}
            </ol>
          </Card>
        )}
      </div>
    </div>
  )
}
