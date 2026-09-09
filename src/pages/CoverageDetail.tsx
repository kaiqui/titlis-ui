import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  FileQuestion,
  Network,
  Sparkles,
} from 'lucide-react'
import { motion } from 'motion/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { api } from '@/lib/api'
import { Card } from '@/components/jeitto/Card'
import { ButtonDefault } from '@/components/jeitto/ButtonDefault'
import { fadeInUp } from '@/lib/motion/tokens'
import { EmptyState } from '@/components/jeitto/EmptyState'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { ScoreRing } from '@/components/jeitto/ScoreRing'
import { Header } from '@/components/layout/Header'
import { SummaryStrip } from '@/components/sre/SummaryStrip'
import { useCoverageDetail, useCoverageGraph, useLookoutServiceContext } from '@/hooks/useApi'
import { isFeatureEnabled } from '@/lib/featureFlags'
import { formatDate, formatNumber, severityColor } from '@/lib/utils'
import {
  confidenceLabel,
  dimensionLabel,
  distinctNaSources,
  findingsForDimension,
  naGroupsForDimension,
  overallBand,
  postureBand,
  stripIcon,
} from '@/lib/posture'
import type { CoverageDimension, CoverageGraphNeighbor, CoverageScorecard } from '@/types'

function isPendingCoverage(trustScore: number | null, dimensionCount: number, findingCount: number): boolean {
  return trustScore === null && dimensionCount === 0 && findingCount === 0
}

const KIND_LABELS: Record<string, string> = {
  service: 'Service', ingress: 'Ingress', hpa: 'HPA', pdb: 'PDB',
  networkpolicy: 'NetworkPolicy', configmap: 'ConfigMap', secret: 'Secret',
  dd_service: 'Datadog Service', dd_monitor: 'Monitor', dd_slo: 'SLO', queue: 'Fila',
}

function kindLabel(k: string): string {
  return KIND_LABELS[k] ?? k
}

function neighborLink(n: CoverageGraphNeighbor): string | null {
  if (n.kind === 'dd_slo') return isFeatureEnabled('slos') ? '/slos' : null
  if (n.kind === 'queue') return isFeatureEnabled('queues') ? '/queues' : null
  return null
}

