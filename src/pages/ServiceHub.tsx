import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { Boxes, FileWarning, GitBranch, Inbox, ShieldCheck, Target, Users } from 'lucide-react'
import { Card } from '@/components/jeitto/Card'
import { EmptyState } from '@/components/jeitto/EmptyState'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { PageHero } from '@/components/jeitto/PageHero'
import { ScoreRing } from '@/components/jeitto/ScoreRing'
import { useServiceMap } from '@/hooks/useApi'
import type { ServiceMapProduct, ServiceMapService, ServiceMapWorkload } from '@/types'

function maturityLabel(level: number): string {
  return level > 0 ? `Maturidade ${level}/5` : 'maturidade n/d'
}

function WorkloadRow({ wl }: { wl: ServiceMapWorkload }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{wl.name}</p>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          {wl.cluster ?? '—'} · {maturityLabel(wl.maturity)}
        </p>
      </div>
      <ScoreRing score={wl.score} size={40} />
    </div>
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

  const stats = useMemo(() => {
    const products = map.data?.products ?? []
    const squads = products.reduce((n, p) => n + p.squads.length, 0)
    const services = products.reduce((n, p) => n + p.squads.reduce((m, s) => m + s.services.length, 0), 0)
    return { products: products.length, squads, services, orphans: map.data?.orphans.length ?? 0 }
  }, [map.data])

  if (map.isLoading) return <PageLoading />
  if (map.isError) return <PageError message="Falha ao carregar o hub." onRetry={() => map.refetch()} />

  const data = map.data ?? { products: [], orphans: [] }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Confiabilidade"
        title="Hub de serviços"
        description="Produto → squad → serviço → score. A estrutura vem do .titlis/service.yaml + discovery; o score vem do Coverage."
      />

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
              <FileWarning className="h-5 w-5 text-amber-500" />
              <div>
                <h3 className="text-lg font-semibold">Sem service.yaml / não correlacionados</h3>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {data.orphans.length} workloads descobertos sem .titlis/service.yaml. Crie o arquivo
                  para organizá-los em produto → squad.
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
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.orphans.map((wl) => (
              <WorkloadRow key={wl.workloadUid} wl={wl} />
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
