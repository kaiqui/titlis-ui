import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, ExternalLink, GitPullRequest, Search, Sparkles, Wrench } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { ButtonDefault } from '@/components/jeitto/ButtonDefault'
import { Card } from '@/components/jeitto/Card'
import { EmptyState } from '@/components/jeitto/EmptyState'
import { Input } from '@/components/jeitto/Input'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { DetailPanel } from '@/components/sre/DetailPanel'
import { FocusTabs } from '@/components/sre/FocusTabs'
import { InlineAccordion } from '@/components/sre/InlineAccordion'
import { SelectionList } from '@/components/sre/SelectionList'
import { SummaryStrip } from '@/components/sre/SummaryStrip'
import { useDashboardWorkloads } from '@/hooks/useApi'
import { buildRemediationQueue } from '@/lib/insights'
import { formatDate, formatEnum, formatNumber, statusTone } from '@/lib/utils'

type RemediationFilter = 'active' | 'with_pr' | 'without_pr' | 'all'
type RemediationFocus = 'overview' | 'signals' | 'actions'

export function Recommendations() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<RemediationFilter>('active')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focus, setFocus] = useState<RemediationFocus>('overview')
  const { data: workloads, isLoading, error, refetch } = useDashboardWorkloads()
  const workloadList = workloads ?? []
  const queue = buildRemediationQueue(workloadList)

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
      <Header title="Remediação" subtitle="Fila única com foco por item e próxima ação sempre visível." />

      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">
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
      </div>
    </div>
  )
}
