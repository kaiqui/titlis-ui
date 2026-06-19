import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Bot, ChevronRight, Layers3, ShieldAlert, Wrench } from 'lucide-react'
import { Card } from '@/components/jeitto/Card'
import { EmptyState } from '@/components/jeitto/EmptyState'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { ScoreRing } from '@/components/jeitto/ScoreRing'
import { Header } from '@/components/layout/Header'
import { DetailPanel } from '@/components/sre/DetailPanel'
import { SummaryStrip } from '@/components/sre/SummaryStrip'
import { useReliabilityTree, useReliabilityTrend, useServiceFindings } from '@/hooks/useApi'
import { formatNumber } from '@/lib/utils'
import type { ReliabilityNode, ReliabilityTrendPoint } from '@/types'

function Sparkline({ points }: { points: ReliabilityTrendPoint[] }) {
  if (points.length < 2) return null
  const vals = points.map((p) => p.ri)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1
  const w = 120
  const h = 32
  const step = w / (points.length - 1)
  const coords = points.map((p, i) => `${(i * step).toFixed(1)},${(h - ((p.ri - min) / range) * h).toFixed(1)}`).join(' ')
  const improving = vals[vals.length - 1] >= vals[0]
  return (
    <div className="flex flex-col items-end" data-testid="reliability-sparkline">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-label="tendência de RI">
        <polyline points={coords} fill="none" stroke={improving ? 'var(--color-primary)' : '#ef4444'} strokeWidth={2} strokeLinejoin="round" />
      </svg>
      <span className="text-[10px] font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>
        tendência {points.length}d {improving ? '▲' : '▼'}
      </span>
    </div>
  )
}

const ROOT_LABEL = 'Todos os produtos'

function findByPath(node: ReliabilityNode, path: string): ReliabilityNode | null {
  if (node.path === path) return node
  for (const c of node.children) {
    const f = findByPath(c, path)
    if (f) return f
  }
  return null
}

function trailTo(root: ReliabilityNode, path: string): ReliabilityNode[] {
  const trail = [root]
  if (!path) return trail
  let acc = ''
  for (const seg of path.split('/')) {
    acc = acc ? `${acc}/${seg}` : seg
    const n = findByPath(root, acc)
    if (n) trail.push(n)
  }
  return trail
}

function lastNumericSegment(path: string): string {
  const last = path.split('/').pop() ?? ''
  return /^\d+$/.test(last) ? last : ''
}

const KIND_LABEL: Record<string, string> = {
  estate: 'Estate', product: 'Produto', team: 'Time', service: 'Serviço',
}

