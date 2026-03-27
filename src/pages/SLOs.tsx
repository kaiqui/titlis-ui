import { useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  ArrowRight,
  Database,
  Layers3,
  Search,
  ShieldCheck,
  Target,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageError, PageLoading } from '@/components/ui/PageState'
import { useSloCatalog, useSloLookup } from '@/hooks/useApi'
import { formatDate, formatEnum, statusTone } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

export function SLOs() {
  const [namespaceInput, setNamespaceInput] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [clusterFilter, setClusterFilter] = useState('all')
  const [query, setQuery] = useState<{ namespace: string; name: string } | null>(null)

  const sloCatalog = useSloCatalog(undefined, clusterFilter === 'all' ? undefined : clusterFilter)
  const sloQuery = useSloLookup(query?.namespace ?? '', query?.name ?? '', query !== null)

  const clusters = ['all', ...new Set((sloCatalog.data ?? []).map(item => item.cluster))]

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setQuery({
      namespace: namespaceInput.trim(),
      name: nameInput.trim(),
    })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title="SLOs reconciliados"
        subtitle="Catálogo dos SLOs criados pelo operator e persistidos no titlis-api, com inspeção detalhada por namespace e nome."
      />

      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden">
            <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr] lg:items-center">
              <div className="space-y-3">
                <span
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                  style={{ backgroundColor: 'var(--color-primary-soft)', color: 'var(--color-primary-strong)' }}
                >
                  SLOs do operator
                </span>
                <h2 className="text-3xl font-black tracking-tight" style={{ color: 'var(--color-foreground)' }}>
                  Veja o que ja foi reconciliado e aprofunde quando precisar.
                </h2>
                <p className="max-w-2xl text-sm leading-6" style={{ color: 'var(--color-muted-foreground)' }}>
                  A pagina agora mostra os SLOs que o operator criou e a API persistiu. O lookup detalhado continua disponivel para abrir qualquer item com precisao.
                </p>
              </div>

              <form onSubmit={onSubmit} className="grid gap-3">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                    Namespace
                  </span>
                  <input
                    value={namespaceInput}
                    onChange={event => setNamespaceInput(event.target.value)}
                    placeholder="ex: payments-prod"
                    className="rounded-2xl border px-4 py-3 text-sm outline-none"
                    style={{
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-muted)',
                      color: 'var(--color-foreground)',
                    }}
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                    Nome do SLO
                  </span>
                  <input
                    value={nameInput}
                    onChange={event => setNameInput(event.target.value)}
                    placeholder="ex: api-availability"
                    className="rounded-2xl border px-4 py-3 text-sm outline-none"
                    style={{
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-muted)',
                      color: 'var(--color-foreground)',
                    }}
                  />
                </label>
                <button
                  type="submit"
                  disabled={!namespaceInput.trim() || !nameInput.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Search size={14} />
                  Abrir detalhes
                </button>
              </form>
            </div>
          </Card>
        </motion.section>

        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                Catalogo
              </p>
              <p className="mt-2 text-2xl font-black tracking-tight" style={{ color: 'var(--color-foreground)' }}>
                {sloCatalog.data?.length ?? 0} SLOs reconciliados
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                Itens persistidos pelo fluxo do operator para Datadog.
              </p>
            </div>

            <select
              value={clusterFilter}
              onChange={event => setClusterFilter(event.target.value)}
              className="rounded-2xl border px-4 py-3 text-sm outline-none"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-muted)',
                color: 'var(--color-foreground)',
              }}
            >
              {clusters.map(option => (
                <option key={option} value={option}>
                  {option === 'all' ? 'Todos os clusters' : option}
                </option>
              ))}
            </select>
          </div>
        </Card>

        {sloCatalog.isLoading && <PageLoading />}

        {sloCatalog.error && (
          <PageError message={sloCatalog.error instanceof Error ? sloCatalog.error.message : undefined} onRetry={() => void sloCatalog.refetch()} />
        )}

        {!sloCatalog.isLoading && !sloCatalog.error && (sloCatalog.data?.length ?? 0) === 0 && (
          <Card>
            <EmptyState
              icon={Target}
              title="Nenhum SLO reconciliado"
              description="Assim que o operator criar e sincronizar SLOs, eles aparecem aqui automaticamente."
            />
          </Card>
        )}

        {(sloCatalog.data?.length ?? 0) > 0 && (
          <section className="grid gap-4 xl:grid-cols-2">
            {sloCatalog.data?.map(item => (
              <Card
                key={item.sloConfigId}
                hover
                onClick={() => {
                  setNamespaceInput(item.namespace)
                  setNameInput(item.name)
                  setQuery({ namespace: item.namespace, name: item.name })
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-lg font-black tracking-tight" style={{ color: 'var(--color-foreground)' }}>
                        {item.name}
                      </h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(item.datadogSloState)}`}>
                        {formatEnum(item.datadogSloState)}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full px-3 py-1" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                        {item.namespace}
                      </span>
                      <span className="rounded-full px-3 py-1" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                        {item.cluster}
                      </span>
                      <span className="rounded-full px-3 py-1" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                        {formatEnum(item.environment)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {(
                        [
                          { label: 'Tipo', value: formatEnum(item.sloType), icon: Target },
                          { label: 'Timeframe', value: item.timeframe, icon: Activity },
                          { label: 'Target', value: item.target === null ? 'N/D' : `${item.target}%`, icon: ShieldCheck },
                          { label: 'Framework', value: formatEnum(item.detectedFramework), icon: Layers3 },
                        ] satisfies Array<{ label: string; value: string; icon: LucideIcon }>
                      ).map(({ label, value, icon: Icon }) => (
                        <div key={label} className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--color-muted)' }}>
                          <div className="flex items-center gap-2">
                            <Icon size={14} style={{ color: 'var(--color-primary)' }} />
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                              {label}
                            </p>
                          </div>
                          <p className="mt-2 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={event => {
                      event.stopPropagation()
                      setNamespaceInput(item.namespace)
                      setNameInput(item.name)
                      setQuery({ namespace: item.namespace, name: item.name })
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-600"
                    type="button"
                  >
                    Ver detalhe
                    <ArrowRight size={13} />
                  </button>
                </div>
              </Card>
            ))}
          </section>
        )}

        {sloQuery.error && (
          <PageError message={sloQuery.error instanceof Error ? sloQuery.error.message : undefined} onRetry={() => void sloQuery.refetch()} />
        )}

        {query && !sloQuery.isLoading && !sloQuery.error && !sloQuery.data && (
          <Card>
            <EmptyState
              icon={Search}
              title="SLO não encontrado"
              description="Confira se o namespace e o nome estão corretos ou se o operator já reconciliou este recurso."
            />
          </Card>
        )}

        {sloQuery.data && (
          <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Estado do SLO no Datadog</CardTitle>
                  <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                    Resultado retornado pelo endpoint `/v1/namespaces/{'{namespace}'}/slos/{'{name}'}`.
                  </p>
                </div>
              </CardHeader>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(sloQuery.data.datadogSloState)}`}>
                    {formatEnum(sloQuery.data.datadogSloState)}
                  </span>
                  <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-muted-foreground)' }}>
                    {formatEnum(sloQuery.data.sloType)}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: 'Namespace', value: sloQuery.data.namespace, icon: Database },
                  { label: 'Nome do SLO', value: sloQuery.data.name, icon: Target },
                  { label: 'Target', value: sloQuery.data.target === null ? 'N/D' : `${sloQuery.data.target}%`, icon: ShieldCheck },
                  { label: 'Timeframe', value: sloQuery.data.timeframe, icon: Activity },
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
              </div>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Sincronização e detecção</CardTitle>
                  <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                    Metadados adicionais persistidos pela API após a reconciliação do operator.
                  </p>
                </div>
              </CardHeader>

              <div className="space-y-3">
                {[
                  ['Framework detectado', formatEnum(sloQuery.data.detectedFramework)],
                  ['Fonte da detecção', formatEnum(sloQuery.data.detectionSource)],
                  ['Datadog SLO ID', sloQuery.data.datadogSloId ?? 'Não informado'],
                  ['Última sincronização', formatDate(sloQuery.data.lastSyncAt)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl px-4 py-4" style={{ backgroundColor: 'var(--color-muted)' }}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                      {label}
                    </p>
                    <p className="mt-2 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{value}</p>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        )}
      </div>
    </div>
  )
}
