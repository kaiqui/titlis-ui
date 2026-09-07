import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, MessageSquareText, ThumbsDown, ThumbsUp } from 'lucide-react'
import { motion } from 'motion/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Card } from '@/components/jeitto/Card'
import { EmptyState } from '@/components/jeitto/EmptyState'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { Header } from '@/components/layout/Header'
import { fadeInUp } from '@/lib/motion/tokens'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { LookoutBriefing } from '@/types'

const SEV_COLOR: Record<string, string> = {
  warning: '#d8341a',
  info: 'var(--color-primary)',
}

const KIND_LABEL: Record<string, string> = {
  regressao: 'Regressão',
  antecedente: 'Indicador antecedente',
  digest: 'Resumo',
  estate_report: 'Relatório do estate',
}

export function Confia() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'mural' | 'playbooks'>('mural')

  const briefings = useQuery({ queryKey: ['lookout-briefings'], queryFn: () => api.lookout.briefings(30), staleTime: 30_000 })
  const playbooks = useQuery({ queryKey: ['lookout-playbooks'], queryFn: () => api.lookout.playbooks(), staleTime: 60_000, enabled: tab === 'playbooks' })

  const feedback = useMutation({
    mutationFn: ({ id, verdict }: { id: number; verdict: 'util' | 'ruido' }) => api.lookout.feedback(id, verdict),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lookout-briefings'] }),
  })

  if (briefings.isLoading) return <><Header title="ConfiaAI" subtitle="Análise de confiabilidade" /><PageLoading /></>
  if (briefings.isError)
    return (
      <>
        <Header title="ConfiaAI" subtitle="Análise de confiabilidade" />
        <PageError message="Falha ao carregar o mural." onRetry={() => void briefings.refetch()} />
      </>
    )

  const rows = briefings.data ?? []

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title="ConfiaAI"
        subtitle="O analista vigia a trajetória da postura, explica cada regressão e registra o que aprendeu."
      />

      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">
        <div className="flex gap-2">
          {(['mural', 'playbooks'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="rounded-[8px] px-3 py-1.5 text-sm font-medium transition-colors"
              style={{
                backgroundColor: tab === t ? 'var(--color-primary)' : 'var(--color-muted)',
                color: tab === t ? '#fff' : 'var(--color-muted-foreground)',
              }}
            >
              {t === 'mural' ? 'Mural' : 'Playbooks'}
            </button>
          ))}
        </div>

        {tab === 'mural' && (
          <>
            {rows.length === 0 ? (
              <EmptyState
                icon={MessageSquareText}
                title="Nenhum briefing ainda"
                description="Quando um serviço regride de banda de postura, o ConfiaAI investiga e publica o porquê aqui."
              />
            ) : (
              <div className="space-y-3">
                {rows.map((b, i) => (
                  <BriefingCard
                    key={b.briefingId}
                    b={b}
                    index={i}
                    onFeedback={(verdict) => feedback.mutate({ id: b.briefingId, verdict })}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'playbooks' && (
          <>
            {playbooks.isLoading && <PageLoading />}
            {playbooks.data && playbooks.data.length === 0 && (
              <EmptyState
                icon={BookOpen}
                title="Nenhum playbook ainda"
                description="Depois de uma investigação inédita, o ConfiaAI rascunha um runbook reusável e ele aparece aqui."
              />
            )}
            <div className="space-y-3">
              {(playbooks.data ?? []).map((p) => (
                <Card key={p.playbookId} className="p-5">
                  <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{p.title}</p>
                  {p.appliesWhen && (
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>quando: {p.appliesWhen}</p>
                  )}
                  <div className="mt-2 space-y-2 text-sm leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{p.bodyMd}</ReactMarkdown>
                  </div>
                  <p className="mt-2 text-[10px]" style={{ color: 'var(--color-muted-foreground)' }}>
                    revalidado em {p.revalidatedAt ? formatDate(p.revalidatedAt) : 'nunca'}
                  </p>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function BriefingCard({
  b,
  index,
  onFeedback,
}: {
  b: LookoutBriefing
  index: number
  onFeedback: (verdict: 'util' | 'ruido') => void
}) {
  return (
    <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, delay: Math.min(index * 0.02, 0.2) }}>
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-[8px] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: SEV_COLOR[b.severity] ?? 'var(--color-muted-foreground)', backgroundColor: 'var(--color-muted)' }}
          >
            {KIND_LABEL[b.kind] ?? b.kind}
          </span>
          <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{b.title}</p>
          <span className="ml-auto text-[10px]" style={{ color: 'var(--color-muted-foreground)' }}>{formatDate(b.createdAt)}</span>
        </div>
        <div className="mt-2 space-y-2 text-sm leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{b.bodyMd}</ReactMarkdown>
        </div>
        <div className="mt-3 flex items-center gap-2">
          {b.feedback ? (
            <span className="text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>
              marcado como {b.feedback === 'util' ? 'útil' : 'ruído'}
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onFeedback('util')}
                className="inline-flex items-center gap-1 rounded-[8px] border px-2 py-1 text-[11px] font-medium hover:opacity-80"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <ThumbsUp size={11} />útil
              </button>
              <button
                type="button"
                onClick={() => onFeedback('ruido')}
                className="inline-flex items-center gap-1 rounded-[8px] border px-2 py-1 text-[11px] font-medium hover:opacity-80"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <ThumbsDown size={11} />ruído
              </button>
            </>
          )}
        </div>
      </Card>
    </motion.div>
  )
}

export default Confia
