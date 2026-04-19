import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Bot, Check, Eye, EyeOff } from 'lucide-react'
import { ButtonDefault } from '@/components/jeitto/ButtonDefault'
import { Card } from '@/components/jeitto/Card'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { Header } from '@/components/layout/Header'
import { useAiConfig } from '@/hooks/useApi'
import { api } from '@/lib/api'

const PROVIDERS = ['openai', 'anthropic', 'gemini', 'mistral', 'cohere', 'azure', 'ollama']

export function SettingsAi() {
  const queryClient = useQueryClient()
  const { data: config, isLoading, error } = useAiConfig()

  const [provider, setProvider] = useState('')
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [githubToken, setGithubToken] = useState('')
  const [baseBranch, setBaseBranch] = useState('main')
  const [monthlyBudget, setMonthlyBudget] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [showGithubToken, setShowGithubToken] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [formInitialized, setFormInitialized] = useState(false)

  if (isLoading) return <><Header title="Configuração de IA" /><PageLoading /></>
  if (error) return <><Header title="Configuração de IA" /><PageError message="Não foi possível carregar a configuração." /></>

  if (config && !formInitialized) {
    setProvider(config.provider)
    setModel(config.model)
    setBaseBranch(config.githubBaseBranch)
    setMonthlyBudget(config.monthlyTokenBudget?.toString() ?? '')
    setFormInitialized(true)
  }

  const isValid = provider.trim() && model.trim() && apiKey.trim()

  const handleSave = async () => {
    if (!isValid) return
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      await api.aiConfig.upsert({
        provider: provider.trim(),
        model: model.trim(),
        apiKey: apiKey.trim(),
        githubToken: githubToken.trim() || undefined,
        githubBaseBranch: baseBranch.trim() || 'main',
        monthlyTokenBudget: monthlyBudget ? parseInt(monthlyBudget, 10) : null,
      })
      await queryClient.invalidateQueries({ queryKey: ['ai-config'] })
      setApiKey('')
      setGithubToken('')
      setSaved(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Configuração de IA" subtitle="Defina o provedor e credenciais para remediação automática e explicações" />

      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">
        {config && (
          <Card>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgba(16,185,129,0.1)' }}>
                <Bot size={16} style={{ color: '#10b981' }} />
              </div>
              <div>
                <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>
                  {config.provider} / {config.model}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                  API key {config.hasApiKey ? 'configurada' : 'não configurada'}
                  {config.hasGithubToken ? ' · GitHub token configurado' : ''}
                  {config.monthlyTokenBudget ? ` · ${config.tokensUsedMonth}/${config.monthlyTokenBudget} tokens este mês` : ''}
                </p>
              </div>
            </div>
          </Card>
        )}

        <Card>
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>Configurar provedor</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>Provedor *</label>
              <select
                value={provider}
                onChange={e => setProvider(e.target.value)}
                className="mt-2 w-full rounded-2xl px-4 py-3 text-sm outline-none"
                style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
              >
                <option value="">Selecione...</option>
                {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>Modelo *</label>
              <input
                type="text"
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="ex: gemini-2.5-flash"
                className="mt-2 w-full rounded-2xl px-4 py-3 text-sm outline-none"
                style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>API Key *</label>
              <div className="relative mt-2">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder={config?.hasApiKey ? '••••••••• (manter atual)' : 'Cole sua API key'}
                  className="w-full rounded-2xl px-4 py-3 pr-12 text-sm outline-none"
                  style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
                />
                <button type="button" onClick={() => setShowApiKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100">
                  {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>GitHub Token</label>
              <div className="relative mt-2">
                <input
                  type={showGithubToken ? 'text' : 'password'}
                  value={githubToken}
                  onChange={e => setGithubToken(e.target.value)}
                  placeholder={config?.hasGithubToken ? '••••••••• (manter atual)' : 'ghp_... (para abrir PRs)'}
                  className="w-full rounded-2xl px-4 py-3 pr-12 text-sm outline-none"
                  style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
                />
                <button type="button" onClick={() => setShowGithubToken(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100">
                  {showGithubToken ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>Branch base</label>
              <input
                type="text"
                value={baseBranch}
                onChange={e => setBaseBranch(e.target.value)}
                className="mt-2 w-full rounded-2xl px-4 py-3 text-sm outline-none"
                style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>Limite mensal de tokens</label>
              <input
                type="number"
                value={monthlyBudget}
                onChange={e => setMonthlyBudget(e.target.value)}
                placeholder="Deixe vazio para ilimitado"
                className="mt-2 w-full rounded-2xl px-4 py-3 text-sm outline-none"
                style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
              />
            </div>
          </div>

          {saveError && (
            <p className="mt-3 text-sm" style={{ color: '#dc2626' }}>{saveError}</p>
          )}

          <div className="mt-5 flex items-center gap-3">
            <ButtonDefault
              label={saving ? 'Salvando...' : 'Salvar configuração'}
              onClick={() => void handleSave()}
              disabled={!isValid || saving}
            />
            {saved && (
              <div className="flex items-center gap-1.5 text-sm" style={{ color: '#10b981' }}>
                <Check size={14} />
                Salvo com sucesso
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
