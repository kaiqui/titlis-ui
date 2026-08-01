import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { Boxes, ChevronDown, FileWarning, GitBranch, Inbox, Search, ShieldCheck, Target, Users } from 'lucide-react'
import { motion } from 'motion/react'
import { animate } from 'animejs'
import { Card } from '@/components/jeitto/Card'
import { fadeInUp } from '@/lib/motion/tokens'
import { EmptyState } from '@/components/jeitto/EmptyState'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { Header } from '@/components/layout/Header'
import { ScoreRing } from '@/components/jeitto/ScoreRing'
import { useServiceMap } from '@/hooks/useApi'
import type { ServiceMap, ServiceMapProduct, ServiceMapService, ServiceMapWorkload } from '@/types'

const CONTEXT_TAG_KEY = 'context'
const NO_CONTEXT_LABEL = 'Sem contexto'
const NO_CONTEXT_KEY = '__no_context__'

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
const NO_CONTEXT_COLOR = { bar: '#94a3b8', soft: 'rgba(148,163,184,0.14)', text: '#64748b' }

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

function avgScore(scores: (number | null)[]): number | null {
  const valid = scores.filter((s): s is number => s != null)
  if (valid.length === 0) return null
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10
}

function countWorkloads(map: ServiceMap): number {
  const inProducts = map.products.reduce(
    (n, p) => n + p.squads.reduce((m, s) => m + s.services.reduce((k, svc) => k + svc.workloads.length, 0), 0),
    0,
  )
  return inProducts + map.orphans.length
}

function filterMapByPredicate(map: ServiceMap, predicate: (wl: ServiceMapWorkload) => boolean): ServiceMap {
  const products: ServiceMapProduct[] = map.products
    .map((product) => {
      const squads = product.squads
        .map((squad) => {
          const services = squad.services
            .map((svc) => ({ ...svc, workloads: svc.workloads.filter(predicate) }))
            .filter((svc) => svc.workloads.length > 0)
          return { ...squad, services }
        })
        .filter((squad) => squad.services.length > 0)
      return { ...product, squads }
    })
    .filter((product) => product.squads.length > 0)

  return { products, orphans: map.orphans.filter(predicate) }
}

// Ambiente é sempre resolvido por cluster (tag "env:*" no cluster, com fallback pra Clusters.environment
// do operator) — nunca por tag de workload. Ver CoverageRepository.buildServiceMap no backend.
function collectEnvOptions(map: ServiceMap): string[] {
  const values = new Set<string>()
  const visit = (wl: ServiceMapWorkload) => { if (wl.environment) values.add(wl.environment) }
  map.products.forEach((p) => p.squads.forEach((s) => s.services.forEach((svc) => svc.workloads.forEach(visit))))
  map.orphans.forEach(visit)
  return [...values].sort((a, b) => a.localeCompare(b))
}

function filterMapByEnv(map: ServiceMap, env: string | null): ServiceMap {
  if (!env) return map
  return filterMapByPredicate(map, (wl) => wl.environment === env)
}

// context vem da tag "context:*" configurada por CLUSTER em /settings/tags e é herdada por todo
// workload do cluster (produtos correlacionados e órfãos igualmente) — ver ServiceMapWorkload.tags.
function collectContextOptions(map: ServiceMap): string[] {
  const values = new Set<string>()
  const visit = (wl: ServiceMapWorkload) => {
    const ctx = tagValue(wl.tags, CONTEXT_TAG_KEY)
    if (ctx) values.add(ctx)
  }
  map.products.forEach((p) => p.squads.forEach((s) => s.services.forEach((svc) => svc.workloads.forEach(visit))))
  map.orphans.forEach(visit)
  return [...values].sort((a, b) => a.localeCompare(b))
}

function hasWorkloadWithoutContext(map: ServiceMap): boolean {
  const check = (wl: ServiceMapWorkload) => !tagValue(wl.tags, CONTEXT_TAG_KEY)
  return map.products.some((p) => p.squads.some((s) => s.services.some((svc) => svc.workloads.some(check))))
    || map.orphans.some(check)
}

function filterMapByContext(map: ServiceMap, context: string | null): ServiceMap {
  return filterMapByPredicate(map, (wl) => {
    const ctx = tagValue(wl.tags, CONTEXT_TAG_KEY)
    return context === null ? !ctx : ctx === context
  })
}

interface ContextSectionData {
  key: string
  label: string
  color: typeof NO_CONTEXT_COLOR
  data: ServiceMap
  count: number
}

