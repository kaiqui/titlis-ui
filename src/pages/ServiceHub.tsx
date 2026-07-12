import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { Boxes, FileWarning, GitBranch, Inbox, Layers, ShieldCheck, Target, Users } from 'lucide-react'
import { Card } from '@/components/jeitto/Card'
import { EmptyState } from '@/components/jeitto/EmptyState'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { Header } from '@/components/layout/Header'
import { ScoreRing } from '@/components/jeitto/ScoreRing'
import { useServiceMap } from '@/hooks/useApi'
import type { ServiceMap, ServiceMapProduct, ServiceMapService, ServiceMapWorkload } from '@/types'

const CONTEXT_TAG_KEY = 'context'
const NO_CONTEXT_LABEL = 'Sem contexto'

// Paleta determinística por contexto — mesma cor sempre para o mesmo nome, sem depender de ordem.
const CONTEXT_PALETTE = [
  { bar: '#6366f1', soft: 'rgba(99,102,241,0.12)', text: '#6366f1' },
  { bar: '#0ea5e9', soft: 'rgba(14,165,233,0.12)', text: '#0ea5e9' },
  { bar: '#10b981', soft: 'rgba(16,185,129,0.12)', text: '#10b981' },
  { bar: '#f59e0b', soft: 'rgba(245,158,11,0.14)', text: '#b45309' },
  { bar: '#ec4899', soft: 'rgba(236,72,153,0.12)', text: '#ec4899' },
  { bar: '#8b5cf6', soft: 'rgba(139,92,246,0.12)', text: '#8b5cf6' },
  { bar: '#14b8a6', soft: 'rgba(20,184,166,0.12)', text: '#14b8a6' },
]

function contextColor(context: string) {
  let hash = 0
  for (let i = 0; i < context.length; i++) hash = (hash * 31 + context.charCodeAt(i)) >>> 0
  return CONTEXT_PALETTE[hash % CONTEXT_PALETTE.length]
}

function tagValue(tags: string[], key: string): string | null {
  const prefix = `${key}:`
  const found = tags.find((t) => t.toLowerCase().startsWith(prefix))
  return found ? found.slice(prefix.length).trim() || null : null
}

function maturityLabel(level: number): string {
  return level > 0 ? `Maturidade ${level}/5` : 'maturidade n/d'
}

// Ambiente é sempre resolvido por cluster (Clusters.environment) — nunca por tag de workload.
function collectEnvOptions(map: ServiceMap): string[] {
  const values = new Set<string>()
  const visit = (wl: ServiceMapWorkload) => {
    if (wl.environment) values.add(wl.environment)
  }
  map.products.forEach((p) => p.squads.forEach((s) => s.services.forEach((svc) => svc.workloads.forEach(visit))))
  map.orphans.forEach(visit)
  return [...values].sort((a, b) => a.localeCompare(b))
}

function filterMapByEnv(map: ServiceMap, env: string | null): ServiceMap {
  if (!env) return map
  const matches = (wl: ServiceMapWorkload) => wl.environment === env

  const products: ServiceMapProduct[] = map.products
    .map((product) => {
      const squads = product.squads
        .map((squad) => {
          const services = squad.services
            .map((svc) => ({ ...svc, workloads: svc.workloads.filter(matches) }))
            .filter((svc) => svc.workloads.length > 0)
          return { ...squad, services }
        })
        .filter((squad) => squad.services.length > 0)
      return { ...product, squads }
    })
    .filter((product) => product.squads.length > 0)

  return { products, orphans: map.orphans.filter(matches) }
}

interface ContextGroup {
  context: string | null
  workloads: ServiceMapWorkload[]
}

function groupByContext(workloads: ServiceMapWorkload[]): ContextGroup[] {
  const byContext = new Map<string, ServiceMapWorkload[]>()
  const withoutContext: ServiceMapWorkload[] = []
  for (const wl of workloads) {
    const ctx = tagValue(wl.tags, CONTEXT_TAG_KEY)
    if (ctx) {
      if (!byContext.has(ctx)) byContext.set(ctx, [])
      byContext.get(ctx)!.push(wl)
    } else {
      withoutContext.push(wl)
    }
  }
  const groups: ContextGroup[] = [...byContext.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([context, wls]) => ({ context, workloads: wls }))
  if (withoutContext.length > 0) groups.push({ context: null, workloads: withoutContext })
  return groups
}

