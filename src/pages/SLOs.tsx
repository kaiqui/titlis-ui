import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Activity, Database, Layers3, Search, ShieldCheck, Target } from 'lucide-react'
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
import { useSloCatalog, useSloLookup } from '@/hooks/useApi'
import { formatDate, formatEnum, statusTone } from '@/lib/utils'

type SloFilter = 'all' | 'healthy' | 'attention' | 'unsynced'
type SloFocus = 'overview' | 'sync' | 'lookup'

function isHealthy(state: string | null) {
  return state === 'OK'
}

export function SLOs() {
  const [namespaceInput, setNamespaceInput] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [search, setSearch] = useState('')
  const [clusterFilter, setClusterFilter] = useState('all')
  const [stateFilter, setStateFilter] = useState<SloFilter>('all')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [manualQuery, setManualQuery] = useState<{ namespace: string; name: string } | null>(null)
  const [focus, setFocus] = useState<SloFocus>('overview')

  const sloCatalog = useSloCatalog(undefined, clusterFilter === 'all' ? undefined : clusterFilter)
  const catalog = sloCatalog.data ?? []
  const clusters = ['all', ...new Set(catalog.map(item => item.cluster))]

  const filtered = catalog.filter(item => {
    const term = search.trim().toLowerCase()
    const matchesSearch = term.length === 0
      || item.name.toLowerCase().includes(term)
      || item.namespace.toLowerCase().includes(term)
      || item.cluster.toLowerCase().includes(term)

    const matchesState = stateFilter === 'all'
      || (stateFilter === 'healthy' && isHealthy(item.datadogSloState))
      || (stateFilter === 'attention' && !isHealthy(item.datadogSloState) && item.lastSyncAt !== null)
      || (stateFilter === 'unsynced' && item.lastSyncAt === null)

    return matchesSearch && matchesState
  })

  useEffect(() => {
    if (filtered.length === 0) {
      if (selectedKey !== null && !manualQuery) setSelectedKey(null)
      return
    }

    if (!selectedKey || !filtered.some(item => `${item.namespace}:${item.name}` === selectedKey)) {
      const next = `${filtered[0].namespace}:${filtered[0].name}`
      setSelectedKey(next)
      setNamespaceInput(filtered[0].namespace)
      setNameInput(filtered[0].name)
      setManualQuery(null)
      setFocus('overview')
    }
  }, [filtered, selectedKey, manualQuery])

  const selectedCatalogItem = filtered.find(item => `${item.namespace}:${item.name}` === selectedKey)
    ?? catalog.find(item => `${item.namespace}:${item.name}` === selectedKey)
    ?? null

  const lookupTarget = selectedCatalogItem
    ? { namespace: selectedCatalogItem.namespace, name: selectedCatalogItem.name }
    : manualQuery

  const sloQuery = useSloLookup(
    lookupTarget?.namespace ?? '',
    lookupTarget?.name ?? '',
    lookupTarget !== null,
  )

  const summary = useMemo(() => ({
    total: catalog.length,
    healthy: catalog.filter(item => isHealthy(item.datadogSloState)).length,
    attention: catalog.filter(item => !isHealthy(item.datadogSloState) && item.lastSyncAt !== null).length,
    unsynced: catalog.filter(item => item.lastSyncAt === null).length,
  }), [catalog])

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const namespace = namespaceInput.trim()
    const name = nameInput.trim()

    if (!namespace || !name) return

    setSelectedKey(null)
    setManualQuery({ namespace, name })
    setFocus('lookup')
  }

  if (sloCatalog.isLoading) return <><Header title="SLOs" /><PageLoading /></>
  if (sloCatalog.error) {
    return (
      <>
        <Header title="SLOs" />
        <PageError message={sloCatalog.error instanceof Error ? sloCatalog.error.message : undefined} onRetry={() => void sloCatalog.refetch()} />
      </>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="SLOs" subtitle="Catálogo, lookup e detalhe na mesma página, com um SLO em foco por vez." />

      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">
        <SummaryStrip
          items={[
            { label: 'Catálogo', value: summary.total, helper: 'SLOs reconciliados' },
            { label: 'Saudáveis', value: summary.healthy, helper: 'estado OK no Datadog' },
            { label: 'Atenção', value: summary.attention, helper: 'pedem revisão' },
            { label: 'Sem sync', value: summary.unsynced, helper: 'ainda sem sincronização' },
          ]}
        />

        <Card>
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.7fr_auto]">
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar por nome, namespace ou cluster"
              icon={Search}
            />

            <select
              value={clusterFilter}
              onChange={event => setClusterFilter(event.target.value)}
              className="jc-select px-4 py-3 text-sm outline-none"
            >
              {clusters.map(option => (
                <option key={option} value={option}>
                  {option === 'all' ? 'Todos os clusters' : option}
                </option>
              ))}
            </select>

            <FocusTabs
              active={stateFilter}
              onChange={id => setStateFilter(id as SloFilter)}
              items={[
                { id: 'all', label: 'Todos', count: summary.total },
                { id: 'healthy', label: 'Saudáveis', count: summary.healthy },
                { id: 'attention', label: 'Atenção', count: summary.attention },
                { id: 'unsynced', label: 'Sem sync', count: summary.unsynced },
              ]}
            />
          </div>

          <form onSubmit={onSubmit} className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr_auto]">
            <Input
              value={namespaceInput}
              onChange={event => setNamespaceInput(event.target.value)}
              placeholder="Namespace para lookup"
              icon={Database}
            />
            <Input
              value={nameInput}
              onChange={event => setNameInput(event.target.value)}
              placeholder="Nome do SLO"
              icon={Target}
            />
            <button
              type="submit"
              disabled={!namespaceInput.trim() || !nameInput.trim()}
              className="jc-primary-button inline-flex items-center justify-center gap-2 px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Search size={14} />
              Abrir lookup
            </button>
          </form>
        </Card>

        {catalog.length === 0 ? (
          <Card>
            <EmptyState
              icon={Target}
              title="Nenhum SLO reconciliado"
              description="Assim que o operator sincronizar SLOs, eles aparecem aqui automaticamente."
            />
          </Card>
        ) : (
          <section className="grid gap-4 xl:grid-cols-[23rem_minmax(0,1fr)]">
            <Card className="h-full">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                    Catálogo ativo
                  </p>
                  <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                    {filtered.length} SLOs
                  </p>
                </div>
                <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                  {clusterFilter === 'all' ? 'Todos os clusters' : clusterFilter}
                </span>
              </div>

              <div className="mt-4">
                <SelectionList
                  items={filtered.map(item => ({
                    id: `${item.namespace}:${item.name}`,
                    title: item.name,
                    subtitle: `${item.namespace} · ${item.cluster} · ${formatEnum(item.environment)}`,
                    badges: (
                      <>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(item.datadogSloState)}`}>
                          {formatEnum(item.datadogSloState)}
                        </span>
                        <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                          {formatEnum(item.sloType)}
                        </span>
                      </>
                    ),
                    meta: (
                      <span className="text-xs font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>
                        {item.target === null ? 'N/D' : `${item.target}%`}
                      </span>
                    ),
                  }))}
                  activeId={selectedCatalogItem ? `${selectedCatalogItem.namespace}:${selectedCatalogItem.name}` : null}
                  onSelect={id => {
                    const next = catalog.find(item => `${item.namespace}:${item.name}` === id)
                    if (!next) return
                    setSelectedKey(id)
                    setNamespaceInput(next.namespace)
                    setNameInput(next.name)
                    setManualQuery(null)
                    setFocus('overview')
                  }}
                />
              </div>
            </Card>

            {lookupTarget && (
              <div className="space-y-4">
                <Card>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-black tracking-tight" style={{ color: 'var(--color-foreground)' }}>
                          {lookupTarget.name}
                        </p>
                        {sloQuery.data?.datadogSloState && (
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(sloQuery.data.datadogSloState)}`}>
                            {formatEnum(sloQuery.data.datadogSloState)}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                        {lookupTarget.namespace}
                        {selectedCatalogItem ? ` · ${selectedCatalogItem.cluster}` : ' · lookup manual'}
                      </p>
                    </div>

                    <FocusTabs
                      active={focus}
                      onChange={id => setFocus(id as SloFocus)}
                      items={[
                        { id: 'overview', label: 'Resumo' },
                        { id: 'sync', label: 'Sync' },
                        { id: 'lookup', label: 'Lookup' },
                      ]}
                    />
                  </div>
                </Card>

                {sloQuery.isLoading ? (
                  <Card>
                    <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                      Carregando detalhe do SLO selecionado.
                    </p>
                  </Card>
                ) : sloQuery.error ? (
                  <PageError message={sloQuery.error instanceof Error ? sloQuery.error.message : undefined} onRetry={() => void sloQuery.refetch()} />
                ) : !sloQuery.data ? (
                  <Card>
                    <EmptyState
                      icon={Search}
                      title="SLO não encontrado"
                      description="Confira se o namespace e o nome estão corretos ou se o operator já reconciliou este recurso."
                    />
                  </Card>
                ) : (
                  <>
                    {focus === 'overview' && (
                      <DetailPanel
                        title="Resumo do SLO"
                        subtitle="Leitura rápida do estado reconciliado."
                        headerMeta={<span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>{formatEnum(sloQuery.data.sloType)}</span>}
                      >
                        <div className="grid gap-3 md:grid-cols-4">
                          <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Namespace</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{sloQuery.data.namespace}</p></Card>
                          <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Target</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{sloQuery.data.target === null ? 'N/D' : `${sloQuery.data.target}%`}</p></Card>
                          <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Timeframe</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{sloQuery.data.timeframe}</p></Card>
                          <Card><p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Estado</p><p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{formatEnum(sloQuery.data.datadogSloState)}</p></Card>
                        </div>

                        <InlineAccordion title="Resumo" defaultOpen>
                          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                            Use esta visão para confirmar rapidamente se o SLO foi reconciliado, qual meta está aplicada e se o estado atual exige investigação.
                          </p>
                        </InlineAccordion>
                      </DetailPanel>
                    )}

                    {focus === 'sync' && (
                      <DetailPanel title="Sincronização e detecção" subtitle="Metadados persistidos após a reconciliação do operator.">
                        <InlineAccordion title="Metadados" defaultOpen>
                          <div className="grid gap-3 md:grid-cols-2">
                            {[
                              ['Framework detectado', formatEnum(sloQuery.data.detectedFramework)],
                              ['Fonte da detecção', formatEnum(sloQuery.data.detectionSource)],
                              ['Datadog SLO ID', sloQuery.data.datadogSloId ?? 'Não informado'],
                              ['Última sincronização', formatDate(sloQuery.data.lastSyncAt)],
                            ].map(([label, value]) => (
                              <Card key={label}>
                                <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{label}</p>
                                <p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{value}</p>
                              </Card>
                            ))}
                          </div>
                        </InlineAccordion>
                      </DetailPanel>
                    )}

                    {focus === 'lookup' && (
                      <DetailPanel title="Lookup direto" subtitle="Campos retornados pelo endpoint de consulta do SLO.">
                        <InlineAccordion title="Campos do lookup" defaultOpen>
                          <div className="grid gap-3 md:grid-cols-2">
                            {[
                              { label: 'Namespace', value: sloQuery.data.namespace, icon: Database },
                              { label: 'Nome do SLO', value: sloQuery.data.name, icon: Target },
                              { label: 'Target', value: sloQuery.data.target === null ? 'N/D' : `${sloQuery.data.target}%`, icon: ShieldCheck },
                              { label: 'Timeframe', value: sloQuery.data.timeframe, icon: Activity },
                              { label: 'Framework', value: formatEnum(sloQuery.data.detectedFramework), icon: Layers3 },
                            ].map(({ label, value, icon: Icon }) => (
                              <div key={label} className="rounded-2xl px-4 py-4" style={{ backgroundColor: 'var(--color-muted)' }}>
                                <div className="flex items-center gap-2">
                                  <Icon size={15} style={{ color: 'var(--color-primary)' }} />
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                                    {label}
                                  </p>
                                </div>
                                <p className="mt-3 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{value}</p>
                              </div>
                            ))}
                          </div>
                        </InlineAccordion>
                      </DetailPanel>
                    )}
                  </>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
