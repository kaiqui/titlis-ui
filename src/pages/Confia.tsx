import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Check, MessageSquareText, Plus, Send, ShieldAlert, ThumbsDown, ThumbsUp, Wand2, X } from 'lucide-react'
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
import type { LookoutBriefing, LookoutChatMessage } from '@/types'

const CHAT_SESSION_KEY = 'titlis.confia.chatSessionId'
const ACTIVE_SKILLS_KEY = 'titlis.confia.activeSkills'

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

const CONFIA_TABS = ['mural', 'playbooks', 'chat', 'skills', 'pendencias'] as const
type ConfiaTab = (typeof CONFIA_TABS)[number]

export function Confia() {
  const qc = useQueryClient()
  // Abas viram subitens na sidebar (ver Sidebar.tsx) — a URL é a fonte da verdade pra poder
  // linkar direto pra uma aba, não só um estado local perdido ao navegar.
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab: ConfiaTab = CONFIA_TABS.includes(tabParam as ConfiaTab) ? (tabParam as ConfiaTab) : 'mural'

  // Sem tab na URL (ex.: veio do link "ConfAI" da sidebar, não de um subitem) — grava o default
  // pra sidebar destacar o subitem "Mural" corretamente, em vez de nenhum.
  useEffect(() => {
    if (tabParam === null) setSearchParams({ tab: 'mural' }, { replace: true })
  }, [tabParam, setSearchParams])

  const briefings = useQuery({ queryKey: ['lookout-briefings'], queryFn: () => api.lookout.briefings(30), staleTime: 30_000 })
  const playbooks = useQuery({ queryKey: ['lookout-playbooks'], queryFn: () => api.lookout.playbooks(), staleTime: 60_000, enabled: tab === 'playbooks' })

  const feedback = useMutation({
    mutationFn: ({ id, verdict }: { id: number; verdict: 'util' | 'ruido' }) => api.lookout.feedback(id, verdict),
    onSettled: () => qc.invalidateQueries({ queryKey: ['lookout-briefings'] }),
  })

  if (briefings.isLoading) return <><Header title="ConfAI" subtitle="Análise de confiabilidade" /><PageLoading /></>
  if (briefings.isError)
    return (
      <>
        <Header title="ConfAI" subtitle="Análise de confiabilidade" />
        <PageError message="Falha ao carregar o mural." onRetry={() => void briefings.refetch()} />
      </>
    )

  const rows = briefings.data ?? []

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title="ConfAI"
        subtitle="O analista vigia a trajetória da postura, explica cada regressão e registra o que aprendeu."
      />

      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">
        {tab === 'mural' && (
          <>
            {rows.length === 0 ? (
              <EmptyState
                icon={MessageSquareText}
                title="Nenhum briefing ainda"
                description="Quando um serviço regride de banda de postura, o ConfAI investiga e publica o porquê aqui."
              />
            ) : (
              <div className="space-y-3">
                {rows.map((b, i) => (
                  <BriefingCard
                    key={b.briefingId}
                    b={b}
                    index={i}
                    pending={feedback.isPending && feedback.variables?.id === b.briefingId}
                    failed={feedback.isError && feedback.variables?.id === b.briefingId}
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
                description="Depois de uma investigação inédita, o ConfAI rascunha um runbook reusável e ele aparece aqui."
              />
            )}
            <div className="space-y-3">
              {(playbooks.data ?? []).map((p) => (
                <Card key={p.playbookId} className="p-5">
                  <p className="text-sm font-bold" style={{ color: 'var(--color-foreground)' }}>{p.title}</p>
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

        {tab === 'chat' && <ChatPanel />}
        {tab === 'skills' && <SkillsPanel />}
        {tab === 'pendencias' && <PendingActionsPanel />}
      </div>
    </div>
  )
}

function PendingActionsPanel() {
  const qc = useQueryClient()
  const pending = useQuery({ queryKey: ['lookout-mcp-actions'], queryFn: () => api.lookout.mcpActions.list(), staleTime: 10_000 })

  const decide = useMutation({
    mutationFn: ({ id, verdict }: { id: number; verdict: 'approve' | 'reject' }) =>
      verdict === 'approve' ? api.lookout.mcpActions.approve(id) : api.lookout.mcpActions.reject(id),
    onSettled: () => qc.invalidateQueries({ queryKey: ['lookout-mcp-actions'] }),
  })

  const rows = (pending.data ?? []).filter((r) => r.status === 'pending')

  return (
    <div className="space-y-3">
      <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
        Ações que o ConfAI propôs em provedores externos (ex.: Datadog) e que ainda não foram aplicadas — toda tool que não é
        comprovadamente de leitura para aqui até você aprovar.
      </p>
      {rows.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="Nenhuma pendência"
          description="Quando o ConfAI propuser uma ação de escrita (ex.: criar um monitor), ela aparece aqui antes de ser aplicada."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((a) => (
            <Card key={a.pendingMcpActionId} className="p-5">
              <div className="flex items-center gap-2">
                <span
                  className="rounded-[8px] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  style={{ backgroundColor: 'var(--color-muted)', color: '#d8341a' }}
                >
                  {a.provider}
                </span>
                <p className="font-mono text-sm font-bold" style={{ color: 'var(--color-foreground)' }}>{a.toolName}</p>
                <span className="ml-auto text-[10px]" style={{ color: 'var(--color-muted-foreground)' }}>{formatDate(a.createdAt)}</span>
              </div>
              <pre
                className="mt-2 overflow-x-auto rounded-[8px] p-2 text-[11px]"
                style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
              >
                {JSON.stringify(a.argumentsJson, null, 2)}
              </pre>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ id: a.pendingMcpActionId, verdict: 'approve' })}
                  className="inline-flex items-center gap-1 rounded-[8px] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <Check size={12} />
                  Aprovar
                </button>
                <button
                  type="button"
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ id: a.pendingMcpActionId, verdict: 'reject' })}
                  className="inline-flex items-center gap-1 rounded-[8px] border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <X size={12} />
                  Rejeitar
                </button>
              </div>
              {decide.isError && decide.variables?.id === a.pendingMcpActionId && (
                <p className="mt-2 text-[11px]" style={{ color: '#d8341a' }}>
                  {decide.error instanceof Error ? decide.error.message : 'falha ao decidir — tente de novo.'}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function SkillsPanel() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', invocationName: '', appliesWhen: '', bodyMd: '' })

  const skills = useQuery({ queryKey: ['lookout-skills'], queryFn: () => api.lookout.skills.list(), staleTime: 30_000 })

  const create = useMutation({
    mutationFn: () => api.lookout.skills.create(form),
    onSuccess: () => {
      setForm({ title: '', invocationName: '', appliesWhen: '', bodyMd: '' })
      setShowForm(false)
      void qc.invalidateQueries({ queryKey: ['lookout-skills'] })
    },
  })

  const rows = skills.data ?? []
  const canSubmit = form.title.trim() && form.invocationName.trim() && form.bodyMd.trim()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          Procedimentos que o ConfAI segue quando você chama <code>/nome-da-skill</code> no chat.
        </p>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <Plus size={14} />
          Nova skill
        </button>
      </div>

      {showForm && (
        <Card className="space-y-3 p-5">
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Título (ex.: Verificar OOM)"
            className="w-full rounded-[8px] border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--color-border)' }}
          />
          <input
            value={form.invocationName}
            onChange={(e) => setForm((f) => ({ ...f, invocationName: e.target.value.replace(/\s+/g, '-').toLowerCase() }))}
            placeholder="Nome de invocação (ex.: verificar-oom)"
            className="w-full rounded-[8px] border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--color-border)' }}
          />
          <input
            value={form.appliesWhen}
            onChange={(e) => setForm((f) => ({ ...f, appliesWhen: e.target.value }))}
            placeholder="Quando se aplica (opcional)"
            className="w-full rounded-[8px] border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--color-border)' }}
          />
          <textarea
            value={form.bodyMd}
            onChange={(e) => setForm((f) => ({ ...f, bodyMd: e.target.value }))}
            placeholder="Procedimento em markdown — passo a passo que o ConfAI vai seguir"
            rows={6}
            className="w-full rounded-[8px] border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--color-border)' }}
          />
          <button
            type="button"
            disabled={!canSubmit || create.isPending}
            onClick={() => create.mutate()}
            className="rounded-[8px] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {create.isPending ? 'salvando...' : 'Salvar skill'}
          </button>
        </Card>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={Wand2}
          title="Nenhuma skill ainda"
          description="Crie um procedimento reusável, ou peça pro ConfAI virar uma investigação repetida em skill."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((s) => (
            <Card key={s.playbookId} className="p-5">
              <div className="flex items-center gap-2">
                <span
                  className="rounded-[8px] px-2 py-0.5 font-mono text-[11px]"
                  style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-primary)' }}
                >
                  /{s.invocationName}
                </span>
                <p className="text-sm font-bold" style={{ color: 'var(--color-foreground)' }}>{s.title}</p>
              </div>
              {s.appliesWhen && <p className="mt-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>quando: {s.appliesWhen}</p>}
              <div className="mt-2 space-y-2 text-sm leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{s.bodyMd}</ReactMarkdown>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// Não usa <Card> aqui de propósito: o Card do design system força overflow-hidden e envolve os
// filhos num div sem flex/altura — isso corta conversas longas em vez de deixar rolar. Um painel
// de chat precisa de controle total da cadeia flex/overflow, então replica o visual do Card
// (borda, sombra, cantos) numa div própria.
function ChatPanel() {
  const qc = useQueryClient()
  const [chatSessionId, setChatSessionId] = useState<number | null>(() => {
    const raw = sessionStorage.getItem(CHAT_SESSION_KEY)
    return raw ? Number.parseInt(raw, 10) : null
  })
  const [draft, setDraft] = useState('')
  const [streamingText, setStreamingText] = useState<string | null>(null)
  const [activeSkills, setActiveSkills] = useState<string[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(ACTIVE_SKILLS_KEY) ?? '[]')
    } catch {
      return []
    }
  })
  const [skillsMenuOpen, setSkillsMenuOpen] = useState(false)
  const skillsMenuRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const sessions = useQuery({
    queryKey: ['lookout-chat-sessions'],
    queryFn: () => api.lookout.chat.sessions(),
    staleTime: 10_000,
  })

  const skillsList = useQuery({
    queryKey: ['lookout-skills'],
    queryFn: () => api.lookout.skills.list(),
    staleTime: 30_000,
  })

  useEffect(() => {
    sessionStorage.setItem(ACTIVE_SKILLS_KEY, JSON.stringify(activeSkills))
  }, [activeSkills])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (skillsMenuRef.current && !skillsMenuRef.current.contains(e.target as Node)) setSkillsMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function toggleSkill(invocationName: string) {
    setActiveSkills((prev) => (prev.includes(invocationName) ? prev.filter((n) => n !== invocationName) : [...prev, invocationName]))
  }

  const messages = useQuery({
    queryKey: ['lookout-chat-messages', chatSessionId],
    queryFn: () => api.lookout.chat.messages(chatSessionId!),
    enabled: chatSessionId !== null,
  })

  const createSession = useMutation({
    mutationFn: () => api.lookout.chat.createSession(),
    onSuccess: (id) => {
      sessionStorage.setItem(CHAT_SESSION_KEY, String(id))
      setChatSessionId(id)
    },
  })

  const send = useMutation({
    mutationFn: async (message: string) => {
      let sid = chatSessionId
      if (sid === null) sid = await createSession.mutateAsync()
      setStreamingText('')
      return api.lookout.chat.stream(sid, message, (delta) => setStreamingText((prev) => (prev ?? '') + delta), activeSkills)
    },
    onSettled: () => {
      setStreamingText(null)
      qc.invalidateQueries({ queryKey: ['lookout-chat-messages', chatSessionId] })
      qc.invalidateQueries({ queryKey: ['lookout-chat-sessions'] })
    },
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.data, send.isPending, streamingText])

  function handleSend() {
    const text = draft.trim()
    if (!text || send.isPending) return
    setDraft('')
    send.mutate(text)
  }

  function selectSession(id: number) {
    sessionStorage.setItem(CHAT_SESSION_KEY, String(id))
    setChatSessionId(id)
  }

  function handleNewChat() {
    sessionStorage.removeItem(CHAT_SESSION_KEY)
    setChatSessionId(null)
  }

  const rows = messages.data ?? []
  const sessionRows = sessions.data ?? []

  return (
    <div
      className="flex h-[75vh] overflow-hidden rounded-[12px] border"
      style={{ background: 'var(--color-card)', borderColor: 'var(--color-hairline)', boxShadow: 'var(--shadow-brutal-sm)' }}
    >
      {/* Histórico de conversas */}
      <div className="flex w-64 flex-shrink-0 flex-col border-r" style={{ borderColor: 'var(--color-border)' }}>
        <div className="border-b p-3" style={{ borderColor: 'var(--color-border)' }}>
          <button
            type="button"
            onClick={handleNewChat}
            className="flex w-full items-center justify-center gap-1.5 rounded-[8px] px-3 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Plus size={14} />
            Nova conversa
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
          {sessionRows.length === 0 && (
            <p className="p-2 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              Suas conversas aparecem aqui.
            </p>
          )}
          {sessionRows.map((s) => (
            <button
              key={s.chatSessionId}
              type="button"
              onClick={() => selectSession(s.chatSessionId)}
              className="block w-full truncate rounded-[8px] px-2.5 py-2 text-left text-xs"
              style={{
                backgroundColor: s.chatSessionId === chatSessionId ? 'var(--color-muted)' : 'transparent',
                color: s.chatSessionId === chatSessionId ? 'var(--color-foreground)' : 'var(--color-muted-foreground)',
                fontWeight: s.chatSessionId === chatSessionId ? 600 : 400,
              }}
              title={s.title ?? undefined}
            >
              {s.title || `Conversa de ${formatDate(s.createdAt)}`}
            </button>
          ))}
        </div>
      </div>

      {/* Conversa ativa */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-sm font-bold" style={{ color: 'var(--color-foreground)' }}>Converse com o ConfAI</p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {rows.length === 0 && !send.isPending && (
            <EmptyState
              icon={MessageSquareText}
              title="Pergunte sobre a plataforma"
              description="Postura, cobertura, SLOs, custos, filas ou conexões entre serviços — pergunte em linguagem natural."
            />
          )}
          {rows.map((m) => (
            <ChatBubble key={m.chatMessageId} message={m} />
          ))}
          {send.isPending && (
            <div className="flex justify-start">
              <div
                className="max-w-[80%] rounded-[8px] px-3 py-2 text-sm leading-relaxed"
                style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)' }}
              >
                {streamingText ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingText}</ReactMarkdown>
                ) : (
                  <span className="italic" style={{ color: 'var(--color-muted-foreground)' }}>consultando a plataforma...</span>
                )}
              </div>
            </div>
          )}
          {send.isError && (
            <p className="text-xs" style={{ color: '#d8341a' }}>
              {send.error instanceof Error ? send.error.message : 'falha ao enviar — tente de novo'}
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t p-3" style={{ borderColor: 'var(--color-border)' }}>
          {activeSkills.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {activeSkills.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium"
                  style={{ backgroundColor: 'var(--color-primary-soft, var(--color-muted))', color: 'var(--color-primary)' }}
                >
                  <Wand2 size={10} />/{name}
                  <button type="button" onClick={() => toggleSkill(name)} aria-label={`desligar /${name}`}>
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="relative" ref={skillsMenuRef}>
              <button
                type="button"
                onClick={() => setSkillsMenuOpen((v) => !v)}
                title="Ligar skills para esta conversa"
                className="relative inline-flex items-center gap-1.5 rounded-[8px] border px-3 py-2 text-sm font-medium"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
              >
                <Wand2 size={14} />
                Skills
                {activeSkills.length > 0 && (
                  <span
                    className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    {activeSkills.length}
                  </span>
                )}
              </button>
              {skillsMenuOpen && (
                <div
                  className="absolute bottom-full left-0 z-10 mb-2 w-72 rounded-[8px] border p-2 shadow-lg"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
                >
                  <p className="px-1.5 pb-1.5 text-[11px] font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>
                    Ligue procedimentos pra aplicar em toda a conversa
                  </p>
                  {(skillsList.data ?? []).length === 0 ? (
                    <p className="p-2 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                      Nenhuma skill criada ainda (aba Skills).
                    </p>
                  ) : (
                    <div className="max-h-56 space-y-0.5 overflow-y-auto">
                      {(skillsList.data ?? []).map((s) => (
                        <label
                          key={s.playbookId}
                          className="flex cursor-pointer items-start gap-2 rounded-[6px] px-1.5 py-1.5 text-xs hover:bg-[var(--color-muted)]"
                        >
                          <input
                            type="checkbox"
                            checked={activeSkills.includes(s.invocationName)}
                            onChange={() => toggleSkill(s.invocationName)}
                            className="mt-0.5"
                          />
                          <span>
                            <span className="block font-medium" style={{ color: 'var(--color-foreground)' }}>
                              /{s.invocationName}
                            </span>
                            <span style={{ color: 'var(--color-muted-foreground)' }}>{s.title}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Pergunte sobre postura, cobertura, SLOs, custos, filas ou conexões..."
              className="flex-1 rounded-[8px] border px-3 py-2 text-sm outline-none"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={send.isPending || !draft.trim()}
              className="inline-flex items-center gap-1.5 rounded-[8px] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <Send size={14} />
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChatBubble({ message }: { message: LookoutChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[80%] rounded-[8px] px-3 py-2 text-sm leading-relaxed"
        style={{
          backgroundColor: isUser ? 'var(--color-primary)' : 'var(--color-muted)',
          color: isUser ? '#fff' : 'var(--color-foreground)',
        }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.contentMd}</ReactMarkdown>
        {!isUser && Array.isArray(message.toolCallsJson) && message.toolCallsJson.length > 0 && (
          <p className="mt-1.5 text-[10px] opacity-70">
            consultou: {message.toolCallsJson.map((t) => t.tool).join(', ')}
          </p>
        )}
        {!isUser && Array.isArray(message.toolCallsJson) && message.toolCallsJson.some((t) => t.citations?.length) && (
          <p className="mt-1 flex flex-wrap items-center gap-2 text-[10px]">
            {message.toolCallsJson.flatMap((t) => t.citations ?? []).map((c) => (
              <a key={c.url} href={c.url} target="_blank" rel="noopener noreferrer" className="underline opacity-90 hover:opacity-100">
                🔗 {c.label}
              </a>
            ))}
          </p>
        )}
      </div>
    </div>
  )
}

function BriefingCard({
  b,
  index,
  pending,
  failed,
  onFeedback,
}: {
  b: LookoutBriefing
  index: number
  pending?: boolean
  failed?: boolean
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
          <p className="text-sm font-bold" style={{ color: 'var(--color-foreground)' }}>{b.title}</p>
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
                disabled={pending}
                onClick={() => onFeedback('util')}
                className="inline-flex items-center gap-1 rounded-[8px] border px-2 py-1 text-[11px] font-medium hover:opacity-80 disabled:opacity-50"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <ThumbsUp size={11} />útil
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => onFeedback('ruido')}
                className="inline-flex items-center gap-1 rounded-[8px] border px-2 py-1 text-[11px] font-medium hover:opacity-80 disabled:opacity-50"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <ThumbsDown size={11} />ruído
              </button>
              {failed && (
                <span className="text-[11px]" style={{ color: '#d8341a' }}>falha ao enviar — tente de novo</span>
              )}
            </>
          )}
        </div>
      </Card>
    </motion.div>
  )
}

export default Confia
