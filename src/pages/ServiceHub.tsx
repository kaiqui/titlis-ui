import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ChevronRight, FolderTree, Users, Boxes, ArrowRight } from 'lucide-react'
import { motion } from 'motion/react'
import { Card } from '@/components/jeitto/Card'
import { fadeInUp } from '@/lib/motion/tokens'
import { EmptyState } from '@/components/jeitto/EmptyState'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { Header } from '@/components/layout/Header'
import { ScoreRing } from '@/components/jeitto/ScoreRing'
import { useHubRollup } from '@/hooks/useApi'
import { formatNumber } from '@/lib/utils'
import { overallBand, postureBand, stripIcon } from '@/lib/posture'
import type { EstateNode } from '@/types'

const BAND_ORDER = ['forte', 'adequado', 'fragil', 'exposto', 'sem_sinal'] as const
const KIND_ICON = { estate: FolderTree, product: Boxes, squad: Users, service: ArrowRight }

function findByPath(node: EstateNode, path: string): EstateNode | null {
  if (node.path === path) return node
  for (const c of node.children) {
    const f = findByPath(c, path)
    if (f) return f
  }
  return null
}

function trail(root: EstateNode, path: string): EstateNode[] {
  if (!path) return [root]
  const out = [root]
  const segs = path.split('/')
  let acc = ''
  for (const seg of segs) {
    acc = acc ? `${acc}/${seg}` : seg
    const n = findByPath(root, acc)
    if (n) out.push(n)
  }
  return out
}

function BandBar({ mix, total }: { mix: Record<string, number>; total: number }) {
  if (total === 0) return null
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--color-border)' }}>
      {BAND_ORDER.map((b) => {
        const n = mix[b] ?? 0
        if (n === 0) return null
        return <div key={b} style={{ width: `${(n / total) * 100}%`, backgroundColor: postureBand(b).color }} title={`${postureBand(b).label}: ${n}`} />
      })}
    </div>
  )
}

function DimBars({ node }: { node: EstateNode }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
      {node.dimensions.map((d) => {
        const band = postureBand(d.band)
        const pct = d.strength === null ? 0 : Math.max(0, Math.min(100, d.strength))
        return (
          <div key={d.dimension}>
            <p className="flex items-center justify-between text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>
              <span className="truncate">{d.label}</span>
              <span>{d.strength === null ? 'n/a' : Math.round(d.strength)}</span>
            </p>
            <div className="mt-0.5 h-1 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--color-border)' }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: band.color }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function NodeCard({ node, onOpen, index }: { node: EstateNode; onOpen: (path: string) => void; index: number }) {
  const band = postureBand(overallBand(node.postureWeighted))
  const Icon = KIND_ICON[node.kind]
  const fragile = (node.bandMix.fragil ?? 0) + (node.bandMix.exposto ?? 0)

  const body = (
    <Card className="h-full p-4 transition-colors hover:border-[var(--color-primary)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--color-muted)' }}>
            <Icon size={14} style={{ color: band.color }} />
          </div>
          <p className="truncate font-semibold">{node.name}</p>
        </div>
        <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ color: band.color, backgroundColor: 'var(--color-muted)' }}>
          {formatNumber(node.postureWeighted)} · {band.label}
        </span>
      </div>
      <div className="mt-2.5">
        <BandBar mix={node.bandMix} total={node.serviceCount} />
      </div>
      <p className="mt-2 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
        {node.kind === 'service'
          ? `${node.confidence ? node.confidence.replace('_', ' ') : 'sem confiança'}${node.tier ? ` · tier ${node.tier}` : ''}`
          : `${node.serviceCount} serviço${node.serviceCount === 1 ? '' : 's'} · ${fragile} ${fragile === 1 ? 'serviço frágil' : 'serviços frágeis'} · confiança ${node.confidencePct}%`}
      </p>
      {node.ownerGap > 0 && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px]" style={{ color: '#d97706' }}>
          <AlertTriangle size={11} />{node.ownerGap} sem dono no Datadog
        </p>
      )}
    </Card>
  )

  return (
    <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, delay: Math.min(index * 0.03, 0.25) }}>
      {node.kind === 'service' && node.workloadUid ? (
        <Link to={`/coverage/${encodeURIComponent(node.workloadUid)}`} className="block h-full">{body}</Link>
      ) : (
        <button type="button" onClick={() => onOpen(node.path)} className="block h-full w-full text-left">{body}</button>
      )}
    </motion.div>
  )
}

