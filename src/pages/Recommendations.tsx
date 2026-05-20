import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, CheckCircle, ExternalLink, GitBranch, GitPullRequest, Loader2, PlayCircle, RefreshCw, Search, Sparkles, Wrench, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { ButtonDefault } from '@/components/jeitto/ButtonDefault'
import { FeatureGuard } from '@/components/atoms/FeatureGuard'
import { Card } from '@/components/jeitto/Card'
import { EmptyState } from '@/components/jeitto/EmptyState'
import { Input } from '@/components/jeitto/Input'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { DetailPanel } from '@/components/sre/DetailPanel'
import { FocusTabs } from '@/components/sre/FocusTabs'
import { InlineAccordion } from '@/components/sre/InlineAccordion'
import { SelectionList } from '@/components/sre/SelectionList'
import { SummaryStrip } from '@/components/sre/SummaryStrip'
import { useAuth } from '@/contexts/useAuth'
import { useDashboardWorkloads } from '@/hooks/useApi'
import { api } from '@/lib/api'
import type { CampaignSummary } from '@/lib/api'
import { buildRemediationQueue } from '@/lib/insights'
import { formatDate, formatEnum, formatNumber, statusTone } from '@/lib/utils'

type PageTab = 'remediation' | 'campaigns'
type RemediationFilter = 'active' | 'with_pr' | 'without_pr' | 'all'
type RemediationFocus = 'overview' | 'signals' | 'actions'

function campaignStatusLabel(status: string): string {
  switch (status) {
    case 'QUEUED':     return 'Na fila'
    case 'RUNNING':    return 'Em execução'
    case 'COMPLETED':  return 'Concluída'
    case 'FAILED':     return 'Falhou'
    case 'CANCELLED':  return 'Cancelada'
    default:           return status
  }
}

