import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, ChevronDown, MessagesSquare, Sparkles, Wrench } from 'lucide-react'
import { motion } from 'motion/react'
import { ButtonDefault } from '@/components/jeitto/ButtonDefault'
import { Card } from '@/components/jeitto/Card'
import { EmptyState } from '@/components/jeitto/EmptyState'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { Header } from '@/components/layout/Header'
import { useHubRollup } from '@/hooks/useApi'
import { fadeInUp } from '@/lib/motion/tokens'
import { stripIcon } from '@/lib/posture'
import type { EstateNode } from '@/types'

interface MoveRow {
  code: string
  description: string
  dimension: string
  totalLift: number
  isRemediable: boolean
  services: Array<{ name: string; workloadUid?: string }>
}

function collectMoves(node: EstateNode, acc: Map<string, MoveRow>) {
  if (node.kind === 'service') {
    for (const m of node.topMoves) {
      const cur = acc.get(m.code)
      const svc = { name: node.name, workloadUid: node.workloadUid }
      if (cur) {
        cur.totalLift += m.totalLift
        cur.services.push(svc)
      } else {
        acc.set(m.code, {
          code: m.code,
          description: m.description,
          dimension: m.code.replace(/-\d+$/, ''),
          totalLift: m.totalLift,
          isRemediable: m.isRemediable,
          services: [svc],
        })
      }
    }
    return
  }
  node.children.forEach((c) => collectMoves(c, acc))
}

export function AriaPage() {
  const navigate = useNavigate()
  const { data: root, isLoading, isError, refetch } = useHubRollup()
  const [openCode, setOpenCode] = useState<string | null>(null)
  const [onlyRemediable, setOnlyRemediable] = useState(false)

  const moves = useMemo(() => {
    if (!root) return []
    const acc = new Map<string, MoveRow>()
    collectMoves(root, acc)
    const list = [...acc.values()].sort((a, b) => b.totalLift - a.totalLift)
    return onlyRemediable ? list.filter((m) => m.isRemediable) : list
  }, [root, onlyRemediable])

  if (isLoading) return <><Header title="ARIA" subtitle="Da postura para a ação" /><PageLoading /></>
  if (isError) return <><Header title="ARIA" subtitle="Da postura para a ação" /><PageError message="Falha ao carregar." onRetry={() => refetch()} /></>

  const remediableCount = moves.filter((m) => m.isRemediable).length

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="ARIA" subtitle="Da postura para a ação — a fila priorizada de movimentos do estate." />

      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">
        <Card>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))', border: '1px solid rgba(99,102,241,0.3)' }}>
              <Sparkles size={20} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>A ARIA transforma a leitura da postura em trabalho</p>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                Cada linha é um movimento que aparece na postura de vários serviços. Os remediáveis viram PR unitário
                com sua aprovação; os demais (SLO/monitor ausente) a ARIA propõe a mudança.
              </p>
            </div>
            <ButtonDefault label="Conversar com a ARIA" visual="secondary" icon={MessagesSquare} onClick={() => navigate('/assistant')} />
          </div>
        </Card>

        <div className="flex gap-2">
          {([['all', `Todos (${moves.length})`], ['remediable', `Remediáveis (${remediableCount})`]] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setOnlyRemediable(id === 'remediable')}
              className="rounded-full px-4 py-1.5 text-xs font-semibold transition-colors"
              style={{
                backgroundColor: (id === 'remediable') === onlyRemediable ? 'var(--color-primary)' : 'var(--color-muted)',
                color: (id === 'remediable') === onlyRemediable ? '#fff' : 'var(--color-muted-foreground)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {moves.length === 0 ? (
          <EmptyState icon={Bot} title="Nada na fila" description="Sem movimentos pendentes — a postura do estate está estável." />
        ) : (
          <div className="space-y-2">
            {moves.map((m, i) => {
              const open = openCode === m.code
              return (
                <motion.div key={m.code} layout {...fadeInUp} className="rounded-3xl border px-5 py-4" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-xs" style={{ color: 'var(--color-primary)' }}>{String(i + 1).padStart(2, '0')}</span>
                    <button type="button" onClick={() => setOpenCode(open ? null : m.code)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                      <span className="min-w-0 text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>{stripIcon(m.description)}</span>
                      <ChevronDown size={14} className="shrink-0 transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none', color: 'var(--color-muted-foreground)' }} />
                    </button>
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                      {m.services.length} serviço{m.services.length === 1 ? '' : 's'}
                    </span>
                    <span className="shrink-0 rounded bg-[var(--color-muted)] px-1 py-px font-mono text-[10px]" style={{ color: 'var(--color-muted-foreground)' }}>{m.code}</span>
                    <span className="shrink-0 font-mono text-xs" style={{ color: '#16a34a' }}>+{Math.round(m.totalLift / Math.max(1, m.services.length))}</span>
                  </div>

                  {open && (
                    <div className="mt-3 space-y-1.5 border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
                      {m.services.map((s, j) => (
                        <div key={`${s.workloadUid ?? s.name}-${j}`} className="flex items-center justify-between gap-3 text-sm">
                          <span className="min-w-0 truncate" style={{ color: 'var(--color-foreground)' }}>{s.name}</span>
                          {m.isRemediable && s.workloadUid ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/scorecards/${encodeURIComponent(s.workloadUid!)}/remediate`)}
                              className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium"
                              style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                            >
                              <Wrench size={11} />Corrigir com IA
                            </button>
                          ) : (
                            <span className="shrink-0 text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>proposta manual</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default AriaPage
