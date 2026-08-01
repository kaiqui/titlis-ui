import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Bot, ChevronDown, ChevronRight, ChevronUp, Clock, Send, ShieldOff, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AnimatePresence, motion } from 'motion/react'
import { animate, stagger } from 'animejs'
import { Header } from '@/components/layout/Header'
import { type Decision, ToolProposalCard, type ToolProposal } from '@/components/ai/ToolProposalCard'
import { api } from '@/lib/api'
import { fadeInUp } from '@/lib/motion/tokens'
import { cn } from '@/lib/utils'

function TypingIndicator() {
  const dotsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dotsRef.current) return
    const animation = animate(dotsRef.current.children, {
      translateY: [0, -6, 0],
      opacity: [0.4, 1, 0.4],
      delay: stagger(120),
      duration: 600,
      loop: true,
      easing: 'easeInOutSine',
    })
    return () => {
      animation.pause()
    }
  }, [])

  return (
    <div ref={dotsRef} className="flex items-center gap-1">
      {[0, 1, 2].map(dot => (
        <span key={dot} className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--color-primary)' }} />
      ))}
    </div>
  )
}

type MessageRole = 'user' | 'assistant' | 'proposals' | 'tool_results' | 'scope_rejected' | 'error'

interface ToolResult {
  proposalId: string
  toolName: string
  approved: boolean
  error?: string
}

interface SubmittedDecision {
  approved: boolean
  args: Record<string, unknown>
}

interface Message {
  id: string
  role: MessageRole
  content?: string
  thinking?: string
  proposals?: ToolProposal[]
  toolResults?: ToolResult[]
  // Preenchido quando o batch de propostas é submetido; torna os cards imutáveis
  submittedDecisions?: Record<string, SubmittedDecision>
}

interface AuditEntry {
  ts: number
  event: string
  [key: string]: unknown
}

function friendlyAiError(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower.includes('quota') || lower.includes('resource_exhausted') || lower.includes('free_tier')) {
    return 'Cota diária da API do ARIA esgotada. Tente novamente amanhã ou peça ao administrador para atualizar o plano de assinatura.'
  }
  if (lower.includes('ratelimit') || lower.includes('rate_limit') || lower.includes('too many requests') || lower.includes('429')) {
    return 'Limite de requisições atingido. Aguarde alguns minutos e tente novamente.'
  }
  if (lower.includes('ai_not_configured') || lower.includes('424')) {
    return 'O ARIA ainda não está configurado para este tenant. Acesse Configurações → ARIA para adicionar uma chave de API.'
  }
  if (lower.includes('authentication') || lower.includes('invalid api key') || lower.includes('401')) {
    return 'Chave de API do ARIA inválida ou expirada. Verifique as configurações em Configurações → ARIA.'
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'O ARIA demorou demais para responder. Tente novamente em alguns instantes.'
  }
  return 'Ocorreu um erro ao processar sua mensagem. Tente novamente.'
}

const SESSION_KEY = 'titlis.agent.session'

function getOrCreateSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}

interface WorkloadContext {
  workloadId: string
  workloadName: string
  namespace: string
  findingIds: string[]
}

