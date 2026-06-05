import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Bot, CheckCircle2, GitPullRequest, Sparkles } from 'lucide-react'
import { ButtonDefault } from '@/components/jeitto/ButtonDefault'
import { Card } from '@/components/jeitto/Card'
import { EmptyState } from '@/components/jeitto/EmptyState'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { ScoreBadge } from '@/components/jeitto/ScoreBadge'
import { Header } from '@/components/layout/Header'
import { useDashboardWorkloads } from '@/hooks/useApi'
import { formatEnum, statusTone } from '@/lib/utils'

export function AriaPage() {
  const navigate = useNavigate()
  const { data: workloads = [], isLoading, error, refetch } = useDashboardWorkloads()
  const [filter, setFilter] = useState<'all' | 'action'>('action')

  const filtered = useMemo(() => {
    const list = filter === 'action'
      ? workloads.filter(w => w.complianceStatus !== 'compliant' && w.complianceStatus !== null)
      : workloads
    return [...list].sort((a, b) => (a.overallScore ?? 101) - (b.overallScore ?? 101))
  }, [workloads, filter])

  const actionCount = workloads.filter(
    w => w.complianceStatus !== 'compliant' && w.complianceStatus !== null
  ).length

  if (isLoading) return <><Header title="ARIA" subtitle="Remediação inteligente" /><PageLoading /></>
  if (error) return (
    <>
      <Header title="ARIA" subtitle="Remediação inteligente" />
      <PageError message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
    </>
  )

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="ARIA" subtitle="Selecione um workload para corrigir findings com IA" />

      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">

        {/* ── banner ARIA ── */}
        <Card>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(139,92,246,0.2) 100%)', border: '1px solid rgba(99,102,241,0.3)' }}>
              <Sparkles size={20} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>ARIA — Remediação com IA</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
                Escolha um workload abaixo. A ARIA lê o manifesto no GitHub, gera o patch e abre o PR para sua revisão.
              </p>
            </div>
            {actionCount > 0 && (
              <div className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#dc2626' }}>
                {actionCount} com falhas
              </div>
            )}
          </div>
        </Card>

        {/* ── filtro ── */}
        <div className="flex gap-2">
          {(['action', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="rounded-full px-4 py-1.5 text-xs font-semibold transition-colors"
              style={{
                backgroundColor: filter === f ? 'var(--color-primary)' : 'var(--color-muted)',
                color: filter === f ? '#fff' : 'var(--color-muted-foreground)',
              }}
            >
              {f === 'action' ? `Com falhas (${actionCount})` : `Todos (${workloads.length})`}
            </button>
          ))}
        </div>

        {/* ── lista de workloads ── */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Nenhum workload com falhas"
            description="Todos os workloads estão conformes. Nada a remediar por agora."
          />
        ) : (
          <div className="space-y-2">
            {filtered.map(w => (
              <div
                key={w.id}
                className="flex flex-wrap items-center gap-4 rounded-3xl border px-5 py-4 transition-colors"
                style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
              >
                <ScoreBadge score={w.overallScore} />

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black truncate" style={{ color: 'var(--color-foreground)' }}>
                    {w.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
                    {w.namespace} · {w.cluster} · {formatEnum(w.environment)}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(w.complianceStatus)}`}>
                    {formatEnum(w.complianceStatus ?? 'unknown')}
                  </span>

                  {w.remediationStatus && w.remediationStatus !== 'none' && (
                    <span className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                      <GitPullRequest size={10} />
                      {formatEnum(w.remediationStatus)}
                    </span>
                  )}

                  <ButtonDefault
                    label="Corrigir com ARIA"
                    icon={w.complianceStatus === 'compliant' ? ArrowRight : Bot}
                    onClick={() => navigate(`/scorecards/${w.id}/remediate`)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