function NodeRow({ node, parentWeight, onOpen }: { node: ReliabilityNode; parentWeight: number; onOpen: (path: string) => void }) {
  const deltaRi = parentWeight > 0 ? node.debt / parentWeight : 0
  const drillable = node.hasChildren || node.kind === 'service'
  return (
    <button
      type="button"
      onClick={() => drillable && onOpen(node.path)}
      data-testid="reliability-node-row"
      className="flex w-full items-center gap-4 rounded-2xl border px-4 py-3 text-left transition-colors disabled:cursor-default"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
      disabled={!drillable}
    >
      <ScoreRing score={node.ri} size={40} strokeWidth={4} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>{node.name}</p>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
            {KIND_LABEL[node.kind] ?? node.kind}
          </span>
          {node.criticalBreach && (
            <span className="flex items-center gap-1 rounded-full bg-red-900/30 px-2 py-0.5 text-[10px] font-semibold text-red-400">
              <ShieldAlert size={11} /> crítico
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>
          débito {formatNumber(node.debt)} · ↑{deltaRi.toFixed(1)} pts ao resolver · cobertura {Math.round(node.coverage * 100)}%
        </p>
      </div>
      {drillable && <ChevronRight size={18} style={{ color: 'var(--color-muted-foreground)' }} />}
    </button>
  )
}

function FindingsWorklist({ serviceId }: { serviceId: string }) {
  const navigate = useNavigate()
  const { data: findings, isLoading } = useServiceFindings(serviceId)

  if (isLoading) return <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Carregando findings…</p>
  const items = findings ?? []
  if (items.length === 0) {
    return <EmptyState icon={Layers3} title="Sem findings em aberto" description="Nenhuma regra falhando nas folhas deste serviço." />
  }
  return (
    <div className="space-y-2" data-testid="reliability-worklist">
      {items.map((f, i) => {
        const canRemediate = f.remediable && f.leafKind === 'workload' && !!f.workloadUid
        return (
          <div key={`${f.leafName}-${f.ruleId}-${i}`} className="flex items-start gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
            <ShieldAlert size={16} className="mt-0.5 shrink-0 text-red-500" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13px] font-semibold" style={{ color: 'var(--color-foreground)' }}>{f.ruleId}</p>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>{f.leafKind}</span>
                <span className="text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>{f.leafName}</span>
                {f.severity && <span className="text-[11px] font-medium text-amber-500">{f.severity}</span>}
              </div>
              {f.message && <p className="mt-1 text-[13px]" style={{ color: 'var(--color-muted-foreground)' }}>{f.message}</p>}
              <p className="mt-1 text-[11px] font-semibold text-emerald-500">↑ {f.riGainService.toFixed(2)} pts de RI no serviço ao corrigir</p>
            </div>
            {canRemediate ? (
              <button
                type="button"
                onClick={() => navigate(`/scorecards/${f.workloadUid}/remediate`)}
                data-testid="reliability-remediate"
                className="flex shrink-0 items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-semibold text-white"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <Bot size={12} /> Corrigir com IA
              </button>
            ) : f.remediable ? (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-indigo-900/30 px-2 py-1 text-[11px] font-semibold text-indigo-300">
                <Wrench size={12} /> remediável
              </span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export function Reliability() {
  const [path, setPath] = useState('')
  const treeQuery = useReliabilityTree()
  const trendQuery = useReliabilityTrend(path)
  const root = treeQuery.data ?? null
  const node = root ? findByPath(root, path) : null
  const current = node ?? root
  const serviceId = current?.kind === 'service' ? lastNumericSegment(current.path) : ''

  if (treeQuery.isLoading) return <><Header title="Confiabilidade" /><PageLoading /></>
  if (treeQuery.error) {
    return <><Header title="Confiabilidade" /><PageError message={treeQuery.error instanceof Error ? treeQuery.error.message : undefined} onRetry={() => void treeQuery.refetch()} /></>
  }
  if (!root || !current) {
    return (
      <>
        <Header title="Confiabilidade" />
        <div className="px-4 py-6 lg:px-8">
          <Card><EmptyState icon={Layers3} title="Nada para exibir" description="Declare produtos/times em .titlis/service.yaml para montar a árvore de confiabilidade." /></Card>
        </div>
      </>
    )
  }

  const trail = trailTo(root, current.path)
  const children = [...current.children].sort((a, b) => b.debt - a.debt)
  const isService = current.kind === 'service'

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Confiabilidade" subtitle="Termômetro com drill-down de produto até finding, ponderado por débito." />

      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">
        <SummaryStrip
          items={[
            { label: 'RI atual', value: current.ri != null ? formatNumber(current.ri) : 'N/D', helper: KIND_LABEL[current.kind] ?? current.kind },
            { label: 'Débito', value: formatNumber(current.debt), helper: 'pts a recuperar' },
            { label: 'Cobertura', value: `${Math.round(current.coverage * 100)}%`, helper: `${current.scoredLeaves}/${current.totalLeaves} folhas` },
            { label: 'Filhos', value: current.children.length, helper: isService ? 'folhas neste serviço' : 'nós abaixo' },
          ]}
        />

        <Card>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
              <ScoreRing score={current.ri} size={56} strokeWidth={5} />
              <div className="space-y-1.5">
                <nav className="flex flex-wrap items-center gap-1 text-sm" data-testid="reliability-breadcrumb">
                  {trail.map((n, i) => (
                    <span key={n.path || 'root'} className="flex items-center gap-1">
                      {i > 0 && <ChevronRight size={14} style={{ color: 'var(--color-muted-foreground)' }} />}
                      <button
                        type="button"
                        onClick={() => setPath(n.path)}
                        className="font-semibold"
                        style={{ color: i === trail.length - 1 ? 'var(--color-foreground)' : 'var(--color-muted-foreground)' }}
                      >
                        {i === 0 ? ROOT_LABEL : n.name}
                      </button>
                    </span>
                  ))}
                </nav>
                {current.criticalBreach && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-900/30 px-2.5 py-1 text-[11px] font-semibold text-red-400">
                    <AlertTriangle size={12} /> piso crítico — há folha tier-1 abaixo do limite
                  </span>
                )}
              </div>
            </div>
            {trendQuery.data && trendQuery.data.length >= 2 && <Sparkline points={trendQuery.data} />}
          </div>
        </Card>

        {isService ? (
          <DetailPanel title="Correções priorizadas" subtitle="Findings das folhas deste serviço, ordenados por pontos de confiabilidade recuperáveis.">
            <FindingsWorklist serviceId={serviceId} />
          </DetailPanel>
        ) : children.length === 0 ? (
          <Card><EmptyState icon={Layers3} title="Sem nós abaixo" description="Este nó ainda não tem filhos avaliados." /></Card>
        ) : (
          <DetailPanel title="Maiores contribuintes de débito" subtitle="Ordenado por débito — comece pelo topo para o maior ganho de confiabilidade.">
            <div className="space-y-2">
              {children.map((child) => (
                <NodeRow key={child.path} node={child} parentWeight={current.weight} onOpen={setPath} />
              ))}
            </div>
          </DetailPanel>
        )}
      </div>
    </div>
  )
}
