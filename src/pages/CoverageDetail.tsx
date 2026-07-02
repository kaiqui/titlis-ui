import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, FileQuestion, MinusCircle, Network, Sparkles, Wrench, XCircle } from 'lucide-react'
import { Card } from '@/components/jeitto/Card'
import { EmptyState } from '@/components/jeitto/EmptyState'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { ScoreRing } from '@/components/jeitto/ScoreRing'
import { CoverageExplainDrawer } from '@/components/ai/CoverageExplainDrawer'
import { useCoverageDetail, useCoverageGraph } from '@/hooks/useApi'
import type { CoverageFinding, CoverageGraphNeighbor } from '@/types'

const PILLAR_LABELS: Record<string, string> = {
  resilience: 'Resiliência',
  security: 'Segurança',
  performance: 'Performance',
  operational: 'Operacional',
  observability: 'Observabilidade',
}

function pillarLabel(p: string): string {
  return PILLAR_LABELS[p.toLowerCase()] ?? p
}

function maturityLabel(level: number): string {
  return level > 0 ? `Maturidade ${level}/5` : 'maturidade n/d'
}

function isPendingCoverage(trustScore: number | null, dimensionCount: number, findingCount: number): boolean {
  return trustScore === null && dimensionCount === 0 && findingCount === 0
}

// U4 — só YAML-remediáveis (como hoje): infra K8s. Observabilidade (monitor/tracing/SLO/logs) não é PR de YAML.
const YAML_REMEDIABLE_COV = new Set(['COV-RESOURCES', 'COV-PROBES', 'COV-HPA', 'COV-PDB', 'COV-NETWORKPOLICY'])

function isRemediable(f: CoverageFinding): boolean {
  if (f.outcome !== 'fail') return false
  if (YAML_REMEDIABLE_COV.has(f.code)) return true
  return /^(RES|SEC|PERF|OPS)-/.test(f.code) // regras legadas portadas (U1) são YAML-remediáveis
}

const KIND_LABELS: Record<string, string> = {
  service: 'Service', ingress: 'Ingress', hpa: 'HPA', pdb: 'PDB',
  networkpolicy: 'NetworkPolicy', configmap: 'ConfigMap', secret: 'Secret',
  dd_service: 'Datadog Service', dd_monitor: 'Monitor', dd_slo: 'SLO', queue: 'Fila',
}

function kindLabel(k: string): string {
  return KIND_LABELS[k] ?? k
}

// U6 — deep-link para a página correspondente ao ativo correlacionado (quando existe).
function neighborLink(n: CoverageGraphNeighbor): string | null {
  if (n.kind === 'dd_slo') return '/slos'
  if (n.kind === 'queue') return '/queues'
  return null
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  if (outcome === 'pass') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-500">
        <CheckCircle2 className="h-3 w-3" />OK
      </span>
    )
  }
  if (outcome === 'fail') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-500">
        <XCircle className="h-3 w-3" />Falha
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-border)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-muted-foreground)]">
      <MinusCircle className="h-3 w-3" />N/A
    </span>
  )
}

