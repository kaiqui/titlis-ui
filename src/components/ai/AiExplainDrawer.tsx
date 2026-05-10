import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { X } from 'lucide-react'
import { api } from '@/lib/api'
import type { Finding, WorkloadDetail } from '@/types'

interface Props {
  finding: Finding
  workload: WorkloadDetail
  onClose: () => void
}

export function AiExplainDrawer({ finding, workload, onClose }: Props) {
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<'loading' | 'streaming' | 'done' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setContent('')
    setStatus('loading')
    setError(null)

    const run = async () => {
      try {
        const stream = api.ai.explainStream(workload.id, finding.ruleId, {
          pillar: finding.pillar,
          severity: finding.severity,
          deploymentName: workload.name,
          namespace: workload.namespace,
          actualValue: finding.actualValue,
        }, controller.signal)

        setStatus('streaming')
        for await (const event of stream) {
          if (event.type === 'chunk' && typeof event.content === 'string') {
            setContent(prev => prev + event.content)
          } else if (event.type === 'done') {
            break
          } else if (event.type === 'error') {
            throw new Error(String(event.error ?? 'Erro desconhecido'))
          } else if (typeof event.content === 'string') {
            setContent(prev => prev + event.content)
          }
        }
        if (!controller.signal.aborted) setStatus('done')
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Erro ao gerar explicação')
          setStatus('error')
        }
      }
    }

    void run()
    return () => controller.abort()
  }, [finding.ruleId, workload.id, workload.name, workload.namespace, finding.pillar, finding.severity, finding.actualValue])

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col shadow-2xl" style={{ backgroundColor: 'var(--color-card)', borderLeft: '1px solid var(--color-border)' }}>
      <div className="flex items-start justify-between gap-4 border-b px-6 py-5" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-primary)' }}>Explicar com ARIA</p>
          <p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{finding.ruleName}</p>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{finding.ruleId} · {finding.pillar}</p>
        </div>
        <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-2xl transition-colors hover:opacity-70" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {(status === 'loading' || (status === 'streaming' && !content)) && (
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <span className="h-2 w-2 animate-bounce rounded-full [animation-delay:0ms]" style={{ backgroundColor: 'var(--color-primary)' }} />
              <span className="h-2 w-2 animate-bounce rounded-full [animation-delay:150ms]" style={{ backgroundColor: 'var(--color-primary)' }} />
              <span className="h-2 w-2 animate-bounce rounded-full [animation-delay:300ms]" style={{ backgroundColor: 'var(--color-primary)' }} />
            </div>
            <span className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Pensando...</span>
          </div>
        )}

        {status === 'error' && !content && (
          <div className="rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#dc2626' }}>
            {error}
          </div>
        )}

        {(status === 'streaming' || status === 'done' || (status === 'error' && !!content)) && content && (
          <div className="prose prose-sm max-w-none" style={{ color: 'var(--color-foreground)' }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            {status === 'streaming' && (
              <span className="inline-block h-4 w-1 animate-pulse rounded" style={{ backgroundColor: 'var(--color-primary)' }} />
            )}
            {status === 'error' && (
              <p className="mt-4 rounded-2xl px-4 py-3 text-xs not-prose" style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#dc2626' }}>
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