function campaignStatusColor(status: string): { border: string; color: string; bg: string } {
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

function CampaignRow({ campaign, onCancel, cancelling }: {
  campaign: CampaignSummary
  onCancel: (id: string) => void
  cancelling: boolean
}) {
  const color = campaignStatusColor(campaign.status)
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
            {campaignStatusLabel(campaign.status)}
          </span>
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs"
            style={{ color: 'var(--color-muted-foreground)', background: 'rgba(0,0,0,0.04)' }}
          >
            {campaign.triggerSource === 'manual' ? 'Manual' : campaign.triggerSource === 'schedule' ? 'Agendado' : 'Reativo'}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
          <span className="flex items-center gap-1">
            <GitBranch size={11} />
            {campaign.ruleId ?? 'manifest'}
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

export function Recommendations() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [pageTab, setPageTab] = useState<PageTab>('remediation')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<RemediationFilter>('active')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focus, setFocus] = useState<RemediationFocus>('overview')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [triggerBanner, setTriggerBanner] = useState<{ type: 'success' | 'error' | 'conflict'; message: string } | null>(null)
  const queryClient = useQueryClient()

  const { data: workloads, isLoading, error, refetch } = useDashboardWorkloads()
  const { data: campaigns, isLoading: campaignsLoading, error: campaignsError, refetch: refetchCampaigns } = useQuery({
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
  const triggerMutation = useMutation({
    mutationFn: api.campaigns.triggerManifest,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      if (data) {
        setTriggerBanner({ type: 'success', message: 'Campanha iniciada! Acompanhe o progresso abaixo.' })
        setPageTab('campaigns')
      } else {
        setTriggerBanner({ type: 'conflict', message: 'Já existe uma campanha de compliance em execução.' })
        setPageTab('campaigns')
      }
      setTimeout(() => setTriggerBanner(null), 6000)
    },
    onError: (err: Error) => {
      setTriggerBanner({ type: 'error', message: err.message || 'Erro ao iniciar campanha.' })
      setTimeout(() => setTriggerBanner(null), 6000)
    },
  })

  const workloadList = workloads ?? []
  const queue = buildRemediationQueue(workloadList)
  const activeManifestCampaign = useMemo(
    () => (campaigns ?? []).find(c => c.ruleId === 'manifest' && (c.status === 'RUNNING' || c.status === 'QUEUED')) ?? null,
    [campaigns],
  )

  const filtered = queue.filter(item => {
    const term = search.trim().toLowerCase()
    const matchesTerm = term.length === 0
      || item.name.toLowerCase().includes(term)
      || item.namespace.toLowerCase().includes(term)
      || item.cluster.toLowerCase().includes(term)

    const matchesFilter = filter === 'all'
      || (filter === 'active' && item.remediationStatus !== null)
      || (filter === 'with_pr' && Boolean(item.githubPrUrl))
      || (filter === 'without_pr' && !item.githubPrUrl)

    return matchesTerm && matchesFilter
  })

  useEffect(() => {
    if (filtered.length === 0) {
      if (selectedId !== null) setSelectedId(null)
      return
    }

    if (!selectedId || !filtered.some(item => item.id === selectedId)) {
      setSelectedId(filtered[0].id)
      setFocus('overview')
    }
  }, [filtered, selectedId])

  const selected = filtered.find(item => item.id === selectedId) ?? null
  const summary = useMemo(() => {
    const scored = queue.filter(item => item.overallScore !== null)

    return {
      active: queue.filter(item => item.remediationStatus !== null).length,
      withPr: queue.filter(item => item.githubPrUrl).length,
      withoutPr: queue.filter(item => !item.githubPrUrl).length,
      avgScore: scored.length > 0
        ? scored.reduce((total, item) => total + (item.overallScore ?? 0), 0) / scored.length
        : null,
    }
  }, [queue])

  if (isLoading) return <><Header title="Remediação" /><PageLoading /></>
  if (error || !workloads) {
    return (
      <>
        <Header title="Remediação" />
        <PageError message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
      </>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Remediação" subtitle="Fila de remediação e campanhas de compliance em lote." />

      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPageTab('remediation')}
            className="rounded-full px-4 py-1.5 text-sm font-semibold transition-colors"
            style={pageTab === 'remediation'
              ? { backgroundColor: 'var(--color-primary)', color: '#fff' }
              : { backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
          >
            Remediações
          </button>
          <button
            type="button"
            onClick={() => setPageTab('campaigns')}
            className="rounded-full px-4 py-1.5 text-sm font-semibold transition-colors"
            style={pageTab === 'campaigns'
              ? { backgroundColor: 'var(--color-primary)', color: '#fff' }
              : { backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
          >
            Campanhas
          </button>
        </div>

        {pageTab === 'campaigns' && (
          <div className="space-y-4">
            {triggerBanner && (
              <div
                className="flex items-center gap-3 rounded-[1.4rem] border px-4 py-3 text-sm"
                style={{
                  borderColor: triggerBanner.type === 'success' ? 'rgba(34,197,94,0.4)' : triggerBanner.type === 'conflict' ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.4)',
                  background: triggerBanner.type === 'success' ? 'rgba(240,253,244,0.9)' : triggerBanner.type === 'conflict' ? 'rgba(255,251,235,0.9)' : 'rgba(254,242,242,0.9)',
                  color: triggerBanner.type === 'success' ? '#16a34a' : triggerBanner.type === 'conflict' ? '#d97706' : '#dc2626',
                }}
              >
                {triggerBanner.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                {triggerBanner.message}
              </div>
            )}

            {activeManifestCampaign && (
              <div
                className="flex flex-col gap-3 rounded-[1.4rem] border p-4"
                style={{ borderColor: 'rgba(59,130,246,0.3)', background: 'rgba(239,246,255,0.8)' }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Loader2 size={15} className="animate-spin" style={{ color: '#2563eb' }} />
                    <span className="text-sm font-semibold" style={{ color: '#2563eb' }}>Campanha em execução</span>
                  </div>
                  <span className="text-xs" style={{ color: '#6b7280' }}>
                    Atualiza automaticamente
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-xs" style={{ color: '#374151' }}>
                  <span>
                    <strong>{activeManifestCampaign.succeededItems + activeManifestCampaign.failedItems + activeManifestCampaign.skippedItems}</strong>
                    {' '}de{' '}
                    <strong>{activeManifestCampaign.totalItems > 0 ? activeManifestCampaign.totalItems : '?'}</strong>
                    {' '}workloads processados
                  </span>
                  {activeManifestCampaign.totalItems > 0 && (
                    <span>
                      {Math.round(((activeManifestCampaign.succeededItems + activeManifestCampaign.failedItems + activeManifestCampaign.skippedItems) / activeManifestCampaign.totalItems) * 100)}% concluído
                    </span>
                  )}
                  <span style={{ color: '#16a34a' }}>{activeManifestCampaign.succeededItems} ok</span>
                  {activeManifestCampaign.failedItems > 0 && <span style={{ color: '#dc2626' }}>{activeManifestCampaign.failedItems} falha</span>}
                  {activeManifestCampaign.skippedItems > 0 && <span style={{ color: '#6b7280' }}>{activeManifestCampaign.skippedItems} pulado</span>}
                </div>
                {activeManifestCampaign.totalItems > 0 && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'rgba(0,0,0,0.08)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        background: '#2563eb',
                        width: `${Math.min(100, Math.round(((activeManifestCampaign.succeededItems + activeManifestCampaign.failedItems + activeManifestCampaign.skippedItems) / activeManifestCampaign.totalItems) * 100))}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              {isAdmin && (
                <FeatureGuard id="btn_trigger_campaign">
                  <button
                    type="button"
                    disabled={triggerMutation.isPending || !!activeManifestCampaign}
                    onClick={() => triggerMutation.mutate()}
                    className="flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
                  >
                    {triggerMutation.isPending
                      ? <Loader2 size={14} className="animate-spin" />
                      : <PlayCircle size={14} />}
                    {activeManifestCampaign ? 'Campanha em andamento' : 'Executar agora'}
                  </button>
                </FeatureGuard>
              )}
              <ButtonDefault visual="ghost" label="Atualizar" icon={RefreshCw} onClick={() => void refetchCampaigns()} />
            </div>

            {campaignsLoading && <PageLoading />}
            {campaignsError && (
              <Card>
                <PageError
                  message={campaignsError instanceof Error ? campaignsError.message : undefined}
                  onRetry={() => void refetchCampaigns()}
                />
              </Card>
            )}
            {!campaignsLoading && !campaignsError && (
              (campaigns ?? []).length === 0
                ? (
                  <Card>
                    <EmptyState
                      icon={GitPullRequest}
                      title="Nenhuma campanha ainda"
                      description='Clique em "Executar agora" para corrigir automaticamente todos os workloads com findings de compliance.'
                    />
                  </Card>
                )
                : (
                  <div className="space-y-3">
                    {(campaigns ?? []).map(campaign => (
                      <CampaignRow
                        key={campaign.id}
                        campaign={campaign}
                        onCancel={(id) => cancelMutation.mutate(id)}
                        cancelling={cancellingId === campaign.id}
                      />
                    ))}
                  </div>
                )
            )}
          </div>
        )}

        {pageTab === 'remediation' && (
          <>
            <SummaryStrip
              items={[
                { label: 'Ativos', value: summary.active, helper: 'ações abertas' },
                { label: 'Com PR', value: summary.withPr, helper: 'trilha rastreável' },
                { label: 'Sem PR', value: summary.withoutPr, helper: 'pedem abertura' },
                { label: 'Score médio', value: formatNumber(summary.avgScore), helper: 'fila atual' },
              ]}
            />

        <Card>
          <div className="grid gap-4 xl:grid-cols-[1.2fr_auto]">
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar por workload, namespace ou cluster"
              icon={Search}
            />
            <FocusTabs
              active={filter}
              onChange={id => setFilter(id as RemediationFilter)}
              items={[
                { id: 'active', label: 'Ativos', count: summary.active },
                { id: 'with_pr', label: 'Com PR', count: summary.withPr },
                { id: 'without_pr', label: 'Sem PR', count: summary.withoutPr },
                { id: 'all', label: 'Todos', count: queue.length },
              ]}
            />
          </div>
        </Card>

        {filtered.length === 0 ? (
          <Card>
            <EmptyState
              icon={Sparkles}
              title="Nenhum item neste recorte"
              description="Ajuste o filtro ou a busca para ampliar a fila."
            />
          </Card>
        ) : (
          <section className="grid gap-4 xl:grid-cols-[23rem_minmax(0,1fr)]">
            <Card className="h-full">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                    Fila de remediação
                  </p>
                  <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                    {filtered.length} workloads
                  </p>
                </div>
                <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                  {formatEnum(filter)}
                </span>
              </div>

              <div className="mt-4">
                <SelectionList
                  items={filtered.map(item => ({
                    id: item.id,
                    title: item.name,
                    subtitle: `${item.namespace} · ${item.cluster} · ${formatEnum(item.environment)}`,
                    badges: (
                      <>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(item.remediationStatus ?? item.complianceStatus)}`}>
                          {formatEnum(item.remediationStatus ?? item.complianceStatus)}
                        </span>
                        {item.githubPrUrl && (
                          <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-primary-strong)' }}>
                            PR aberto
                          </span>
                        )}
                      </>
                    ),
                    meta: (
                      <span className="text-xs font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>
                        {item.overallScore === null ? 'N/D' : item.overallScore.toFixed(1)}
                      </span>
                    ),
                  }))}
                  activeId={selected?.id ?? null}
                  onSelect={id => {
                    setSelectedId(id)
                    setFocus('overview')
                  }}
                />
              </div>
            </Card>

            {selected && (
              <div className="space-y-4">
                <Card>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-black tracking-tight" style={{ color: 'var(--color-foreground)' }}>{selected.name}</p>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(selected.remediationStatus ?? selected.complianceStatus)}`}>
                          {formatEnum(selected.remediationStatus ?? selected.complianceStatus)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                        {selected.namespace} · {selected.cluster} · {formatEnum(selected.environment)}
                      </p>
                    </div>

                    <FocusTabs
                      active={focus}
                      onChange={id => setFocus(id as RemediationFocus)}
                      items={[
                        { id: 'overview', label: 'Resumo' },
                        { id: 'signals', label: 'Sinais' },
                        { id: 'actions', label: 'Ações' },
                      ]}
                    />
                  </div>
                </Card>

                {focus === 'overview' && (
                  <DetailPanel
                    title="Resumo do item"
                    subtitle="Leitura curta para decidir a próxima ação."
                    headerMeta={
                      <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                        score {selected.overallScore === null ? 'N/D' : selected.overallScore.toFixed(1)}
                      </span>
                    }
                  >
                    <div className="grid gap-3 md:grid-cols-4">
                      <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Score</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{selected.overallScore === null ? 'N/D' : selected.overallScore.toFixed(1)}</p></Card>
                      <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Conformidade</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{formatEnum(selected.complianceStatus)}</p></Card>
                      <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Remediação</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{formatEnum(selected.remediationStatus)}</p></Card>
                      <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>PR</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{selected.githubPrUrl ? 'Disponível' : 'Não publicado'}</p></Card>
                    </div>

                    <InlineAccordion title="Resumo" defaultOpen>
                      <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                        {selected.githubPrUrl
                          ? 'Existe uma trilha aberta de correção. O foco agora é acompanhar merge, rollout e validação.'
                          : 'Ainda não existe PR vinculado. O foco agora é transformar o problema em ação rastreável.'}
                      </p>
                    </InlineAccordion>
                  </DetailPanel>
                )}

                {focus === 'signals' && (
                  <DetailPanel title="Sinais do item" subtitle="Contexto técnico mínimo para orientar a correção.">
                    <InlineAccordion title="Sinais" defaultOpen>
                      <div className="space-y-2">
                        {[
                          `Namespace: ${selected.namespace}`,
                          `Cluster: ${selected.cluster}`,
                          `Ambiente: ${formatEnum(selected.environment)}`,
                          `Status atual: ${formatEnum(selected.remediationStatus ?? selected.complianceStatus)}`,
                          `Última leitura: ${formatDate(new Date().toISOString())}`,
                        ].map(item => (
                          <div key={item} className="rounded-2xl px-3 py-2" style={{ backgroundColor: 'var(--color-muted)' }}>
                            <p className="text-sm" style={{ color: 'var(--color-foreground)' }}>{item}</p>
                          </div>
                        ))}
                      </div>
                    </InlineAccordion>
                  </DetailPanel>
                )}

                {focus === 'actions' && (
                  <DetailPanel title="Próximas ações" subtitle="O essencial para tirar o item da fila.">
                    <InlineAccordion title="Checklist" defaultOpen>
                      <div className="space-y-2">
                        {[
                          'Confirmar owner técnico do workload.',
                          'Validar causa e escopo da não conformidade.',
                          selected.githubPrUrl ? 'Acompanhar PR até rollout.' : 'Abrir PR ou tarefa de correção.',
                        ].map(item => (
                          <div key={item} className="rounded-2xl px-3 py-2" style={{ backgroundColor: 'var(--color-muted)' }}>
                            <p className="text-sm" style={{ color: 'var(--color-foreground)' }}>{item}</p>
                          </div>
                        ))}
                      </div>
                    </InlineAccordion>

                    <div className="flex flex-wrap gap-2">
                      <ButtonDefault
                        label="Abrir aplicação"
                        icon={ArrowRight}
                        onClick={() => navigate(`/applications/${selected.id}`)}
                      />
                      <ButtonDefault
                        label="Abrir scorecard"
                        visual="secondary"
                        icon={Wrench}
                        onClick={() => navigate(`/applications/${selected.id}/scorecard`)}
                      />
                      {selected.githubPrUrl && (
                        <a href={selected.githubPrUrl} target="_blank" rel="noreferrer">
                          <ButtonDefault label="Abrir PR" visual="secondary" icon={GitPullRequest} />
                        </a>
                      )}
                      {!selected.githubPrUrl && (
                        <ButtonDefault label="Sem PR publicado" visual="secondary" icon={ExternalLink} disabled />
                      )}
                    </div>
                  </DetailPanel>
                )}
              </div>
            )}
          </section>
        )}
          </>
        )}
      </div>
    </div>
  )
}