export function ServiceHub() {
  const { data: root, isLoading, isError, refetch } = useHubRollup()
  const [path, setPath] = useState('')

  const current = useMemo(() => (root ? findByPath(root, path) ?? root : null), [root, path])
  const crumbs = useMemo(() => (root ? trail(root, path) : []), [root, path])

  if (isLoading) return <><Header title="Hub" /><PageLoading /></>
  if (isError) return <><Header title="Hub" /><PageError message="Falha ao carregar o hub." onRetry={() => refetch()} /></>
  if (!root || !current || root.serviceCount === 0) {
    return (
      <>
        <Header title="Hub" subtitle="Confiabilidade agregada por produto, squad e serviço." />
        <EmptyState
          icon={FolderTree}
          title="Nenhum serviço no hub ainda"
          description="Conecte Datadog e GitHub em Integrações e rode a coleta. O time e o produto vêm do Datadog Service Definition."
        />
      </>
    )
  }

  const band = postureBand(overallBand(current.postureWeighted))

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Hub" subtitle="Confiabilidade agregada por produto, squad e serviço — time e produto vêm do Datadog." />

      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {crumbs.map((c, i) => (
            <span key={c.path} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={13} style={{ color: 'var(--color-muted-foreground)' }} />}
              <button
                type="button"
                onClick={() => setPath(c.path)}
                className="font-medium hover:underline"
                style={{ color: i === crumbs.length - 1 ? 'var(--color-foreground)' : 'var(--color-muted-foreground)' }}
              >
                {c.name}
              </button>
            </span>
          ))}
        </nav>

        <Card className="p-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <ScoreRing score={current.postureWeighted} size={92} strokeWidth={8} showFraction />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full px-3 py-1 text-sm font-bold" style={{ color: band.color, backgroundColor: 'var(--color-muted)' }}>
                  {formatNumber(current.postureWeighted)} · {band.label}
                </span>
                <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                  pior {formatNumber(current.postureWorst)} · confiança {current.confidencePct}% · {current.serviceCount} serviços
                </span>
              </div>
              <div className="mt-3"><BandBar mix={current.bandMix} total={current.serviceCount} /></div>
              <DimBars node={current} />
            </div>
          </div>
          {current.ownerGap > 0 && (
            <p className="mt-4 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: 'rgba(217,119,6,0.1)', color: '#b45309' }}>
              <AlertTriangle size={13} />
              {current.ownerGap} serviço{current.ownerGap === 1 ? '' : 's'} sem <code>team</code> no Datadog Service Definition — aparecem em "Sem dono (Datadog)".
            </p>
          )}
        </Card>

        {current.topMoves.length > 0 && (
          <Card className="p-5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
              O que moveria a postura {current.kind !== 'service' ? 'do grupo' : ''}
            </p>
            <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {current.topMoves.map((m, i) => (
                <div key={m.code} className="flex items-baseline gap-3 py-2 text-sm">
                  <span className="font-mono text-xs" style={{ color: 'var(--color-primary)' }}>{String(i + 1).padStart(2, '0')}</span>
                  <span className="min-w-0">{stripIcon(m.description)}</span>
                  {m.serviceCount > 1 && (
                    <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px]" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                      {m.serviceCount} serviços
                    </span>
                  )}
                  <span className="ml-auto shrink-0 font-mono text-xs" style={{ color: '#16a34a' }}>+{Math.round(m.totalLift / Math.max(1, m.serviceCount))}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {current.children.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {current.children.map((child, i) => (
              <NodeCard key={child.path} node={child} onOpen={setPath} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ServiceHub
