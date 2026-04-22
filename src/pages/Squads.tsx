import { useEffect, useMemo, useState } from 'react'
import { Globe2, Layers3, Network } from 'lucide-react'
import { Card } from '@/components/jeitto/Card'
import { EmptyState } from '@/components/jeitto/EmptyState'
import { Input } from '@/components/jeitto/Input'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { Header } from '@/components/layout/Header'
import { DetailPanel } from '@/components/sre/DetailPanel'
import { FocusTabs } from '@/components/sre/FocusTabs'
import { InlineAccordion } from '@/components/sre/InlineAccordion'
import { SelectionList } from '@/components/sre/SelectionList'
import { SummaryStrip } from '@/components/sre/SummaryStrip'
import { useDashboardWorkloads } from '@/hooks/useApi'
import { buildClusterSummaries, buildNamespaceSummaries, buildPlatformSummary } from '@/lib/insights'
import { formatEnum, formatNumber } from '@/lib/utils'

type TopologyFocus = 'clusters' | 'namespaces'
type DetailFocus = 'overview' | 'coverage' | 'risk'

export function Squads() {
  const [search, setSearch] = useState('')
  const [focus, setFocus] = useState<TopologyFocus>('clusters')
  const [detailFocus, setDetailFocus] = useState<DetailFocus>('overview')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data: workloads, isLoading, error, refetch } = useDashboardWorkloads()
  const workloadList = workloads ?? []
  const summary = buildPlatformSummary(workloadList)
  const clusters = buildClusterSummaries(workloadList)
  const namespaces = buildNamespaceSummaries(workloadList)

  const entries = useMemo(() => {
    if (focus === 'clusters') {
      return clusters
        .filter(item => {
          const term = search.trim().toLowerCase()
          return term.length === 0
            || item.cluster.toLowerCase().includes(term)
            || item.environment.toLowerCase().includes(term)
        })
        .map(item => ({
          id: item.key,
          title: item.cluster,
          subtitle: `${formatEnum(item.environment)} · ${item.workloadCount} workloads`,
          badges: (
            <>
              <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                {item.namespaces} namespaces
              </span>
              <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-primary-strong)' }}>
                score {formatNumber(item.averageScore)}
              </span>
            </>
          ),
          meta: (
            <span className="text-xs font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>
              {item.nonCompliantCount} risco
            </span>
          ),
          entity: item,
        }))
    }

    return namespaces
      .filter(item => {
        const term = search.trim().toLowerCase()
        return term.length === 0
          || item.namespace.toLowerCase().includes(term)
          || item.cluster.toLowerCase().includes(term)
          || item.environment.toLowerCase().includes(term)
      })
      .map(item => ({
        id: item.key,
        title: item.namespace,
        subtitle: `${item.cluster} · ${formatEnum(item.environment)}`,
        badges: (
          <>
            <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
              {item.workloadCount} workloads
            </span>
            <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-primary-strong)' }}>
              score {formatNumber(item.averageScore)}
            </span>
          </>
        ),
        meta: (
          <span className="text-xs font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>
            {item.openRemediations} abertos
          </span>
        ),
        entity: item,
      }))
  }, [clusters, focus, namespaces, search])

  useEffect(() => {
    if (entries.length === 0) {
      if (selectedId !== null) setSelectedId(null)
      return
    }

    if (!selectedId || !entries.some(item => item.id === selectedId)) {
      setSelectedId(entries[0].id)
      setDetailFocus('overview')
    }
  }, [entries, selectedId])

  const selected = entries.find(item => item.id === selectedId) ?? null
  const selectedCluster = focus === 'clusters'
    ? clusters.find(item => item.key === selectedId) ?? null
    : null
  const selectedNamespace = focus === 'namespaces'
    ? namespaces.find(item => item.key === selectedId) ?? null
    : null

  if (isLoading) return <><Header title="Topologia" /><PageLoading /></>
  if (error || !workloads) {
    return (
      <>
        <Header title="Topologia" />
        <PageError message={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
      </>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Topologia" subtitle="Inventário, cobertura e risco no mesmo workspace." />

      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">
        <SummaryStrip
          items={[
            { label: 'Clusters', value: summary.clusters, helper: 'escopos ativos' },
            { label: 'Namespaces', value: summary.namespaces, helper: 'combinações monitoradas' },
            { label: 'Cobertura', value: `${summary.scoredWorkloads}/${summary.totalWorkloads}`, helper: 'services com scorecard' },
            { label: 'Conformes', value: summary.compliantCount, helper: 'em faixa saudável' },
          ]}
        />

        <Card>
          <div className="grid gap-4 xl:grid-cols-[1.2fr_auto_auto]">
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={focus === 'clusters' ? 'Buscar por cluster ou ambiente' : 'Buscar por namespace, cluster ou ambiente'}
              icon={focus === 'clusters' ? Network : Layers3}
            />

            <FocusTabs
              active={focus}
              onChange={id => setFocus(id as TopologyFocus)}
              items={[
                { id: 'clusters', label: 'Clusters', count: clusters.length },
                { id: 'namespaces', label: 'Namespaces', count: namespaces.length },
              ]}
            />

            <p className="self-center text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              Menos gráfico, mais leitura operacional
            </p>
          </div>
        </Card>

        {entries.length === 0 ? (
          <Card>
            <EmptyState
              icon={Globe2}
              title="Nenhum item neste recorte"
              description="Ajuste a busca para ampliar o inventário."
            />
          </Card>
        ) : (
          <section className="grid gap-4 xl:grid-cols-[23rem_minmax(0,1fr)]">
            <Card className="h-full">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                    Inventário
                  </p>
                  <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                    {entries.length} itens
                  </p>
                </div>
                <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                  {focus === 'clusters' ? 'visão por cluster' : 'visão por namespace'}
                </span>
              </div>

              <div className="mt-4">
                <SelectionList
                  items={entries.map(item => ({
                    id: item.id,
                    title: item.title,
                    subtitle: item.subtitle,
                    badges: item.badges,
                    meta: item.meta,
                  }))}
                  activeId={selected?.id ?? null}
                  onSelect={id => {
                    setSelectedId(id)
                    setDetailFocus('overview')
                  }}
                />
              </div>
            </Card>

            {selected && (
              <div className="space-y-4">
                <Card>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <p className="text-lg font-black tracking-tight" style={{ color: 'var(--color-foreground)' }}>
                        {selected.title}
                      </p>
                      <p className="mt-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                        {selected.subtitle}
                      </p>
                    </div>

                    <FocusTabs
                      active={detailFocus}
                      onChange={id => setDetailFocus(id as DetailFocus)}
                      items={[
                        { id: 'overview', label: 'Resumo' },
                        { id: 'coverage', label: 'Cobertura' },
                        { id: 'risk', label: 'Risco' },
                      ]}
                    />
                  </div>
                </Card>

                {selectedCluster && detailFocus === 'overview' && (
                  <DetailPanel title="Resumo do cluster" subtitle="Visão curta para capacidade e organização.">
                    <div className="grid gap-3 md:grid-cols-4">
                      <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Services</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{selectedCluster.workloadCount}</p></Card>
                      <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Namespaces</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{selectedCluster.namespaces}</p></Card>
                      <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Ambiente</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{formatEnum(selectedCluster.environment)}</p></Card>
                      <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Score médio</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{formatNumber(selectedCluster.averageScore)}</p></Card>
                    </div>

                    <InlineAccordion title="Leitura rápida" defaultOpen>
                      <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                        Use esta visão para saber se o cluster concentra muito inventário, pouca cobertura ou risco operacional acima da média.
                      </p>
                    </InlineAccordion>
                  </DetailPanel>
                )}

                {selectedCluster && detailFocus === 'coverage' && (
                  <DetailPanel title="Cobertura do cluster" subtitle="O que já está materializado e o que ainda falta ler.">
                    <InlineAccordion title="Cobertura" defaultOpen>
                      <div className="grid gap-3 md:grid-cols-3">
                        <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Com score</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{selectedCluster.scoredWorkloads}</p></Card>
                        <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Conformes</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{selectedCluster.compliantCount}</p></Card>
                        <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Remediações</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{selectedCluster.remediatedCount}</p></Card>
                      </div>
                    </InlineAccordion>
                  </DetailPanel>
                )}

                {selectedCluster && detailFocus === 'risk' && (
                  <DetailPanel title="Risco do cluster" subtitle="Sinais mínimos para priorização.">
                    <InlineAccordion title="Risco" defaultOpen>
                      <div className="space-y-2">
                        {[
                          `${selectedCluster.nonCompliantCount} services fora de conformidade`,
                          `${selectedCluster.remediatedCount} services com remediação aberta`,
                          `score médio ${formatNumber(selectedCluster.averageScore)} no recorte atual`,
                        ].map(item => (
                          <div key={item} className="rounded-2xl px-3 py-2" style={{ backgroundColor: 'var(--color-muted)' }}>
                            <p className="text-sm" style={{ color: 'var(--color-foreground)' }}>{item}</p>
                          </div>
                        ))}
                      </div>
                    </InlineAccordion>
                  </DetailPanel>
                )}

                {selectedNamespace && detailFocus === 'overview' && (
                  <DetailPanel title="Resumo do namespace" subtitle="Visão curta do domínio selecionado.">
                    <div className="grid gap-3 md:grid-cols-4">
                      <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Services</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{selectedNamespace.workloadCount}</p></Card>
                      <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Cluster</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{selectedNamespace.cluster}</p></Card>
                      <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Ambiente</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{formatEnum(selectedNamespace.environment)}</p></Card>
                      <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Score médio</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{formatNumber(selectedNamespace.averageScore)}</p></Card>
                    </div>

                    <InlineAccordion title="Leitura rápida" defaultOpen>
                      <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                        Este resumo ajuda a ver rapidamente se o namespace está concentrando risco ou remediações abertas demais.
                      </p>
                    </InlineAccordion>
                  </DetailPanel>
                )}

                {selectedNamespace && detailFocus === 'coverage' && (
                  <DetailPanel title="Cobertura do namespace" subtitle="O que já foi lido e onde ainda existe lacuna.">
                    <InlineAccordion title="Cobertura" defaultOpen>
                      <div className="grid gap-3 md:grid-cols-3">
                        <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Services</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{selectedNamespace.workloadCount}</p></Card>
                        <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Score médio</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{formatNumber(selectedNamespace.averageScore)}</p></Card>
                        <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Remediações</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{selectedNamespace.openRemediations}</p></Card>
                      </div>
                    </InlineAccordion>
                  </DetailPanel>
                )}

                {selectedNamespace && detailFocus === 'risk' && (
                  <DetailPanel title="Risco do namespace" subtitle="Itens centrais para priorizar atuação.">
                    <InlineAccordion title="Risco" defaultOpen>
                      <div className="space-y-2">
                        {[
                          `${selectedNamespace.nonCompliantCount} workloads fora de conformidade`,
                          `${selectedNamespace.openRemediations} remediações abertas`,
                          `score médio ${formatNumber(selectedNamespace.averageScore)} neste namespace`,
                        ].map(item => (
                          <div key={item} className="rounded-2xl px-3 py-2" style={{ backgroundColor: 'var(--color-muted)' }}>
                            <p className="text-sm" style={{ color: 'var(--color-foreground)' }}>{item}</p>
                          </div>
                        ))}
                      </div>
                    </InlineAccordion>
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
