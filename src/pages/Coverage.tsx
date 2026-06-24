import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, AlertTriangle, Gauge } from 'lucide-react'
import { Card } from '@/components/jeitto/Card'
import { EmptyState } from '@/components/jeitto/EmptyState'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { Header } from '@/components/layout/Header'
import { ScoreRing } from '@/components/jeitto/ScoreRing'
import { useCoverage, useCoverageTopRisks } from '@/hooks/useApi'
import { formatNumber } from '@/lib/utils'
import type { CoverageScorecard } from '@/types'

function maturityLabel(level: number): string {
  return level > 0 ? `Nível ${level}/5` : 'n/d'
}

function gapsOf(sc: CoverageScorecard): string[] {
  return sc.findings.filter((f) => f.outcome === 'fail').map((f) => f.code)
}

export function Coverage() {
  const coverage = useCoverage()
  const topRisks = useCoverageTopRisks(10)

  const services = useMemo(() => coverage.data ?? [], [coverage.data])

  const stats = useMemo(() => {
    const trusts = services
      .map((s) => s.trustScore)
      .filter((t): t is number => t !== null)
    const maturities = services.map((s) => s.maturity).filter((m) => m > 0)
    return {
      total: services.length,
      avgTrust: trusts.length ? trusts.reduce((a, b) => a + b, 0) / trusts.length : null,
      worstTrust: trusts.length ? Math.min(...trusts) : null,
      avgMaturity: maturities.length ? maturities.reduce((a, b) => a + b, 0) / maturities.length : null,
    }
  }, [services])

  if (coverage.isLoading) return <PageLoading />
  if (coverage.isError) return <PageError message="Falha ao carregar a cobertura." onRetry={() => coverage.refetch()} />

  const risks = topRisks.data ?? []

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title="Cobertura & Confiança"
        subtitle="Scorecards de cobertura gerados por natureza de serviço — sinais não mensuráveis aparecem como N/A, nunca como falha."
      />
      <div className="flex-1 space-y-6 px-4 py-6 lg:px-8">

      {services.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nenhuma cobertura avaliada ainda"
          description="Ligue o Discovery no operator (ENABLE_DISCOVERY) e rode a avaliação de cobertura para ver os scorecards aqui."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <div className="text-sm text-[var(--color-muted-foreground)]">Serviços avaliados</div>
              <div className="mt-1 text-3xl font-semibold">{stats.total}</div>
            </Card>
            <Card className="p-5">
              <div className="text-sm text-[var(--color-muted-foreground)]">Trust Score médio</div>
              <div className="mt-1 text-3xl font-semibold">{formatNumber(stats.avgTrust)}</div>
            </Card>
            <Card className="p-5">
              <div className="text-sm text-[var(--color-muted-foreground)]">Pior Trust Score</div>
              <div className="mt-1 text-3xl font-semibold text-red-500">{formatNumber(stats.worstTrust)}</div>
            </Card>
            <Card className="p-5">
              <div className="text-sm text-[var(--color-muted-foreground)]">Maturidade média</div>
              <div className="mt-1 text-3xl font-semibold">
                {stats.avgMaturity !== null ? `${formatNumber(stats.avgMaturity)}/5` : 'n/d'}
              </div>
            </Card>
          </div>

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h2 className="text-lg font-semibold">Maiores riscos</h2>
            </div>
            {risks.length === 0 ? (
              <div className="text-sm text-[var(--color-muted-foreground)]">Sem riscos calculados.</div>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {risks.map((s) => (
                  <li key={s.workloadUid} className="flex items-center gap-4 py-3">
                    <ScoreRing score={s.trustScore} size={48} strokeWidth={5} />
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/coverage/${encodeURIComponent(s.workloadUid)}`}
                        className="block truncate font-medium hover:underline"
                      >
                        {s.serviceName || s.workloadUid}
                      </Link>
                      <div className="text-xs text-[var(--color-muted-foreground)]">
                        {s.cluster || '—'} · <Gauge className="inline h-3 w-3" /> {maturityLabel(s.maturity)}
                      </div>
                    </div>
                    <div className="hidden max-w-[50%] flex-wrap justify-end gap-1 sm:flex">
                      {gapsOf(s).slice(0, 4).map((code) => (
                        <span
                          key={code}
                          className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-500"
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-lg font-semibold">Todos os serviços</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--color-muted-foreground)]">
                    <th className="pb-2 font-medium">Serviço</th>
                    <th className="pb-2 font-medium">Cluster</th>
                    <th className="pb-2 font-medium">Trust</th>
                    <th className="pb-2 font-medium">Maturidade</th>
                    <th className="pb-2 font-medium">Lacunas</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((s) => (
                    <tr key={s.workloadUid} className="border-t border-[var(--color-border)]">
                      <td className="py-2 pr-4 font-medium">
                        <Link
                          to={`/coverage/${encodeURIComponent(s.workloadUid)}`}
                          className="hover:underline"
                        >
                          {s.serviceName || s.workloadUid}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 text-[var(--color-muted-foreground)]">{s.cluster || '—'}</td>
                      <td className="py-2 pr-4">{formatNumber(s.trustScore)}</td>
                      <td className="py-2 pr-4">{maturityLabel(s.maturity)}</td>
                      <td className="py-2">{gapsOf(s).length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
      </div>
    </div>
  )
}

export default Coverage