export function CoverageDetail() {
  const { uid = '' } = useParams()
  const navigate = useNavigate()
  const detail = useCoverageDetail(uid)
  const graph = useCoverageGraph(uid)
  const [explain, setExplain] = useState<CoverageFinding | null>(null)

  const sections = useMemo(() => {
    const sc = detail.data
    if (!sc) return []
    const pillars = new Set<string>([
      ...sc.dimensions.map((d) => d.pillar),
      ...sc.findings.map((f) => f.pillar || 'outros'),
    ])
    return [...pillars].map((p) => ({
      pillar: p,
      findings: sc.findings.filter((f) => (f.pillar || 'outros') === p),
    }))
  }, [detail.data])

  if (detail.isLoading) return <PageLoading />
  if (detail.isError) return <PageError message="Falha ao carregar o serviço." onRetry={() => detail.refetch()} />

  const sc = detail.data
  if (!sc) {
    return (
      <EmptyState
        icon={FileQuestion}
        title="Serviço não encontrado"
        description="O scorecard pode ter sido removido ou o workload foi desativado."
      />
    )
  }

  const pending = isPendingCoverage(sc.trustScore, sc.dimensions.length, sc.findings.length)

  return (
    <div className="space-y-6">
      <Link
        to="/coverage"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />Voltar para Cobertura
      </Link>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">Service Scorecard</p>
            <h1 className="truncate text-2xl font-semibold">{sc.serviceName ?? sc.workloadUid}</h1>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {sc.cluster ?? '—'} · {pending ? 'avaliacao pendente' : maturityLabel(sc.maturity)}
            </p>
          </div>
          <ScoreRing score={sc.trustScore} size={96} />
        </div>
      </Card>

      {pending && (
        <Card className="p-5">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Este workload ja foi descoberto, mas a avaliacao de cobertura ainda nao retornou score.
            Quando o sweep concluir, esta pagina passa a exibir maturidade, pilares e findings automaticamente.
          </p>
        </Card>
      )}

      {sc.dimensions.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sc.dimensions.map((d) => (
            <Card key={d.pillar} className="p-5">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{pillarLabel(d.pillar)}</p>
                <span className="text-sm text-[var(--color-muted-foreground)]">{Math.round(d.pct)}%</span>
              </div>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                {d.passed}/{d.evaluable} OK · {d.na} N/A · {maturityLabel(d.maturityLevel)}
              </p>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {sections.map(({ pillar, findings }) => (
          <Card key={pillar} className="p-5">
            <h3 className="mb-3 text-lg font-semibold">{pillarLabel(pillar)}</h3>
            <div className="divide-y divide-[var(--color-border)]">
              {findings.length === 0 && (
                <p className="py-2 text-sm text-[var(--color-muted-foreground)]">Sem itens neste pilar.</p>
              )}
              {findings.map((f) => (
                <div key={f.code} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{f.code}</span>
                      {f.severity && (
                        <span className="text-[11px] uppercase text-[var(--color-muted-foreground)]">{f.severity}</span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      {f.message || (f.outcome === 'na' ? 'Não avaliável — fonte de dados não conectada.' : '—')}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <OutcomeBadge outcome={f.outcome} />
                    {(f.outcome === 'fail' || f.outcome === 'na') && (
                      <button
                        onClick={() => setExplain(f)}
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[11px] font-medium hover:opacity-80"
                      >
                        <Sparkles className="h-3 w-3" />Explicar com IA
                      </button>
                    )}
                    {isRemediable(f) && (
                      <button
                        onClick={() => navigate(`/scorecards/${encodeURIComponent(sc.workloadUid)}/remediate`)}
                        className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium hover:opacity-80"
                        style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                      >
                        <Wrench className="h-3 w-3" />Corrigir com IA
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {(graph.data?.neighbors.length ?? 0) > 0 && (
        <Card className="p-5">
          <div className="mb-2 flex items-center gap-2">
            <Network className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
            <h3 className="text-lg font-semibold">Correlações</h3>
          </div>
          <p className="mb-3 text-sm text-[var(--color-muted-foreground)]">
            Ativos descobertos ligados a este serviço (grafo). SLOs e filas levam à página correspondente.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {graph.data!.neighbors.map((n, i) => {
              const href = neighborLink(n)
              const row = (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{n.name}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {kindLabel(n.kind)} · {n.relation}{n.via ? ` (via ${n.via})` : ''}
                    </p>
                  </div>
                  <span className="text-[11px] uppercase text-[var(--color-muted-foreground)]">{n.provider}</span>
                </div>
              )
              return href ? (
                <Link key={i} to={href} className="block hover:opacity-80">{row}</Link>
              ) : (
                <div key={i}>{row}</div>
              )
            })}
          </div>
        </Card>
      )}

      {explain && (
        <CoverageExplainDrawer
          finding={explain}
          workloadUid={sc.workloadUid}
          serviceName={sc.serviceName ?? sc.workloadUid}
          cluster={sc.cluster}
          onClose={() => setExplain(null)}
        />
      )}
    </div>
  )
}