function EnvFilterBar({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">Ambiente</span>
      <div className="flex flex-wrap gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] p-1">
        <button
          type="button"
          onClick={() => onChange('')}
          className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
          style={
            value === ''
              ? { backgroundColor: 'var(--color-primary)', color: 'white' }
              : { color: 'var(--color-muted-foreground)' }
          }
        >
          Todos
        </button>
        {options.map((env) => (
          <button
            key={env}
            type="button"
            onClick={() => onChange(env)}
            className="rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors"
            style={
              value === env
                ? { backgroundColor: 'var(--color-primary)', color: 'white' }
                : { color: 'var(--color-muted-foreground)' }
            }
          >
            {env}
          </button>
        ))}
      </div>
    </div>
  )
}

function EnvBadge({ environment }: { environment: string | null }) {
  if (!environment) return null
  return (
    <span className="rounded-full bg-[var(--color-muted)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
      {environment}
    </span>
  )
}

function WorkloadRow({ wl }: { wl: ServiceMapWorkload }) {
  return (
    <Link
      to={`/coverage/${encodeURIComponent(wl.workloadUid)}`}
      className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2 hover:opacity-80"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{wl.name}</p>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          {wl.cluster ?? '—'} · {maturityLabel(wl.maturity)}
        </p>
        <div className="mt-1">
          <EnvBadge environment={wl.environment} />
        </div>
      </div>
      <ScoreRing score={wl.score} size={40} />
    </Link>
  )
}

// Card compacto usado dentro das colunas do quadro de contexto — mais denso que o WorkloadRow padrão.
function ContextWorkloadCard({ wl, accent }: { wl: ServiceMapWorkload; accent: string }) {
  return (
    <Link
      to={`/coverage/${encodeURIComponent(wl.workloadUid)}`}
      className="block rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-sm transition-shadow hover:shadow-md"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{wl.name}</p>
          <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
            {wl.cluster ?? '—'} · {maturityLabel(wl.maturity)}
          </p>
        </div>
        <ScoreRing score={wl.score} size={32} />
      </div>
      <div className="mt-2">
        <EnvBadge environment={wl.environment} />
      </div>
    </Link>
  )
}

function ServiceCard({ svc }: { svc: ServiceMapService }) {
  return (
    <div className="space-y-3 rounded-xl border border-[var(--color-border)] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{svc.serviceName}</p>
          {svc.repoUrl && (
            <a
              href={svc.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[var(--color-muted-foreground)] hover:underline"
            >
              <GitBranch className="h-3 w-3" /> repo
            </a>
          )}
        </div>
        <ScoreRing score={svc.score} size={48} />
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <Link to="/coverage" className="rounded-full border border-[var(--color-border)] px-2.5 py-1 hover:opacity-80">
          <ShieldCheck className="mr-1 inline h-3 w-3" />Cobertura
        </Link>
        <Link
          to={`/queues?service=${encodeURIComponent(svc.serviceName)}`}
          className="rounded-full border border-[var(--color-border)] px-2.5 py-1 hover:opacity-80"
        >
          <Inbox className="mr-1 inline h-3 w-3" />Filas
        </Link>
        <Link
          to={`/slos?service=${encodeURIComponent(svc.serviceName)}`}
          className="rounded-full border border-[var(--color-border)] px-2.5 py-1 hover:opacity-80"
        >
          <Target className="mr-1 inline h-3 w-3" />SLOs
        </Link>
      </div>

      <div className="space-y-1.5">
        {svc.workloads.map((wl) => (
          <WorkloadRow key={wl.workloadUid} wl={wl} />
        ))}
      </div>
    </div>
  )
}

function ProductBlock({ product }: { product: ServiceMapProduct }) {
  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Boxes className="h-5 w-5 text-[var(--color-primary)]" />
          <h3 className="text-lg font-semibold">{product.product}</h3>
        </div>
        <ScoreRing score={product.score} size={52} />
      </div>

      {product.squads.map((squad) => (
        <div key={squad.team} className="space-y-3 rounded-xl border border-[var(--color-border)] p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4 text-[var(--color-muted-foreground)]" /> {squad.team}
            </div>
            <ScoreRing score={squad.score} size={40} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {squad.services.map((svc) => (
              <ServiceCard key={svc.serviceDefinitionId} svc={svc} />
            ))}
          </div>
        </div>
      ))}
    </Card>
  )
}

