import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, AlertTriangle, Search } from 'lucide-react'
import { motion } from 'motion/react'
import { Card } from '@/components/jeitto/Card'
import { EmptyState } from '@/components/jeitto/EmptyState'
import { Pagination } from '@/components/jeitto/Pagination'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { Header } from '@/components/layout/Header'
import { ScoreRing } from '@/components/jeitto/ScoreRing'
import { useCoverage, useCoverageTopRisks } from '@/hooks/useApi'
import { usePagination } from '@/hooks/usePagination'
import { formatNumber, scoreBgColor } from '@/lib/utils'
import { fadeInUp } from '@/lib/motion/tokens'
import { confidenceLabel, dimensionLabel, overallBand, postureBand, topReason, weakestDimension } from '@/lib/posture'
import type { CoverageScorecard } from '@/types'

function isPendingCoverage(sc: CoverageScorecard): boolean {
  return sc.trustScore === null && sc.dimensions.length === 0 && sc.findings.length === 0
}

function weakLabel(sc: CoverageScorecard): string {
  const w = weakestDimension(sc)
  if (!w) return 'sinal insuficiente'
  return w.label ?? dimensionLabel(w.pillar)
}

export function Coverage() {
  const coverage = useCoverage()
  const topRisks = useCoverageTopRisks(10)
  const [search, setSearch] = useState('')

  const services = useMemo(() => coverage.data ?? [], [coverage.data])

  const filteredServices = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return services
    return services.filter((s) =>
      (s.serviceName ?? '').toLowerCase().includes(term)
      || s.workloadUid.toLowerCase().includes(term),
    )
  }, [services, search])

  const servicesPagination = usePagination(filteredServices, 25)

  const stats = useMemo(() => {
    const trusts = services.map((s) => s.trustScore).filter((t): t is number => t !== null)
    const withSignal = services.filter((s) => s.confidence && s.confidence !== 'insuficiente').length
    return {
      total: services.length,
      avgTrust: trusts.length ? trusts.reduce((a, b) => a + b, 0) / trusts.length : null,
      worstTrust: trusts.length ? Math.min(...trusts) : null,
      signalPct: services.length ? Math.round((withSignal / services.length) * 100) : 0,
    }
  }, [services])

  if (coverage.isLoading) return <PageLoading />
  if (coverage.isError) return <PageError message="Falha ao carregar a postura." onRetry={() => coverage.refetch()} />

  const risks = topRisks.data ?? []

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title="Postura de confiabilidade"
        subtitle="Postura inferida dos sinais em Datadog e GitHub — cada dimensão tem força e confiança; sinal ausente aparece como não instrumentado, nunca como falha."
      />
      <div className="flex-1 space-y-6 px-4 py-6 lg:px-8">

      {services.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nenhuma postura avaliada ainda"
          description="Conecte Datadog e GitHub em Integrações e rode a coleta para ver a postura de confiabilidade dos serviços aqui."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Serviços avaliados', value: String(stats.total), className: '' },
              { label: 'Postura média', value: formatNumber(stats.avgTrust), className: '' },
              { label: 'Pior postura', value: formatNumber(stats.worstTrust), className: 'text-red-500' },
              { label: 'Confiança', value: `${stats.signalPct}%`, className: '' },
            ].map((item, index) => (
              <motion.div key={item.label} {...fadeInUp} transition={{ ...fadeInUp.transition, delay: index * 0.05 }}>
                <Card className="p-5">
                  <div className="text-sm text-[var(--color-muted-foreground)]">{item.label}</div>
                  <div className={`mt-1 text-3xl font-semibold ${item.className}`}>{item.value}</div>
                </Card>
              </motion.div>
            ))}
          </div>

          {services.some(isPendingCoverage) && (
            <Card className="p-4">
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Alguns serviços já foram descobertos, mas a avaliação de postura ainda não retornou.
                A tela mostra o serviço primeiro e preenche as dimensões assim que a coleta concluir.
              </p>
            </Card>
          )}

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
                      <div className="truncate text-xs text-[var(--color-muted-foreground)]">
                        {isPendingCoverage(s) ? 'avaliação pendente' : topReason(s)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold">Todos os serviços</h2>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted-foreground)' }} />
                <input
                  className="input-field w-full py-2 pl-8 text-sm sm:w-64"
                  placeholder="Buscar serviço..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            {filteredServices.length === 0 ? (
              <div className="py-8">
                <EmptyState icon={Search} title="Nenhum resultado" description="Ajuste o termo buscado." />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[var(--color-muted-foreground)]">
                        <th className="pb-2 font-medium">Serviço</th>
                        <th className="pb-2 font-medium">Postura</th>
                        <th className="pb-2 font-medium">Confiança</th>
                        <th className="pb-2 font-medium">Dimensão frágil</th>
                      </tr>
                    </thead>
                    <tbody>
                      {servicesPagination.paginatedItems.map((s) => {
                        const band = postureBand(overallBand(s.trustScore))
                        return (
                          <tr key={s.workloadUid} className="border-t border-[var(--color-border)] transition-colors hover:bg-[var(--color-muted)]">
                            <td className="py-2 pr-4 font-medium">
                              <Link
                                to={`/coverage/${encodeURIComponent(s.workloadUid)}`}
                                className="hover:underline"
                              >
                                {s.serviceName || s.workloadUid}
                              </Link>
                            </td>
                            <td className="py-2 pr-4">
                              {isPendingCoverage(s) ? (
                                <span className="text-[var(--color-muted-foreground)]">pendente</span>
                              ) : (
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${scoreBgColor(s.trustScore)}`}>
                                  {formatNumber(s.trustScore)} · {band.label}
                                </span>
                              )}
                            </td>
                            <td className="py-2 pr-4 text-[var(--color-muted-foreground)]">
                              {isPendingCoverage(s) ? '—' : (confidenceLabel(s.confidence) || '—')}
                            </td>
                            <td className="py-2 text-[var(--color-muted-foreground)]">
                              {isPendingCoverage(s) ? '—' : weakLabel(s)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={servicesPagination.page}
                  pageSize={servicesPagination.pageSize}
                  totalItems={servicesPagination.totalItems}
                  totalPages={servicesPagination.totalPages}
                  startIndex={servicesPagination.startIndex}
                  endIndex={servicesPagination.endIndex}
                  onPageChange={servicesPagination.setPage}
                  onPageSizeChange={servicesPagination.changePageSize}
                />
              </>
            )}
          </Card>
        </>
      )}
      </div>
    </div>
  )
}

export default Coverage