function buildContextSections(map: ServiceMap): ContextSectionData[] {
  const contexts = collectContextOptions(map)
  const sections: ContextSectionData[] = contexts.map((ctx) => {
    const data = filterMapByContext(map, ctx)
    return { key: ctx, label: ctx, color: contextColor(ctx), data, count: countWorkloads(data) }
  })
  if (hasWorkloadWithoutContext(map)) {
    const data = filterMapByContext(map, null)
    sections.push({ key: NO_CONTEXT_KEY, label: NO_CONTEXT_LABEL, color: NO_CONTEXT_COLOR, data, count: countWorkloads(data) })
  }
  return sections.sort((a, b) => b.count - a.count)
}

interface FlatEntry {
  wl: ServiceMapWorkload
  breadcrumb: string
}

function flattenMap(map: ServiceMap): FlatEntry[] {
  const entries: FlatEntry[] = []
  map.products.forEach((p) => p.squads.forEach((s) => s.services.forEach((svc) => svc.workloads.forEach((wl) => {
    entries.push({ wl, breadcrumb: `${p.product} › ${s.team} › ${svc.serviceName}` })
  }))))
  map.orphans.forEach((wl) => entries.push({ wl, breadcrumb: 'Sem service.yaml' }))
  return entries
}

function matchesSearch(entry: FlatEntry, term: string): boolean {
  const haystack = [entry.wl.name, entry.breadcrumb, entry.wl.cluster ?? '', ...entry.wl.tags].join(' ').toLowerCase()
  return haystack.includes(term)
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

function SearchBar({ value, onChange, resultCount }: { value: string; onChange: (v: string) => void; resultCount: number | null }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar por workload, serviço, produto, cluster ou tag..."
        className="input-field w-full pl-9 text-sm"
      />
      {resultCount != null && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-muted-foreground)]">
          {resultCount} {resultCount === 1 ? 'resultado' : 'resultados'}
        </span>
      )}
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

function SearchResultRow({ entry }: { entry: FlatEntry }) {
  const { wl, breadcrumb } = entry
  const context = tagValue(wl.tags, CONTEXT_TAG_KEY)
  return (
    <Link
      to={`/coverage/${encodeURIComponent(wl.workloadUid)}`}
      className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2.5 hover:opacity-80"
    >
      <div className="min-w-0">
        <p className="truncate text-xs text-[var(--color-muted-foreground)]">{breadcrumb}</p>
        <p className="truncate text-sm font-medium">{wl.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
          <span>{wl.cluster ?? '—'}</span>
          {context && (
            <span className="rounded-full bg-[var(--color-primary-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-primary-strong)]">
              {context}
            </span>
          )}
          <EnvBadge environment={wl.environment} />
        </div>
      </div>
      <ScoreRing score={wl.score} size={40} />
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

function OrphansCard({ orphans }: { orphans: ServiceMapWorkload[] }) {
  if (orphans.length === 0) return null
  return (
    <Card className="space-y-4 border border-amber-500/40 p-5">
      <div className="flex items-center gap-2">
        <FileWarning className="h-5 w-5 text-amber-500" />
        <div>
          <h3 className="text-base font-semibold">Sem service.yaml / não correlacionados</h3>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {orphans.length} workloads descobertos sem .titlis/service.yaml. Crie o arquivo para organizá-los em produto → squad.
          </p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {orphans.map((wl) => (
          <WorkloadRow key={wl.workloadUid} wl={wl} />
        ))}
      </div>
    </Card>
  )
}

// Seção por contexto (accordion nativo — leve o suficiente para centenas de workloads por seção):
// produtos correlacionados e órfãos daquele contexto, sempre juntos. A maior seção abre por padrão;
// as demais ficam recolhidas — essencial em produção com milhares de workloads em poucos contextos.
function ContextSection({ section, defaultOpen }: { section: ContextSectionData; defaultOpen: boolean }) {
  const avg = avgScore([
    ...section.data.products.flatMap((p) => p.squads.flatMap((s) => s.services.flatMap((svc) => svc.workloads.map((w) => w.score)))),
    ...section.data.orphans.map((w) => w.score),
  ])

  return (
    <details className="group rounded-2xl border border-[var(--color-border)]" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-5 py-4 [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: section.color.bar }} />
          <h3 className="truncate text-lg font-semibold" style={{ color: section.color.text }}>{section.label}</h3>
          <span className="shrink-0 rounded-full bg-[var(--color-muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-muted-foreground)]">
            {section.count} {section.count === 1 ? 'workload' : 'workloads'}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <ScoreRing score={avg} size={36} />
          <ChevronDown className="h-4 w-4 text-[var(--color-muted-foreground)] transition-transform group-open:rotate-180" />
        </div>
      </summary>
      <div className="space-y-4 border-t border-[var(--color-border)] p-5">
        {section.data.products.length === 0 && section.data.orphans.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">Nenhum workload neste contexto para o filtro atual.</p>
        ) : (
          <>
            {section.data.products.map((p) => (
              <ProductBlock key={p.product} product={p} />
            ))}
            <OrphansCard orphans={section.data.orphans} />
          </>
        )}
      </div>
    </details>
  )
}

function StatCard({ icon: Icon, label, value, index = 0 }: { icon: LucideIcon; label: string; value: number; index?: number }) {
  const valueRef = useRef<HTMLParagraphElement>(null)
  const displayed = useRef(0)

  useEffect(() => {
    const el = valueRef.current
    if (!el) return
    const from = { count: displayed.current }
    const animation = animate(from, {
      count: value,
      duration: 500,
      easing: 'easeOutQuad',
      onUpdate: () => {
        el.textContent = String(Math.round(from.count))
      },
    })
    displayed.current = value
    return () => {
      animation.pause()
    }
  }, [value])

  return (
    <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, delay: index * 0.05 }}>
      <Card className="p-5">
        <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
          <Icon className="h-4 w-4" /> {label}
        </div>
        <p ref={valueRef} className="mt-1 text-3xl font-semibold">0</p>
      </Card>
    </motion.div>
  )
}