// Quadro em colunas (kanban) — visualização dedicada para órfãos agrupados por tag context,
// deliberadamente diferente da árvore produto→squad→serviço acima.
function ContextBoard({ groups }: { groups: ContextGroup[] }) {
  return (
    <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
      {groups.map((group) => {
        const label = group.context ?? NO_CONTEXT_LABEL
        const color = group.context ? contextColor(group.context) : { bar: '#94a3b8', soft: 'rgba(148,163,184,0.14)', text: '#64748b' }
        return (
          <div
            key={group.context ?? '__no_context__'}
            className="flex w-72 shrink-0 flex-col gap-3 rounded-xl border border-[var(--color-border)] p-3"
            style={{ backgroundColor: color.soft }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color.bar }} />
                <span className="truncate text-sm font-semibold" style={{ color: color.text }}>{label}</span>
              </div>
              <span className="shrink-0 rounded-full bg-[var(--color-card)] px-2 py-0.5 text-xs font-medium text-[var(--color-muted-foreground)]">
                {group.workloads.length}
              </span>
            </div>
            <div className="space-y-2">
              {group.workloads.map((wl) => (
                <ContextWorkloadCard key={wl.workloadUid} wl={wl} accent={color.bar} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <p className="mt-1 text-3xl font-semibold">{value}</p>
    </Card>
  )
}

export function ServiceHub() {
  const map = useServiceMap()
  const [envFilter, setEnvFilter] = useState('')

  const fullData = map.data ?? { products: [], orphans: [] }

  const envOptions = useMemo(() => collectEnvOptions(fullData), [fullData])
  const data = useMemo(() => filterMapByEnv(fullData, envFilter || null), [fullData, envFilter])
  const orphanGroups = useMemo(() => groupByContext(data.orphans), [data.orphans])
  const groupedByContext = orphanGroups.some((g) => g.context !== null)

  const stats = useMemo(() => {
    const products = data.products
    const squads = products.reduce((n, p) => n + p.squads.length, 0)
    const services = products.reduce((n, p) => n + p.squads.reduce((m, s) => m + s.services.length, 0), 0)
    return { products: products.length, squads, services, orphans: data.orphans.length }
  }, [data])

  if (map.isLoading) return <PageLoading />
  if (map.isError) return <PageError message="Falha ao carregar o hub." onRetry={() => map.refetch()} />

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title="Hub de serviços"
        subtitle="Produto → squad → serviço → score. A estrutura vem do .titlis/service.yaml + discovery; o score vem do Coverage."
      />
      <div className="flex-1 space-y-6 px-4 py-6 lg:px-8">

      {envOptions.length > 0 && (
        <EnvFilterBar options={envOptions} value={envFilter} onChange={setEnvFilter} />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Boxes} label="Produtos" value={stats.products} />
        <StatCard icon={Users} label="Squads" value={stats.squads} />
        <StatCard icon={ShieldCheck} label="Serviços" value={stats.services} />
        <StatCard icon={FileWarning} label="Órfãos" value={stats.orphans} />
      </div>

      {data.products.length > 0 ? (
        <div className="space-y-4">
          {data.products.map((p) => (
            <ProductBlock key={p.product} product={p} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Boxes}
          title="Nenhum serviço correlacionado ainda"
          description="Crie .titlis/service.yaml nos repositórios para organizar os workloads em produto → squad."
        />
      )}

      {data.orphans.length > 0 && (
        <Card className="space-y-4 border border-amber-500/40 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              {groupedByContext ? (
                <Layers className="h-5 w-5 text-amber-500" />
              ) : (
                <FileWarning className="h-5 w-5 text-amber-500" />
              )}
              <div>
                <h3 className="text-lg font-semibold">Sem service.yaml / não correlacionados</h3>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {data.orphans.length} workloads descobertos sem .titlis/service.yaml.
                  {groupedByContext
                    ? ' Agrupados pela tag context enquanto o service.yaml não é criado.'
                    : ' Crie o arquivo para organizá-los em produto → squad.'}
                </p>
              </div>
            </div>
            <Link
              to="/docs"
              className="shrink-0 rounded-full bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-500 hover:bg-amber-500/20"
            >
              Como criar service.yaml
            </Link>
          </div>

          {groupedByContext ? (
            <ContextBoard groups={orphanGroups} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.orphans.map((wl) => (
                <WorkloadRow key={wl.workloadUid} wl={wl} />
              ))}
            </div>
          )}
        </Card>
      )}
      </div>
    </div>
  )
}