export function CoverageDetail() {
  const { uid = '' } = useParams()
  const navigate = useNavigate()
  const detail = useCoverageDetail(uid)
  const graph = useCoverageGraph(uid)
  const memory = useLookoutServiceContext(uid)
  const investigate = useMutation({
    mutationFn: () => api.lookout.investigate(uid),
    onSettled: () => void memory.refetch(),
  })
  const [copied, setCopied] = useState(false)

  if (detail.isLoading) return <><Header title="Detalhe da postura" /><PageLoading /></>
  if (detail.isError) {
    return (
      <>
        <Header title="Detalhe da postura" />
        <PageError message="Falha ao carregar o serviço." onRetry={() => detail.refetch()} />
      </>
    )
  }

  const sc = detail.data
  if (!sc) {
    return (
      <>
        <Header title="Serviço não encontrado" subtitle="O scorecard pode ter sido removido ou o workload foi desativado." />
        <EmptyState
          icon={FileQuestion}
          title="Serviço não encontrado"
          description="O scorecard pode ter sido removido ou o workload foi desativado."
        />
      </>
    )
  }

  const pending = isPendingCoverage(sc.trustScore, sc.dimensions.length, sc.findings.length)
  const band = postureBand(overallBand(sc.trustScore))
  const failCount = sc.findings.filter((f) => f.outcome === 'fail').length
  const naSources = distinctNaSources(sc)

  const workloadUid = sc.workloadUid
  function handleCopyUid() {
    navigator.clipboard.writeText(workloadUid).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title={sc.serviceName ?? sc.workloadUid}
        subtitle={`${sc.cluster ?? 'Cluster desconhecido'} · avaliado ${formatDate(sc.evaluatedAt)}`}
      />

      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <ButtonDefault label="Voltar para Postura" visual="secondary" icon={ArrowLeft} onClick={() => navigate('/coverage')} />
          <button
            type="button"
            onClick={handleCopyUid}
            className="inline-flex items-center gap-1.5 rounded-[8px] border px-3 py-1.5 font-mono text-[11px] transition-colors hover:opacity-80"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}
            title="Copiar UID do workload"
          >
            {copied ? <Check className="h-3 w-3 text-[var(--color-success)]" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copiado!' : sc.workloadUid}
          </button>
        </div>

        {pending ? (
          <Card className="p-5">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Este serviço já foi descoberto, mas a avaliação de postura ainda não retornou. Quando a coleta
              concluir, esta página passa a exibir as dimensões e as ações automaticamente.
            </p>
          </Card>
        ) : (
          <>
            <SummaryStrip
              items={[
                { label: 'Postura', value: formatNumber(sc.trustScore), helper: band.label },
                { label: 'Confiança', value: confidenceLabel(sc.confidence) || 'n/d', helper: sc.uncertainty ? `±${Math.round(sc.uncertainty)}` : 'incerteza baixa' },
                { label: 'Problemas', value: failCount, helper: failCount > 0 ? 'visíveis por dimensão' : 'nenhum apontado' },
                { label: 'Fontes ausentes', value: naSources, helper: naSources > 0 ? 'sinais não instrumentados' : 'tudo instrumentado' },
              ]}
            />

            <Card className="p-5">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <ScoreRing score={sc.trustScore} size={100} strokeWidth={8} showFraction />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-[8px] px-3 py-1 text-sm font-bold"
                      style={{ color: band.color, backgroundColor: 'var(--color-muted)' }}
                    >
                      {formatNumber(sc.trustScore)} · {band.label}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                      {confidenceLabel(sc.confidence)}
                      {sc.uncertainty ? ` · ±${Math.round(sc.uncertainty)}` : ''}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                    Postura inferida dos sinais em Datadog e GitHub. Sinal ausente aparece como
                    "não instrumentado", nunca como falha.
                  </p>
                </div>
              </div>
            </Card>
          </>
        )}

        {(sc.moves?.length ?? 0) > 0 && (
          <Card className="p-5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
              O que moveria a postura
            </p>
            <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {sc.moves!.map((m) => (
                <div key={m.code} className="flex items-baseline gap-3 py-2.5 text-sm">
                  <span className="font-mono text-xs" style={{ color: 'var(--color-primary)' }}>{String(m.rank).padStart(2, '0')}</span>
                  <span className="min-w-0">{stripIcon(m.description)}</span>
                  <span className="ml-auto whitespace-nowrap font-mono text-xs" style={{ color: '#12a150' }}>+{Math.round(m.lift)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {sc.dimensions.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2" data-testid="coverage-dimensions">
            {sc.dimensions.map((d, index) => (
              <DimensionCard
                key={d.pillar}
                sc={sc}
                d={d}
                index={index}
              />
            ))}
          </div>
        )}

        {isFeatureEnabled('ai') && (
          <MemoryCard
            ctx={memory.data}
            investigating={investigate.isPending}
            investigateMsg={investigate.data?.message ?? (investigate.isError ? 'ConfiaAI indisponível para este tenant.' : null)}
            onInvestigate={() => investigate.mutate()}
          />
        )}

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

      </div>
    </div>
  )
}

const VERDICT_LABEL: Record<string, string> = {
  regressao_real: 'regressão real',
  postura_fraca: 'postura fraca',
  ruido: 'ruído',
  postura_saudavel: 'postura saudável',
  sinal_insuficiente: 'sinal insuficiente',
  erro: 'erro',
  quota_exceeded: 'orçamento de tokens esgotado',
}

// Memória do ConfiaAI para este serviço (LKT §8): fatos aprendidos + investigações + botão de
// investigação sob demanda. Sempre visível — quando vazio, convida a investigar.
function MemoryCard({
  ctx,
  investigating,
  investigateMsg,
  onInvestigate,
}: {
  ctx?: { investigations: Array<{ investigationId: number; hypothesis: string | null; verdict: string | null; createdAt: string }>; memory: Array<{ estateMemoryId: number; fact: string; lastConfirmedAt: string }> }
  investigating: boolean
  investigateMsg: string | null
  onInvestigate: () => void
}) {
  const facts = ctx?.memory ?? []
  const investigations = ctx?.investigations ?? []
  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Sparkles className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
        <h3 className="text-lg font-semibold">Memória do ConfiaAI</h3>
        <ButtonDefault
          label={investigating ? 'Investigando…' : 'Investigar com o ConfiaAI'}
          visual="secondary"
          icon={Sparkles}
          onClick={onInvestigate}
          disabled={investigating}
          className="ml-auto"
        />
      </div>

      {facts.length === 0 && investigations.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          O ConfiaAI ainda não investigou este serviço. A investigação lê a postura, correlaciona com
          Datadog/GitHub e registra a causa provável aqui.
        </p>
      ) : (
        <div className="space-y-4">
          {facts.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                O que aprendeu
              </p>
              <ul className="space-y-1.5 text-sm">
                {facts.map((f) => (
                  <li key={f.estateMemoryId} className="flex gap-2">
                    <span style={{ color: 'var(--color-primary)' }}>•</span>
                    <span className="min-w-0">
                      {f.fact}{' '}
                      <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>({formatDate(f.lastConfirmedAt)})</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {investigations.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                Investigações
              </p>
              <div className="space-y-2">
                {investigations.slice(0, 4).map((inv) => (
                  <div key={inv.investigationId} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold" style={{ color: 'var(--color-primary)' }}>
                        {VERDICT_LABEL[inv.verdict ?? ''] ?? inv.verdict ?? '—'}
                      </span>
                      <span className="ml-auto text-[10px]" style={{ color: 'var(--color-muted-foreground)' }}>{formatDate(inv.createdAt)}</span>
                    </div>
                    {inv.hypothesis && (
                      <div className="mt-1 text-[13px] leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{inv.hypothesis}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {investigateMsg && (
        <p className="mt-3 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{investigateMsg}</p>
      )}
    </Card>
  )
}

function DimensionCard({
  sc,
  d,
  index,
}: {
  sc: CoverageScorecard
  d: CoverageDimension
  index: number
}) {
  const [open, setOpen] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const slug = d.dimension ?? d.pillar
  const band = postureBand(d.band)
  const strength = d.strength ?? d.pct
  const pct = Math.max(0, Math.min(100, strength))
  const fails = findingsForDimension(sc, slug, 'fail')
  const passes = findingsForDimension(sc, slug, 'pass')
  const naGroups = naGroupsForDimension(sc, slug)

  return (
    <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, delay: index * 0.04 }}>
      <Card className="p-5">
        <button type="button" onClick={() => setOpen((o) => !o)} className="w-full text-left">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate font-semibold">{d.label ?? dimensionLabel(d.pillar)}</p>
            <span className="shrink-0 rounded-[8px] px-2 py-0.5 text-[11px] font-semibold" style={{ color: band.color, backgroundColor: 'var(--color-muted)' }}>
              {band.label}
            </span>
          </div>
          {d.question && (
            <p className="mt-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{d.question}</p>
          )}
          <div className="mt-3 h-1.5 overflow-hidden rounded-[4px]" style={{ backgroundColor: 'var(--color-border)' }}>
            <motion.div
              className="h-full rounded-[4px]"
              style={{ backgroundColor: band.color }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 + index * 0.04 }}
            />
          </div>
          <p className="mt-2 flex items-center justify-between text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            <span>força {Math.round(strength)}</span>
            <span className="flex items-center gap-1">
              {d.band === 'sem_sinal'
                ? 'sem instrumentação suficiente'
                : `${fails.length} problema${fails.length === 1 ? '' : 's'} · ${confidenceLabel(d.confidence)}`}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
            </span>
          </p>
        </button>

        {open && (
          <div className="mt-3 space-y-4 border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
            {fails.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted-foreground)' }}>Problemas</p>
                {fails.map((f) => (
                  <div key={f.code} className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--color-border)' }}>
                    <p className="text-sm">{stripIcon(f.message)}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px]" style={{ color: 'var(--color-muted-foreground)' }}>
                      {f.source && <span>{f.source}</span>}
                      {f.severity && (
                        <span className={`rounded-[6px] border px-1.5 py-px font-semibold uppercase ${severityColor(f.severity)}`}>{f.severity}</span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {naGroups.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted-foreground)' }}>Não instrumentado</p>
                {naGroups.map((g) => (
                  <div key={g.sourceLabel} className="rounded-lg border border-dashed px-3 py-2" style={{ borderColor: 'var(--color-border)' }}>
                    <p className="text-xs font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>{g.sourceLabel}</p>
                    <p className="mt-1 text-xs opacity-80" style={{ color: 'var(--color-muted-foreground)' }}>
                      {g.items.map((it) => it.label).join(' · ')}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {passes.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-success)]"
                >
                  {passes.length} {passes.length === 1 ? 'check OK' : 'checks OK'} {showPass ? '▲' : '▼'}
                </button>
                {showPass && (
                  <ul className="mt-1.5 space-y-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                    {passes.map((f) => (
                      <li key={f.code}>{stripIcon(f.message)}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {fails.length === 0 && naGroups.length === 0 && passes.length === 0 && (
              <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Sem sinais avaliados nesta dimensão.</p>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  )
}

export default CoverageDetail