export function ServiceHub() {
  const map = useServiceMap()
  const [envFilter, setEnvFilter] = useState('')
  const [search, setSearch] = useState('')

  const fullData = map.data ?? { products: [], orphans: [] }

  const envOptions = useMemo(() => collectEnvOptions(fullData), [fullData])
  const data = useMemo(() => filterMapByEnv(fullData, envFilter || null), [fullData, envFilter])

  const searchTerm = search.trim().toLowerCase()
  const searchResults = useMemo(() => {
    if (!searchTerm) return null
    return flattenMap(data).filter((entry) => matchesSearch(entry, searchTerm))
  }, [data, searchTerm])

  const contextSections = useMemo(() => buildContextSections(data), [data])

  const stats = useMemo(() => {
    const products = data.products
    const squads = products.reduce((n, p) => n + p.squads.length, 0)
    const services = products.reduce((n, p) => n + p.squads.reduce((m, s) => m + s.services.length, 0), 0)
    return { workloads: countWorkloads(data), products: products.length, squads, services, orphans: data.orphans.length }
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

      <SearchBar value={search} onChange={setSearch} resultCount={searchResults ? searchResults.length : null} />

      {envOptions.length > 0 && (
        <EnvFilterBar options={envOptions} value={envFilter} onChange={setEnvFilter} />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={Boxes} label="Workloads" value={stats.workloads} index={0} />
        <StatCard icon={Boxes} label="Produtos" value={stats.products} index={1} />
        <StatCard icon={Users} label="Squads" value={stats.squads} index={2} />
        <StatCard icon={ShieldCheck} label="Serviços" value={stats.services} index={3} />
        <StatCard icon={FileWarning} label="Órfãos" value={stats.orphans} index={4} />
      </div>

      {searchResults ? (
        searchResults.length > 0 ? (
          <div className="space-y-2">
            {searchResults.map((entry) => (
              <SearchResultRow key={entry.wl.workloadUid} entry={entry} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Search}
            title="Nenhum resultado"
            description={`Nada encontrado para "${search.trim()}". Tente outro nome, serviço, cluster ou tag.`}
          />
        )
      ) : contextSections.length > 0 ? (
        <div className="space-y-4">
          {contextSections.map((section, idx) => (
            <ContextSection key={section.key} section={section} defaultOpen={idx === 0} />
          ))}
        </div>
      ) : data.products.length === 0 && data.orphans.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="Nenhum workload encontrado"
          description="Ajuste os filtros ou aguarde o próximo ciclo de discovery."
        />
      ) : (
        <div className="space-y-4">
          {data.products.map((p) => (
            <ProductBlock key={p.product} product={p} />
          ))}
          <OrphansCard orphans={data.orphans} />
        </div>
      )}
      </div>
    </div>
  )
}