export function AssistantPage() {
  const location = useLocation()
  const workloadCtx = (location.state as WorkloadContext | null) ?? null

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [decisions, setDecisions] = useState<Record<string, { approved: boolean; args: Record<string, unknown> }>>({})
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null)
  const [auditOpen, setAuditOpen] = useState(false)
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [openThinking, setOpenThinking] = useState<Set<string>>(new Set())
  const sessionId = useRef(getOrCreateSessionId())
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const autoStarted = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (!workloadCtx || autoStarted.current) return
    autoStarted.current = true
    const msg = `Analise as falhas de compliance do workload **${workloadCtx.workloadName}** (namespace: \`${workloadCtx.namespace}\`). Findings: ${workloadCtx.findingIds.join(', ')}.`
    void sendMessage(msg)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const appendMessage = (msg: Omit<Message, 'id'>) => {
    const full: Message = { id: crypto.randomUUID(), ...msg }
    setMessages(prev => [...prev, full])
    return full
  }

  const updateLastMessage = (updater: (m: Message) => Message) => {
    setMessages(prev => {
      if (prev.length === 0) return prev
      return [...prev.slice(0, -1), updater(prev[prev.length - 1])]
    })
  }

  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')
    setLoading(true)
    setDecisions({})
    setPendingSessionId(null)

    appendMessage({ role: 'user', content: msg })
    const assistantMsg = appendMessage({ role: 'assistant', content: '' })

    try {
      const stream = api.ai.agentChat(sessionId.current, msg, workloadCtx?.workloadId)
      let assistantText = ''
      let thinkingText = ''
      let gotProposals = false

      let thinkingOpened = false
      for await (const event of stream) {
        if (event.type === 'thinking' && typeof event.content === 'string') {
          thinkingText += event.content
          updateLastMessage(m => ({ ...m, thinking: thinkingText }))
          if (!thinkingOpened) {
            thinkingOpened = true
            setOpenThinking(prev => new Set([...prev, assistantMsg.id]))
          }
        } else if (event.type === 'message' && typeof event.content === 'string') {
          assistantText = event.content
          updateLastMessage(m => ({ ...m, content: assistantText }))
        } else if (event.type === 'scope_rejected') {
          updateLastMessage(m => ({ ...m, role: 'scope_rejected', content: String(event.reason ?? '') }))
        } else if (event.type === 'awaiting_approvals') {
          const proposals = (event.proposals as ToolProposal[]) ?? []
          gotProposals = true
          if (assistantText) {
            updateLastMessage(m => ({ ...m, content: assistantText }))
          } else {
            setMessages(prev => prev.filter(m => m.id !== assistantMsg.id))
          }
          appendMessage({ role: 'proposals', proposals })
          setPendingSessionId(sessionId.current)
        } else if (event.type === 'error') {
          updateLastMessage(m => ({ ...m, role: 'error', content: friendlyAiError(String(event.error ?? '')) }))
        } else if (event.type === 'done') {
          if (!assistantText && !gotProposals) {
            setMessages(prev => prev.filter(m =>
              m.id !== assistantMsg.id || m.role !== 'assistant' || !!m.content || !!m.thinking
            ))
          }
        }
      }
    } catch (err) {
      updateLastMessage(m => ({ ...m, role: 'error', content: friendlyAiError(err instanceof Error ? err.message : '') }))
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  const submitDecisions = async () => {
    if (!pendingSessionId) return
    setLoading(true)

    // Encontra o último batch de propostas ainda não submetido
    const proposalsMsg = [...messages].reverse().find(
      (m: Message) => m.role === 'proposals' && !m.submittedDecisions,
    )
    const proposals = proposalsMsg?.proposals ?? []

    // Persiste as decisões dentro da mensagem antes de chamar a API,
    // tornando este batch imutável independentemente do estado global
    if (proposalsMsg) {
      setMessages(prev =>
        prev.map(m =>
          m.id === proposalsMsg.id ? { ...m, submittedDecisions: { ...decisions } } : m,
        ),
      )
    }

    const decisionsPayload = proposals.map((p: ToolProposal) => {
      const d = decisions[p.proposal_id]
      return {
        proposalId: p.proposal_id,
        approved: d?.approved ?? false,
        editedArgs: d?.args !== p.args ? d?.args : undefined,
      }
    })

    const followUpMsg = appendMessage({ role: 'assistant', content: '' })
    const resultsMsg = appendMessage({ role: 'tool_results', toolResults: [] })

    try {
      const stream = api.ai.agentToolsRespond(pendingSessionId, decisionsPayload)
      let assistantText = ''
      let thinkingText = ''
      let thinkingOpened = false
      const toolResults: ToolResult[] = []
      let gotNewProposals = false

      for await (const event of stream) {
        if (event.type === 'tool_result') {
          const r: ToolResult = {
            proposalId: String(event.proposal_id ?? ''),
            toolName: String(event.tool_name ?? ''),
            approved: Boolean(event.approved),
            error: event.error ? String(event.error) : undefined,
          }
          toolResults.push(r)
          setMessages(prev => prev.map(m => m.id === resultsMsg.id ? { ...m, toolResults: [...toolResults] } : m))
        } else if (event.type === 'thinking' && typeof event.content === 'string') {
          thinkingText += event.content
          updateLastMessage(m => m.role === 'assistant' ? { ...m, thinking: thinkingText } : m)
          if (!thinkingOpened) {
            thinkingOpened = true
            setOpenThinking(prev => new Set([...prev, followUpMsg.id]))
          }
        } else if (event.type === 'message' && typeof event.content === 'string') {
          assistantText = event.content
          updateLastMessage(m => m.role === 'assistant' ? { ...m, content: assistantText } : m)
        } else if (event.type === 'awaiting_approvals') {
          const proposals = (event.proposals as ToolProposal[]) ?? []
          gotNewProposals = true
          setDecisions({})
          appendMessage({ role: 'proposals', proposals })
          setPendingSessionId(pendingSessionId)
        } else if (event.type === 'scope_rejected') {
          updateLastMessage(m => m.role === 'assistant' ? { ...m, role: 'scope_rejected', content: String(event.reason ?? '') } : m)
        } else if (event.type === 'error') {
          updateLastMessage(m => m.role === 'assistant' ? { ...m, role: 'error', content: friendlyAiError(String(event.error ?? '')) } : m)
        } else if (event.type === 'done') {
          if (!assistantText && !gotNewProposals) {
            setMessages(prev => prev.filter(m => m.role !== 'assistant' || m.content))
          }
          if (!gotNewProposals) setPendingSessionId(null)
        }
      }
    } catch (err) {
      appendMessage({ role: 'error', content: friendlyAiError(err instanceof Error ? err.message : '') })
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  const allDecided = (proposals: ToolProposal[]) =>
    proposals.every(p => decisions[p.proposal_id] !== undefined)

  const handleApprove = (proposalId: string, args: Record<string, unknown>) => {
    setDecisions(prev => ({ ...prev, [proposalId]: { approved: true, args } }))
  }

  const handleReject = (proposalId: string) => {
    setDecisions(prev => ({ ...prev, [proposalId]: { approved: false, args: {} } }))
  }

  const toggleThinking = (id: string) => {
    setOpenThinking(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const decisionFor = (proposalId: string): Decision => {
    const d = decisions[proposalId]
    if (!d) return 'pending'
    return d.approved ? 'approved' : 'rejected'
  }

  const loadAudit = async () => {
    setAuditOpen(v => !v)
    if (!auditOpen) {
      try {
        const resp = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:8080/v1'}/ai/agent/${sessionId.current}/audit`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('titlis.auth.session') ? JSON.parse(localStorage.getItem('titlis.auth.session')!).accessToken : ''}` },
        })
        if (resp.ok) {
          const data = await resp.json() as { audit_log: AuditEntry[] }
          setAuditLog(data.audit_log)
        }
      } catch { /* silent */ }
    }
  }

  const newSession = () => {
    sessionStorage.removeItem(SESSION_KEY)
    sessionId.current = getOrCreateSessionId()
    setMessages([])
    setDecisions({})
    setPendingSessionId(null)
    setAuditOpen(false)
    setAuditLog([])
    textareaRef.current?.focus()
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title="ARIA"
        subtitle="Diagnóstico e remediação conversacional de services"
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col px-4 pb-4 lg:px-8">
          <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-4 py-4" style={{ minHeight: 0 }}>
            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl" style={{ backgroundColor: 'rgba(var(--color-primary-rgb,99,102,241),0.1)' }}>
                  <Bot size={28} style={{ color: 'var(--color-primary)' }} />
                </div>
                <p className="text-base font-bold" style={{ color: 'var(--color-foreground)' }}>ARIA</p>
                <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                  Descreva um problema de compliance ou workload para começar.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {[
                    'Quais workloads estão com score crítico?',
                    'O deployment titlis-api tem liveness probe?',
                    'Mostre o histórico de remediações do titlis-ui',
                  ].map(suggestion => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void sendMessage(suggestion)}
                      className="flex items-center gap-1.5 rounded-2xl px-4 py-2 text-xs font-medium transition-colors"
                      style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)', border: '1px solid var(--color-border)' }}
                    >
                      <ChevronRight size={12} style={{ color: 'var(--color-primary)' }} />
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <AnimatePresence initial={false}>
            {messages.map(msg => (
              <motion.div
                key={msg.id}
                {...fadeInUp}
                className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {msg.role === 'user' && (
                  <div className="max-w-[75%] rounded-3xl rounded-br-lg px-5 py-3 text-sm" style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}>
                    {msg.content}
                  </div>
                )}

                {msg.role === 'assistant' && (msg.content || msg.thinking) && (
                  <div className="max-w-[85%] space-y-1.5">
                    {msg.thinking && (
                      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                        <button
                          type="button"
                          onClick={() => toggleThinking(msg.id)}
                          className="flex w-full items-center gap-2 px-4 py-2 text-xs transition-colors hover:opacity-80"
                          style={{ backgroundColor: 'rgba(var(--color-primary-rgb,99,102,241),0.06)', color: 'var(--color-muted-foreground)' }}
                        >
                          <Sparkles size={11} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                          <span className="font-medium">Raciocínio da ARIA</span>
                          <span className="ml-auto">
                            {openThinking.has(msg.id)
                              ? <ChevronUp size={12} />
                              : <ChevronDown size={12} />}
                          </span>
                        </button>
                        {openThinking.has(msg.id) && (
                          <div
                            className="max-h-64 overflow-y-auto px-4 py-3 text-xs leading-relaxed"
                            style={{ backgroundColor: 'var(--app-background)', color: 'var(--color-muted-foreground)', borderTop: '1px solid var(--color-border)' }}
                          >
                            <div className="prose prose-xs max-w-none dark:prose-invert" style={{ color: 'var(--color-muted-foreground)' }}>
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.thinking}</ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {msg.content && (
                      <div className="rounded-3xl rounded-bl-lg px-5 py-3 text-sm" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}>
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {msg.role === 'scope_rejected' && (
                  <div className="max-w-[85%] rounded-3xl rounded-bl-lg px-5 py-3 text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--color-foreground)' }}>
                    <div className="mb-2 flex items-center gap-2">
                      <ShieldOff size={14} style={{ color: '#ef4444' }} />
                      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#ef4444' }}>Fora do escopo</span>
                    </div>
                    <p>{msg.content}</p>
                  </div>
                )}

                {msg.role === 'error' && (
                  <div className="max-w-[85%] rounded-3xl rounded-bl-lg px-5 py-3 text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }}>
                    {msg.content}
                  </div>
                )}

                {msg.role === 'proposals' && msg.proposals && (
                  <div className="w-full max-w-[90%] space-y-3">
                    <div className="flex items-center gap-2 px-1">
                      <Bot size={14} style={{ color: 'var(--color-primary)' }} />
                      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
                        {msg.submittedDecisions ? 'Ações executadas' : 'Ações propostas — aprove ou rejeite cada uma'}
                      </p>
                    </div>
                    {msg.proposals.map(p => {
                      // Batch já submetido: usa decisão gravada na mensagem (imutável)
                      // Batch ativo: usa o estado global de decisões
                      const submitted = msg.submittedDecisions
                      const decision: Decision = submitted
                        ? (submitted[p.proposal_id]?.approved ? 'approved' : submitted[p.proposal_id] ? 'rejected' : 'pending')
                        : decisionFor(p.proposal_id)
                      return (
                        <ToolProposalCard
                          key={p.proposal_id}
                          proposal={p}
                          decision={decision}
                          onApprove={handleApprove}
                          onReject={handleReject}
                          disabled={loading || !!submitted || pendingSessionId === null}
                        />
                      )
                    })}
                    {/* Botão só aparece no batch ativo, nunca em batches já submetidos */}
                    {!msg.submittedDecisions && pendingSessionId && allDecided(msg.proposals) && !loading && (
                      <button
                        type="button"
                        onClick={() => void submitDecisions()}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-opacity hover:opacity-90"
                        style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
                      >
                        Confirmar decisões
                        <ChevronRight size={14} />
                      </button>
                    )}
                  </div>
                )}

                {msg.role === 'tool_results' && msg.toolResults && msg.toolResults.length > 0 && (
                  <div className="w-full max-w-[90%] space-y-1">
                    {msg.toolResults.map(r => (
                      <div key={r.proposalId} className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: 'var(--color-muted)' }}>
                        <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: r.error ? '#ef4444' : r.approved ? '#10b981' : '#6b7280' }} />
                        <span className="font-mono" style={{ color: 'var(--color-muted-foreground)' }}>{r.toolName}</span>
                        <span style={{ color: r.error ? '#ef4444' : r.approved ? '#10b981' : '#6b7280' }}>
                          {r.error ? `erro: ${r.error}` : r.approved ? 'executada' : 'rejeitada'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
            </AnimatePresence>

            {loading && (() => {
              const lastMsg = messages[messages.length - 1]
              const isThinking = lastMsg?.role === 'assistant' && !!lastMsg.thinking && !lastMsg.content
              return (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-3xl rounded-bl-lg px-5 py-3" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                    <TypingIndicator />
                    <span className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                      {isThinking ? 'Analisando...' : 'Pensando...'}
                    </span>
                  </div>
                </div>
              )
            })()}

            <div ref={bottomRef} />
          </div>

          <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void sendMessage()
                  }
                }}
                placeholder="Descreva o problema ou pergunte sobre um workload... (Enter para enviar)"
                rows={2}
                disabled={loading || !!pendingSessionId}
                className="flex-1 resize-none rounded-2xl px-4 py-3 text-sm outline-none transition-colors"
                style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
              />
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={!input.trim() || loading || !!pendingSessionId}
                className="flex h-12 w-12 items-center justify-center rounded-2xl transition-opacity disabled:opacity-40"
                style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
              >
                <Send size={16} />
              </button>
            </div>
            {pendingSessionId && (
              <p className="mt-2 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                Aprove ou rejeite as ações propostas acima para continuar.
              </p>
            )}
          </div>
        </div>

        <aside className="hidden w-72 shrink-0 border-l lg:flex lg:flex-col" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--color-border)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>Sessão</p>
            <button
              type="button"
              onClick={newSession}
              className="text-xs transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-primary)' }}
            >
              Nova sessão
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>ID da sessão</p>
              <p className="break-all font-mono text-[10px]" style={{ color: 'var(--color-foreground)' }}>{sessionId.current}</p>
            </div>

            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>Mensagens</p>
              <p className="text-sm font-bold" style={{ color: 'var(--color-foreground)' }}>{messages.filter(m => m.role === 'user').length} do usuário</p>
            </div>

            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>Ferramentas</p>
              <p className="text-sm font-bold" style={{ color: 'var(--color-foreground)' }}>
                {messages.filter(m => m.role === 'proposals').reduce((acc, m) => acc + (m.proposals?.length ?? 0), 0)} propostas
              </p>
            </div>

            <div className="border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => void loadAudit()}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs transition-colors hover:opacity-80"
                style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)' }}
              >
                <Clock size={12} />
                {auditOpen ? 'Fechar trilha de auditoria' : 'Ver trilha de auditoria'}
              </button>

              {auditOpen && (
                <div className="mt-3 space-y-2">
                  {auditLog.length === 0
                    ? <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Nenhum evento ainda.</p>
                    : auditLog.map((entry, i) => (
                      <div key={i} className="rounded-xl px-3 py-2 text-[10px]" style={{ backgroundColor: 'var(--color-muted)' }}>
                        <p className="font-semibold" style={{ color: 'var(--color-foreground)' }}>{entry.event}</p>
                        <p style={{ color: 'var(--color-muted-foreground)' }}>
                          {new Date(entry.ts * 1000).toLocaleTimeString('pt-BR')}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
