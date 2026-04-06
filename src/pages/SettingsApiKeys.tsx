import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, KeyRound, Plus, Trash2 } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { ButtonDefault } from '@/components/jeitto/ButtonDefault'
import { Card, CardHeader, CardTitle } from '@/components/jeitto/Card'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { api } from '@/lib/api'
import type { ApiKeyCreateResponse } from '@/lib/auth'
import { formatDate } from '@/lib/utils'

export function SettingsApiKeys() {
  const queryClient = useQueryClient()
  const [description, setDescription] = useState('')
  const [newKey, setNewKey] = useState<ApiKeyCreateResponse | null>(null)
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const { data: keys, isLoading, error } = useQuery({
    queryKey: ['api-keys'],
    queryFn: api.apiKeys.list,
  })

  const createMutation = useMutation({
    mutationFn: () => api.apiKeys.create(description.trim() || undefined),
    onSuccess: (created) => {
      setNewKey(created)
      setDescription('')
      void queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: (err) => {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Não foi possível criar a chave.' })
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (id: number) => api.apiKeys.revoke(id),
    onSuccess: () => {
      setFeedback({ tone: 'success', message: 'Chave revogada com sucesso.' })
      void queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: (err) => {
      setFeedback({ tone: 'error', message: err instanceof Error ? err.message : 'Não foi possível revogar a chave.' })
    },
  })

  if (isLoading) return <PageLoading />
  if (error) return <PageError message={error instanceof Error ? error.message : 'Erro ao carregar chaves.'} />

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="Chaves de API" subtitle="Gerencie chaves de API para o operator e integrações." />

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-3xl space-y-6">

          {feedback && (
            <div
              className="rounded-2xl border px-4 py-3 text-sm"
              style={{
                borderColor: feedback.tone === 'success' ? 'rgba(34,197,94,0.22)' : 'rgba(239,68,68,0.22)',
                color: feedback.tone === 'success' ? '#16a34a' : '#dc2626',
                background: feedback.tone === 'success' ? 'rgba(240,253,244,0.8)' : 'rgba(254,242,242,0.8)',
              }}
            >
              {feedback.message}
            </div>
          )}

          {newKey && (
            <div className="rounded-[1.6rem] border p-5" style={{ borderColor: 'rgba(34,197,94,0.25)', background: 'rgba(240,253,244,0.6)' }}>
              <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#16a34a' }}>
                <Check size={16} />
                Chave criada. Guarde agora — ela não será exibida novamente.
              </div>
              <div className="mt-3 flex items-center gap-3 rounded-xl border bg-white p-3" style={{ borderColor: 'var(--color-border)' }}>
                <code className="flex-1 break-all text-sm font-mono" style={{ color: 'var(--color-foreground)' }}>
                  {newKey.rawToken}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(newKey.rawToken)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors"
                  style={{ borderColor: 'var(--color-border)', color: copied ? '#16a34a' : 'var(--color-muted-foreground)' }}
                  title="Copiar chave"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <button
                type="button"
                className="mt-3 text-xs underline"
                style={{ color: 'var(--color-muted-foreground)' }}
                onClick={() => setNewKey(null)}
              >
                Fechar
              </button>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>
                <KeyRound size={18} />
                Nova chave
              </CardTitle>
            </CardHeader>
            <div className="p-5 pt-0">
              <div className="flex gap-3">
                <input
                  className="input-field flex-1"
                  placeholder="Descrição (ex: titlis-operator-prod)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') createMutation.mutate() }}
                />
                <ButtonDefault
                  label={createMutation.isPending ? 'Criando...' : 'Criar'}
                  icon={Plus}
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
                />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <KeyRound size={18} />
                Chaves ativas
              </CardTitle>
            </CardHeader>
            <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {(keys ?? []).length === 0 ? (
                <p className="px-5 py-6 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                  Nenhuma chave criada ainda.
                </p>
              ) : (keys ?? []).map((key) => (
                <div key={key.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                      {key.description ?? 'Sem descrição'}
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                      <span className="font-mono">{key.prefix}...</span>
                      {' · '}
                      Criada em {formatDate(key.createdAt)}
                      {key.lastUsedAt && ` · Último uso ${formatDate(key.lastUsedAt)}`}
                    </p>
                  </div>
                  {key.isActive ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Revogar a chave "${key.description ?? key.prefix}"? Esta ação não pode ser desfeita.`)) {
                          revokeMutation.mutate(key.id)
                        }
                      }}
                      disabled={revokeMutation.isPending}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors hover:border-red-300 hover:text-red-500"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}
                      title="Revogar chave"
                    >
                      <Trash2 size={15} />
                    </button>
                  ) : (
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626' }}>
                      Revogada
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>

        </div>
      </div>
    </div>
  )
}
