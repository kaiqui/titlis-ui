import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Bot, Check, Eye, EyeOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ButtonDefault } from '@/components/jeitto/ButtonDefault'
import { Card } from '@/components/jeitto/Card'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { Header } from '@/components/layout/Header'
import { useAiConfig } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { fadeInUp } from '@/lib/motion/tokens'

const PROVIDERS = ['openai', 'anthropic', 'gemini', 'mistral', 'cohere', 'azure', 'ollama']

export function SettingsAi() {
  const queryClient = useQueryClient()
  const { data: config, isLoading, error } = useAiConfig()

  const [provider, setProvider] = useState('')
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [monthlyBudget, setMonthlyBudget] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (config) {
      setProvider(config.provider)
      setModel(config.model)
      setMonthlyBudget(config.monthlyTokenBudget?.toString() ?? '')
    }
  }, [config])

  if (isLoading) return <><Header title="Configuração do ARIA" /><PageLoading /></>
  if (error) return <><Header title="Configuração do ARIA" /><PageError message="Não foi possível carregar a configuração." /></>

  const isValid = provider.trim() && model.trim() && (apiKey.trim() || config?.hasApiKey)

  const handleSave = async () => {
    if (!isValid) return
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      await api.aiConfig.upsert({
        provider: provider.trim(),
        model: model.trim(),
        apiKey: apiKey.trim() || undefined,
        githubBaseBranch: config?.githubBaseBranch ?? 'main',
        monthlyTokenBudget: monthlyBudget ? parseInt(monthlyBudget, 10) : null,
      })
      await queryClient.invalidateQueries({ queryKey: ['ai-config'] })
      setApiKey('')
      setSaved(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'mt-2 w-full rounded-2xl px-4 py-3 text-sm outline-none'
  const inputStyle = { backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Configuração do ARIA" subtitle="Provedor e modelo de linguagem usados pelo ARIA para análise e explicações" />

      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">

        {config?.isActive && (
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
                  {config.monthlyTokenBudget
                    ? ` · ${config.tokensUsedMonth}/${config.monthlyTokenBudget} tokens este mês`
                    : ''}
                </p>
              </div>
            </div>
          </Card>
        )}

        <Card>
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
            Provedor de IA
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
                Provedor *
              </label>
              <select
                value={provider}
                onChange={e => setProvider(e.target.value)}
                className={inputCls}
                style={inputStyle}
              >
                <option value="">Selecione...</option>
                {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
                Modelo *
              </label>
              <input
                type="text"
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="ex: gemini-2.5-flash"
                className={inputCls}
                style={inputStyle}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
                API Key {config?.hasApiKey ? '' : '*'}
              </label>
              <div className="relative mt-2">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder={config?.hasApiKey ? '••••••••• (deixe vazio para manter a atual)' : 'Cole sua API key'}
                  className="w-full rounded-2xl px-4 py-3 pr-12 text-sm outline-none"
                  style={inputStyle}
                />
                <button type="button" onClick={() => setShowApiKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100">
                  {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
                Limite mensal de tokens
              </label>
              <input
                type="number"
                value={monthlyBudget}
                onChange={e => setMonthlyBudget(e.target.value)}
                placeholder="Deixe vazio para ilimitado"
                className={inputCls}
                style={inputStyle}
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
            <AnimatePresence>
            {saved && (
              <motion.div {...fadeInUp} className="flex items-center gap-1.5 text-sm" style={{ color: '#10b981' }}>
                <Check size={14} />
                Salvo com sucesso
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </Card>

        {/* link para Integrações */}
        <Link
          to="/settings/integrations"
          className="flex items-center justify-between rounded-2xl border px-4 py-3 transition-colors hover:opacity-80"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
              GitHub e Datadog
            </p>
            <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              Token GitHub para PRs de remediação · Credenciais Datadog para análise de incidentes
            </p>
          </div>
          <ArrowRight size={16} style={{ color: 'var(--color-muted-foreground)' }} />
        </Link>

      </div>
    </div>
  )
}
