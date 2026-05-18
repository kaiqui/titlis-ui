import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GitBranch, GitPullRequest, RefreshCw, XCircle } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { ButtonDefault } from '@/components/jeitto/ButtonDefault'
import { Card } from '@/components/jeitto/Card'
import { EmptyState } from '@/components/jeitto/EmptyState'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { api } from '@/lib/api'
import type { CampaignSummary } from '@/lib/api'
import { formatDate } from '@/lib/utils'

function statusLabel(status: string): string {
  switch (status) {
    case 'QUEUED':     return 'Na fila'
    case 'RUNNING':    return 'Em execução'
    case 'COMPLETED':  return 'Concluída'
    case 'FAILED':     return 'Falhou'
    case 'CANCELLED':  return 'Cancelada'
    default:           return status
  }
}

function statusColor(status: string): { border: string; color: string; bg: string } {
  switch (status) {
    case 'COMPLETED':
      return { border: 'rgba(34,197,94,0.3)', color: '#16a34a', bg: 'rgba(240,253,244,0.8)' }
    case 'RUNNING':
      return { border: 'rgba(59,130,246,0.3)', color: '#2563eb', bg: 'rgba(239,246,255,0.8)' }
    case 'FAILED':
      return { border: 'rgba(239,68,68,0.3)', color: '#dc2626', bg: 'rgba(254,242,242,0.8)' }
    case 'CANCELLED':
      return { border: 'rgba(107,114,128,0.3)', color: '#6b7280', bg: 'rgba(249,250,251,0.8)' }
    default:
      return { border: 'rgba(245,158,11,0.3)', color: '#d97706', bg: 'rgba(255,251,235,0.8)' }
  }
}

function triggerLabel(source: string): string {
  switch (source) {
    case 'manual':   return 'Manual'
    case 'schedule': return 'Agendado'
    case 'reactive': return 'Reativo'
    default:         return source
  }
}

function CampaignRow({ campaign, onCancel, cancelling }: {
  campaign: CampaignSummary
  onCancel: (id: string) => void
  cancelling: boolean
}) {
  const color = statusColor(campaign.status)
  const canCancel = campaign.status === 'QUEUED' || campaign.status === 'RUNNING'

  return (
    <div
      className="flex flex-col gap-3 rounded-[1.4rem] border p-4 sm:flex-row sm:items-center sm:gap-4"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}
    >
      <div className="flex flex-1 flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm truncate" style={{ color: 'var(--color-foreground)' }}>
            {campaign.title}
          </span>
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ border: `1px solid ${color.border}`, color: color.color, background: color.bg }}
          >
            {statusLabel(campaign.status)}
          </span>
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs"
            style={{ color: 'var(--color-muted-foreground)', background: 'rgba(0,0,0,0.04)' }}
          >
            {triggerLabel(campaign.triggerSource)}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
          <span className="flex items-center gap-1">
            <GitBranch size={11} />
            {campaign.ruleId ?? 'PERF-004'}
          </span>
          <span>{campaign.totalItems} workloads</span>
          <span>{formatDate(campaign.createdAt)}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs shrink-0">
        <div className="flex gap-2">
          <span style={{ color: '#16a34a' }}>{campaign.succeededItems} ok</span>
          {campaign.failedItems > 0 && <span style={{ color: '#dc2626' }}>{campaign.failedItems} falha</span>}
          {campaign.skippedItems > 0 && <span style={{ color: '#6b7280' }}>{campaign.skippedItems} pulado</span>}
        </div>
        {canCancel && (
          <button
            onClick={() => onCancel(campaign.id)}
            disabled={cancelling}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-red-50"
            style={{ color: '#dc2626' }}
            type="button"
          >
            <XCircle size={12} />
            Cancelar
          </button>
        )}
      </div>
    </div>
  )
}

export function Campaigns() {
  const queryClient = useQueryClient()
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const { data: campaigns, isLoading, error, refetch } = useQuery({
    queryKey: ['campaigns'],
    queryFn: api.campaigns.list,
    refetchInterval: 15_000,
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.campaigns.cancel(id),
    onMutate: (id) => setCancellingId(id),
    onSettled: () => {
      setCancellingId(null)
      void queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })

  if (isLoading) return <><Header title="Campanhas" /><PageLoading /></>
  if (error) {
    return (
      <>
        <Header title="Campanhas" subtitle="Histórico de campanhas de PR em lote." />
        <PageError message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
      </>
    )
  }

  const list = campaigns ?? []

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="Campanhas" subtitle="Campanhas de PR em lote para ajuste de HPA." />

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-4xl space-y-4">

          <div className="flex justify-end">
            <ButtonDefault
              visual="ghost"
              label="Atualizar"
              icon={RefreshCw}
              onClick={() => void refetch()}
            />
          </div>

          {list.length === 0 ? (
            <Card>
              <EmptyState
                icon={GitPullRequest}
                title="Nenhuma campanha ainda"
                description="Campanhas de HPA tuning aparecerão aqui quando iniciadas pelo assistente ou automaticamente."
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {list.map(campaign => (
                <CampaignRow
                  key={campaign.id}
                  campaign={campaign}
                  onCancel={(id) => cancelMutation.mutate(id)}
                  cancelling={cancellingId === campaign.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
