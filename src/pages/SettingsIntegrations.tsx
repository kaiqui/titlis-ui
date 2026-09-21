import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Bot, Check, CheckCircle, Cloud, Database, Eye, EyeOff, Github, Info, LineChart, ShieldCheck, XCircle } from 'lucide-react'
import { ButtonDefault } from '@/components/jeitto/ButtonDefault'
import { Card } from '@/components/jeitto/Card'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { Header } from '@/components/layout/Header'
import { useAiConfig } from '@/hooks/useApi'
import { WhenFeature } from '@/components/atoms/FeatureFlag'
import { api } from '@/lib/api'

type GithubAuthMode = 'pat' | 'github_app'

export function SettingsIntegrations() {
  const queryClient = useQueryClient()
  const { data: config, isLoading, error } = useAiConfig()
  const { data: ddSettings } = useQuery({
    queryKey: ['datadog-settings'],
    queryFn: api.datadogSettings.get,
    staleTime: 30_000,
  })
  const { data: costSettings } = useQuery({
    queryKey: ['cost-settings'],
    queryFn: api.costSettings.get,
    staleTime: 30_000,
  })
  const { data: veracodeSettings } = useQuery({
    queryKey: ['veracode-settings'],
    queryFn: api.veracodeSettings.get,
    staleTime: 30_000,
  })
  const { data: grafanaSettings } = useQuery({
    queryKey: ['grafana-settings'],
    queryFn: api.grafanaSettings.get,
    staleTime: 30_000,
  })
  const [costToggling, setCostToggling] = useState(false)
  const [costError, setCostError] = useState<string | null>(null)

  // Modelo de IA (provedor LLM + chave) — usado pelo assistente de confiabilidade (ConfiaAI).
  const [llmProvider, setLlmProvider] = useState('')
  const [llmModel, setLlmModel] = useState('')
  const [llmApiKey, setLlmApiKey] = useState('')
  const [showLlmApiKey, setShowLlmApiKey] = useState(false)
  const [llmBudget, setLlmBudget] = useState('')
  const [llmSaving, setLlmSaving] = useState(false)
  const [llmError, setLlmError] = useState<string | null>(null)
  const [llmSaved, setLlmSaved] = useState(false)

  async function handleToggleCost() {
    setCostError(null)
    const enabling = !costSettings?.enabled
    if (enabling && !window.confirm(
      'Ativar a estimativa de custo pode gerar cobrança adicional na sua fatura Titlis, dependendo do seu plano. Deseja continuar?',
    )) {
      return
    }
    setCostToggling(true)
    try {
      await (enabling ? api.costSettings.enable() : api.costSettings.disable())
      await queryClient.invalidateQueries({ queryKey: ['cost-settings'] })
    } catch (cause) {
      setCostError(cause instanceof Error ? cause.message : 'Não foi possível alterar a configuração.')
    } finally {
      setCostToggling(false)
    }
  }

  // GitHub — modo de auth
  const [githubAuthMode, setGithubAuthMode] = useState<GithubAuthMode>('pat')
  const [githubBranch, setGithubBranch] = useState('main')

  // PAT
  const [githubToken, setGithubToken] = useState('')
  const [showGithubToken, setShowGithubToken] = useState(false)

  // GitHub App
  const [githubAppId, setGithubAppId] = useState('')
  const [githubAppPrivateKey, setGithubAppPrivateKey] = useState('')
  const [githubAppInstallationId, setGithubAppInstallationId] = useState('')
  const [showGithubPrivKey, setShowGithubPrivKey] = useState(false)

  const [githubSaving, setGithubSaving] = useState(false)
  const [githubError, setGithubError] = useState<string | null>(null)
  const [githubSaved, setGithubSaved] = useState(false)
  const [githubTesting, setGithubTesting] = useState(false)
  const [githubTestResult, setGithubTestResult] = useState<{ ok: boolean; message: string; mode?: string } | null>(null)

  // Datadog
  const [ddApiKey, setDdApiKey] = useState('')
  const [ddAppKey, setDdAppKey] = useState('')
  const [ddSite, setDdSite] = useState('datadoghq.com')
  const [queueEnabled, setQueueEnabled] = useState(false)
  const [monitorCreationEnabled, setMonitorCreationEnabled] = useState(false)
  const [showDdApiKey, setShowDdApiKey] = useState(false)
  const [showDdAppKey, setShowDdAppKey] = useState(false)
  const [ddSaving, setDdSaving] = useState(false)
  const [ddError, setDdError] = useState<string | null>(null)
  const [ddSaved, setDdSaved] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [testing, setTesting] = useState(false)

  // Veracode
  const [veracodeApiId, setVeracodeApiId] = useState('')
  const [veracodeApiKey, setVeracodeApiKey] = useState('')
  const [showVeracodeApiKey, setShowVeracodeApiKey] = useState(false)
  const [veracodeSaving, setVeracodeSaving] = useState(false)
  const [veracodeError, setVeracodeError] = useState<string | null>(null)
  const [veracodeSaved, setVeracodeSaved] = useState(false)

  // Grafana MCP (docs/todo/lookout-chat-plan.md §2.4) — o ConfiaAI/Argus consulta via sessão MCP
  // quando configurado, mesmo padrão do Datadog.
  const [grafanaMcpUrl, setGrafanaMcpUrl] = useState('')
  const [grafanaApiKey, setGrafanaApiKey] = useState('')
  const [showGrafanaApiKey, setShowGrafanaApiKey] = useState(false)
  const [grafanaSaving, setGrafanaSaving] = useState(false)
  const [grafanaError, setGrafanaError] = useState<string | null>(null)
  const [grafanaSaved, setGrafanaSaved] = useState(false)

  useEffect(() => {
    if (config) {
      setGithubBranch(config.githubBaseBranch ?? 'main')
      setGithubAuthMode((config.githubAuthMode as GithubAuthMode) ?? 'pat')
      setLlmProvider(config.provider ?? '')
      setLlmModel(config.model ?? '')
      setLlmBudget(config.monthlyTokenBudget != null ? String(config.monthlyTokenBudget) : '')
    }
  }, [config])

  useEffect(() => {
    if (ddSettings) {
      setQueueEnabled(ddSettings.queueMonitoringEnabled)
      setMonitorCreationEnabled(ddSettings.monitorCreationEnabled)
      if (ddSettings.site) setDdSite(ddSettings.site)
    }
  }, [ddSettings])

  if (isLoading) return <><Header title="Integrações" /><PageLoading /></>
  if (error) return <><Header title="Integrações" /><PageError message="Não foi possível carregar a configuração." /></>

  const githubConfigured = config?.hasGithubToken || config?.hasGithubApp
  const modeLabel = (m?: string) => (m === 'github_app' ? 'GitHub App' : 'Personal Access Token')
  // Modo realmente em uso pela remediação = o que está salvo (config). A aba selecionada só passa
  // a valer depois de Salvar — divergência aqui é a causa do "token salvo mas never used".
  const activeMode = config?.githubAuthMode ?? 'pat'
  const modeDiverges = githubConfigured && githubAuthMode !== activeMode

  const LLM_PROVIDERS = ['openai', 'anthropic', 'google', 'gemini', 'mistral', 'cohere', 'azure', 'ollama']
  const llmConfigured = config?.hasApiKey ?? false
  const llmValid =
    llmProvider.trim() !== '' && llmModel.trim() !== '' && (llmApiKey.trim() !== '' || llmConfigured)

  const handleLlmSave = async () => {
    if (!llmValid) return
    setLlmSaving(true)
    setLlmError(null)
    setLlmSaved(false)
    try {
      await api.aiConfig.upsert({
        provider: llmProvider.trim(),
        model: llmModel.trim(),
        ...(llmApiKey.trim() ? { apiKey: llmApiKey.trim() } : {}),
        monthlyTokenBudget: llmBudget.trim() ? parseInt(llmBudget.trim(), 10) : null,
      })
      await queryClient.invalidateQueries({ queryKey: ['ai-config'] })
      setLlmApiKey('')
      setLlmSaved(true)
    } catch (err) {
      setLlmError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setLlmSaving(false)
    }
  }

  const handleGithubTest = async () => {
    setGithubTesting(true)
    setGithubTestResult(null)
    try {
      const result = await api.aiConfig.testGithub()
      setGithubTestResult({ ok: result.ok, message: result.message, mode: result.mode })
    } catch {
      setGithubTestResult({ ok: false, message: 'Erro ao testar conexão.' })
    } finally {
      setGithubTesting(false)
    }
  }

  const handleGithubSave = async () => {
    setGithubSaving(true)
    setGithubError(null)
    setGithubSaved(false)
    setGithubTestResult(null)
    try {
      const payload: Parameters<typeof api.aiConfig.upsert>[0] = {
        githubBaseBranch: githubBranch.trim() || 'main',
        githubAuthMode,
      }
      if (githubAuthMode === 'pat') {
        if (githubToken.trim()) payload.githubToken = githubToken.trim()
      } else {
        if (githubAppId.trim()) payload.githubAppId = githubAppId.trim()
        if (githubAppPrivateKey.trim()) payload.githubAppPrivateKey = githubAppPrivateKey.trim()
        if (githubAppInstallationId.trim()) payload.githubAppInstallationId = githubAppInstallationId.trim()
      }
      await api.aiConfig.upsert(payload)
      await queryClient.invalidateQueries({ queryKey: ['ai-config'] })
      setGithubToken('')
      setGithubAppPrivateKey('')
      setGithubSaved(true)
    } catch (err) {
      setGithubError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setGithubSaving(false)
    }
  }

  const handleDatadogSave = async () => {
    setDdSaving(true)
    setDdError(null)
    setDdSaved(false)
    setTestResult(null)
    try {
      await api.datadogSettings.save({
        ...(ddApiKey.trim() ? { ddApiKey: ddApiKey.trim() } : {}),
        ...(ddAppKey.trim() ? { ddAppKey: ddAppKey.trim() } : {}),
        ...(ddSite ? { ddSite: ddSite } : {}),
        queueMonitoringEnabled: queueEnabled,
        monitorCreationEnabled,
      })
      await queryClient.invalidateQueries({ queryKey: ['datadog-settings'] })
      setDdApiKey('')
      setDdAppKey('')
      setDdSaved(true)
    } catch (err) {
      setDdError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setDdSaving(false)
    }
  }

  const handleVeracodeSave = async () => {
    setVeracodeSaving(true)
    setVeracodeError(null)
    setVeracodeSaved(false)
    try {
      await api.veracodeSettings.save({
        ...(veracodeApiId.trim() ? { veracodeApiId: veracodeApiId.trim() } : {}),
        ...(veracodeApiKey.trim() ? { veracodeApiKey: veracodeApiKey.trim() } : {}),
      })
      await queryClient.invalidateQueries({ queryKey: ['veracode-settings'] })
      setVeracodeApiId('')
      setVeracodeApiKey('')
      setVeracodeSaved(true)
    } catch (err) {
      setVeracodeError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setVeracodeSaving(false)
    }
  }

  const handleGrafanaSave = async () => {
    setGrafanaSaving(true)
    setGrafanaError(null)
    setGrafanaSaved(false)
    try {
      await api.grafanaSettings.save({
        ...(grafanaMcpUrl.trim() ? { grafanaMcpUrl: grafanaMcpUrl.trim() } : {}),
        ...(grafanaApiKey.trim() ? { grafanaApiKey: grafanaApiKey.trim() } : {}),
      })
      await queryClient.invalidateQueries({ queryKey: ['grafana-settings'] })
      setGrafanaMcpUrl('')
      setGrafanaApiKey('')
      setGrafanaSaved(true)
    } catch (err) {
      setGrafanaError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setGrafanaSaving(false)
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await api.datadogSettings.test()
      setTestResult(result)
      await queryClient.invalidateQueries({ queryKey: ['datadog-settings'] })
    } catch (err) {
      setTestResult({ ok: false, message: err instanceof Error ? err.message : 'Erro ao testar conexão.' })
    } finally {
      setTesting(false)
    }
  }

  const githubSaveDisabled = githubSaving || (() => {
    const branchUnchanged = githubBranch === (config?.githubBaseBranch ?? 'main')
    const modeUnchanged = githubAuthMode === (config?.githubAuthMode ?? 'pat')
    if (githubAuthMode === 'pat') return !githubToken.trim() && branchUnchanged && modeUnchanged
    return !githubAppId.trim() && !githubAppPrivateKey.trim() && branchUnchanged && modeUnchanged
  })()

  const ddQueueFlagChanged = queueEnabled !== (ddSettings?.queueMonitoringEnabled ?? false)
  const ddMonitorFlagChanged = monitorCreationEnabled !== (ddSettings?.monitorCreationEnabled ?? false)
  const ddSaveEnabled = !ddSaving && (!!ddApiKey.trim() || ddQueueFlagChanged || ddMonitorFlagChanged)

  const inputCls = 'mt-2 w-full rounded-2xl px-4 py-3 text-sm outline-none'
  const inputStyle = { backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }
  const tabBase = 'flex-1 rounded-xl py-2 text-xs font-semibold transition-colors'
  const tabActive = { backgroundColor: 'var(--color-foreground)', color: 'var(--color-background)' }
  const tabInactive = { backgroundColor: 'transparent', color: 'var(--color-muted-foreground)', border: '1px solid var(--color-border)' }

  const queuesByState = ddSettings?.queuesByState
  const hasQueueData = queuesByState && (queuesByState.discovering + queuesByState.learning + queuesByState.monitoring) > 0

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title="Integrações"
        subtitle="Modelo de IA, GitHub, Datadog e Veracode usados pelo assistente, pela descoberta de serviços e pelo scoring."
      />

      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">

        {/* Modelo de IA */}
        <WhenFeature feature="ai">
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--color-primary-soft)' }}>
              <Bot size={15} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--color-foreground)' }}>Modelo de IA</p>
              <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                {config?.isActive && llmConfigured
                  ? `${config.provider} / ${config.model} — chave configurada`
                  : 'Provedor e chave não configurados'}
              </p>
            </div>
            {config?.isActive && llmConfigured && (
              <span className="ml-auto rounded-[8px] px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#0e8a44' }}>
                Ativo
              </span>
            )}
          </div>

          <p className="mb-5 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            Provedor e modelo de linguagem que o assistente de confiabilidade (ConfiaAI) usa para narrar
            relatórios, explicar findings e investigar regressões. A chave é armazenada criptografada e
            nunca é exibida de volta.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
                Provedor *
              </label>
              <select value={llmProvider} onChange={e => setLlmProvider(e.target.value)} className={inputCls} style={inputStyle}>
                <option value="">Selecione…</option>
                {LLM_PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
                Modelo *
              </label>
              <input
                type="text"
                value={llmModel}
                onChange={e => setLlmModel(e.target.value)}
                placeholder="ex: gemini-2.5-flash, gpt-4o, claude-sonnet-4"
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
                API Key {llmConfigured ? '' : '*'}
              </label>
              <div className="relative mt-2">
                <input
                  type={showLlmApiKey ? 'text' : 'password'}
                  value={llmApiKey}
                  onChange={e => setLlmApiKey(e.target.value)}
                  placeholder={llmConfigured ? '••••••••• (deixe vazio para manter a atual)' : 'Cole sua API key'}
                  className="w-full rounded-2xl px-4 py-3 pr-12 text-sm outline-none"
                  style={inputStyle}
                />
                <button type="button" onClick={() => setShowLlmApiKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100">
                  {showLlmApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
                Limite mensal de tokens
              </label>
              <input
                type="number"
                value={llmBudget}
                onChange={e => setLlmBudget(e.target.value)}
                placeholder="Vazio = ilimitado"
                className={inputCls}
                style={inputStyle}
              />
            </div>
          </div>

          {config?.monthlyTokenBudget != null && (
            <p className="mt-3 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              Uso este mês: {config.tokensUsedMonth.toLocaleString('pt-BR')} / {config.monthlyTokenBudget.toLocaleString('pt-BR')} tokens
            </p>
          )}
          {llmError && <p className="mt-3 text-sm" style={{ color: '#d8341a' }}>{llmError}</p>}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <ButtonDefault
              label={llmSaving ? 'Salvando...' : 'Salvar modelo de IA'}
              onClick={() => void handleLlmSave()}
              disabled={!llmValid || llmSaving}
            />
            {llmSaved && (
              <div className="flex items-center gap-1.5 text-sm" style={{ color: '#12a150' }}>
                <Check size={14} />
                Salvo com sucesso
              </div>
            )}
          </div>
        </Card>
        </WhenFeature>

        {/* GitHub */}
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(0,0,0,0.06)' }}>
              <Github size={15} style={{ color: 'var(--color-foreground)' }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--color-foreground)' }}>GitHub</p>
              <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                {githubConfigured
                  ? config?.githubAuthMode === 'github_app' ? 'GitHub App configurado' : 'Token configurado'
                  : 'Não configurado'}
              </p>
            </div>
            {githubConfigured && (
              <span className="ml-auto rounded-[8px] px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#0e8a44' }}>
                Ativo
              </span>
            )}
          </div>

          {/* Seletor de modo */}
          <div className="mb-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
              Modo de autenticação
            </p>
            <div className="flex gap-2 rounded-2xl p-1" style={{ backgroundColor: 'var(--color-muted)' }}>
              <button
                type="button"
                className={tabBase}
                style={githubAuthMode === 'pat' ? tabActive : tabInactive}
                onClick={() => setGithubAuthMode('pat')}
              >
                Personal Access Token
              </button>
              <button
                type="button"
                className={tabBase}
                style={githubAuthMode === 'github_app' ? tabActive : tabInactive}
                onClick={() => setGithubAuthMode('github_app')}
              >
                GitHub App
              </button>
            </div>
          </div>

          {modeDiverges && (
            <div className="jc-alert jc-alert-warning mb-5 flex items-start gap-2">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>
                O modo em uso pela remediação agora é <strong>{modeLabel(activeMode)}</strong>. O que você
                preencher na aba <strong>{modeLabel(githubAuthMode)}</strong> só passa a valer — e a credencial
                só é usada — depois de <strong>Salvar GitHub</strong>.
              </span>
            </div>
          )}

          {githubAuthMode === 'pat' ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
                  Personal Access Token (PAT)
                </label>
                <div className="relative mt-2">
                  <input
                    type={showGithubToken ? 'text' : 'password'}
                    value={githubToken}
                    onChange={e => setGithubToken(e.target.value)}
                    placeholder={config?.hasGithubToken ? '••••••••• (deixe vazio para manter o atual)' : 'ghp_...'}
                    className="w-full rounded-2xl px-4 py-3 pr-12 text-sm outline-none"
                    style={inputStyle}
                  />
                  <button type="button" onClick={() => setShowGithubToken(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100">
                    {showGithubToken ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
                  Branch base dos PRs
                </label>
                <input
                  type="text"
                  value={githubBranch}
                  onChange={e => setGithubBranch(e.target.value)}
                  placeholder="main"
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
              <div className="jc-alert jc-alert-accent md:col-span-2 flex items-start gap-2">
                <Info size={13} className="mt-0.5 shrink-0" />
                <span>
                  Para acessar repositórios <strong>privados</strong>, o PAT precisa dos scopes{' '}
                  <code className="rounded px-1 py-0.5 font-mono" style={{ backgroundColor: 'rgba(0,0,0,0.08)' }}>repo</code>{' '}
                  e{' '}
                  <code className="rounded px-1 py-0.5 font-mono" style={{ backgroundColor: 'rgba(0,0,0,0.08)' }}>read:org</code>.
                  Repositórios públicos funcionam com{' '}
                  <code className="rounded px-1 py-0.5 font-mono" style={{ backgroundColor: 'rgba(0,0,0,0.08)' }}>public_repo</code>.
                </span>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
                  App ID *
                </label>
                <input
                  type="text"
                  value={githubAppId}
                  onChange={e => setGithubAppId(e.target.value)}
                  placeholder={config?.hasGithubApp ? '••• (deixe vazio para manter)' : 'Ex: 123456'}
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
                  Installation ID <span style={{ color: '#c42bae', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional — descoberto automaticamente)</span>
                </label>
                <input
                  type="text"
                  value={githubAppInstallationId}
                  onChange={e => setGithubAppInstallationId(e.target.value)}
                  placeholder={config?.hasGithubApp ? '••• (deixe vazio para manter)' : 'Auto-detectado via API do GitHub'}
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
                  Chave privada PEM *
                </label>
                <div className="relative mt-2">
                  <textarea
                    value={githubAppPrivateKey}
                    onChange={e => setGithubAppPrivateKey(e.target.value)}
                    placeholder={config?.hasGithubApp ? '••••••••• (deixe vazio para manter)' : '-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----'}
                    rows={showGithubPrivKey ? 8 : 3}
                    className="w-full rounded-2xl px-4 py-3 pr-12 font-mono text-xs outline-none resize-none"
                    style={inputStyle}
                  />
                  <button type="button" onClick={() => setShowGithubPrivKey(v => !v)} className="absolute right-3 top-3 opacity-60 hover:opacity-100">
                    {showGithubPrivKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
                  Branch base dos PRs
                </label>
                <input
                  type="text"
                  value={githubBranch}
                  onChange={e => setGithubBranch(e.target.value)}
                  placeholder="main"
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
            </div>
          )}

          {githubTestResult && (
            <div className={`mt-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${githubTestResult.ok ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]' : 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]'}`}>
              {githubTestResult.ok ? <CheckCircle size={15} /> : <XCircle size={15} />}
              {githubTestResult.mode && (
                <span className="rounded-[8px] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide" style={{ backgroundColor: 'rgba(0,0,0,0.18)' }}>
                  {modeLabel(githubTestResult.mode)}
                </span>
              )}
              {githubTestResult.message}
            </div>
          )}

          {githubError && <p className="mt-3 text-sm" style={{ color: '#d8341a' }}>{githubError}</p>}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <ButtonDefault
              label={githubSaving ? 'Salvando...' : 'Salvar GitHub'}
              onClick={() => void handleGithubSave()}
              disabled={githubSaveDisabled}
            />
            {githubConfigured && (
              <button
                type="button"
                onClick={() => void handleGithubTest()}
                disabled={githubTesting}
                className="inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-opacity disabled:opacity-50"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
              >
                {githubTesting ? 'Testando…' : 'Testar Conexão'}
              </button>
            )}
            {githubSaved && (
              <div className="flex items-center gap-1.5 text-sm" style={{ color: '#12a150' }}>
                <Check size={14} />
                Salvo com sucesso
              </div>
            )}
          </div>
        </Card>

        {/* Datadog */}
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(99,38,194,0.08)' }}>
              <Database size={15} style={{ color: '#9c1f8c' }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--color-foreground)' }}>Datadog</p>
              <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                {ddSettings?.configured ? 'Credenciais configuradas' : 'Credenciais não configuradas'}
              </p>
            </div>
            {ddSettings?.configured && (
              <span className="ml-auto rounded-[8px] px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#0e8a44' }}>
                Ativo
              </span>
            )}
          </div>

          <p className="mb-5 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            Usado pela coleta de métricas (descoberta de serviços e custos) via API Datadog. As credenciais são
            armazenadas de forma criptografada e nunca expostas na UI.
          </p>

          {/* Credenciais */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
                DD API Key *
              </label>
              <div className="relative mt-2">
                <input
                  type={showDdApiKey ? 'text' : 'password'}
                  value={ddApiKey}
                  onChange={e => setDdApiKey(e.target.value)}
                  placeholder={ddSettings?.configured ? '•••••••••' : 'Cole sua DD API Key'}
                  className="w-full rounded-2xl px-4 py-3 pr-12 text-sm outline-none"
                  style={inputStyle}
                />
                <button type="button" onClick={() => setShowDdApiKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100">
                  {showDdApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
                DD Application Key (opcional)
              </label>
              <div className="relative mt-2">
                <input
                  type={showDdAppKey ? 'text' : 'password'}
                  value={ddAppKey}
                  onChange={e => setDdAppKey(e.target.value)}
                  placeholder={ddSettings?.configured ? '•••••••••' : 'Cole sua DD Application Key'}
                  className="w-full rounded-2xl px-4 py-3 pr-12 text-sm outline-none"
                  style={inputStyle}
                />
                <button type="button" onClick={() => setShowDdAppKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100">
                  {showDdAppKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
                Site do Datadog *
              </label>
              <select
                value={ddSite}
                onChange={e => setDdSite(e.target.value)}
                className="mt-2 w-full rounded-2xl px-4 py-3 text-sm outline-none"
                style={inputStyle}
              >
                <option value="datadoghq.com">US1 — datadoghq.com</option>
                <option value="us3.datadoghq.com">US3 — us3.datadoghq.com</option>
                <option value="us5.datadoghq.com">US5 — us5.datadoghq.com</option>
                <option value="datadoghq.eu">EU — datadoghq.eu</option>
                <option value="ap1.datadoghq.com">AP1 — ap1.datadoghq.com</option>
              </select>
            </div>
          </div>

          {/* Análise de filas */}
          <div className="mt-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
              Análise de filas
            </p>

            {/* Toggle 1: habilitar coleta */}
            <div
              className="flex items-start gap-3 rounded-2xl px-4 py-4"
              style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)' }}
            >
              <input
                id="queue-enabled"
                type="checkbox"
                checked={queueEnabled}
                onChange={e => {
                  setQueueEnabled(e.target.checked)
                  if (!e.target.checked) setMonitorCreationEnabled(false)
                }}
                className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[var(--color-primary)]"
              />
              <label htmlFor="queue-enabled" className="cursor-pointer">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                  Habilitar coleta e aprendizado de filas
                </p>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                  O sistema começa em <strong>modo de aprendizado</strong> — observa volumetria, avalia regras de
                  conformidade e exibe scores e findings imediatamente. Nenhum monitor é criado no Datadog
                  enquanto esta opção estiver ativa sem a opção abaixo.
                </p>
              </label>
            </div>

            {/* Toggle 2: criar monitores */}
            {queueEnabled && (
              <div
                className="flex items-start gap-3 rounded-2xl px-4 py-4"
                style={{ backgroundColor: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)' }}
              >
                <input
                  id="monitor-creation-enabled"
                  type="checkbox"
                  checked={monitorCreationEnabled}
                  onChange={e => setMonitorCreationEnabled(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[var(--color-primary)]"
                />
                <label htmlFor="monitor-creation-enabled" className="cursor-pointer">
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                    Criar monitores no Datadog após aprendizado
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                    Depois que os ciclos de aprendizado forem concluídos, o sistema promove automaticamente
                    as filas para modo ativo e cria os monitores de backlog, idade e DLQ no Datadog.
                    Ative somente após revisar os scores e thresholds sugeridos.
                  </p>
                </label>
              </div>
            )}

            {/* Distribuição por estado */}
            {ddSettings?.configured && hasQueueData && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Descoberta', value: queuesByState!.discovering, color: 'rgba(99,102,241,0.12)', text: '#c42bae' },
                  { label: 'Aprendendo', value: queuesByState!.learning, color: 'rgba(245,158,11,0.12)', text: '#a06e00' },
                  { label: 'Monitorando', value: queuesByState!.monitoring, color: 'rgba(16,185,129,0.12)', text: '#0e8a44' },
                ].map(({ label, value, color, text }) => (
                  <div key={label} className="rounded-2xl px-3 py-2.5 text-center" style={{ backgroundColor: color }}>
                    <p className="text-lg font-bold" style={{ color: text }}>{value}</p>
                    <p className="text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>{label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Feedback de conexão */}
          {testResult && (
            <div className={`jc-alert mt-4 flex items-center gap-2 ${testResult.ok ? 'jc-alert-success' : 'jc-alert-danger'}`}>
              {testResult.ok ? <CheckCircle size={15} /> : <XCircle size={15} />}
              {testResult.message}
            </div>
          )}

          {ddError && <p className="mt-3 text-sm" style={{ color: '#d8341a' }}>{ddError}</p>}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <ButtonDefault
              label={ddSaving ? 'Salvando...' : 'Salvar Datadog'}
              onClick={() => void handleDatadogSave()}
              disabled={!ddSaveEnabled}
            />
            {ddSettings?.configured && (
              <button
                type="button"
                onClick={() => void handleTestConnection()}
                disabled={testing}
                className="inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-opacity disabled:opacity-50"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
              >
                {testing ? 'Testando…' : 'Testar Conexão'}
              </button>
            )}
            {ddSaved && (
              <div className="flex items-center gap-1.5 text-sm" style={{ color: '#12a150' }}>
                <Check size={14} />
                Salvo com sucesso
              </div>
            )}
          </div>
        </Card>

        {/* Veracode */}
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(37,99,235,0.08)' }}>
              <ShieldCheck size={15} style={{ color: '#0784b0' }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--color-foreground)' }}>Veracode</p>
              <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                {veracodeSettings?.hasApiId && veracodeSettings?.hasApiKey ? 'Credenciais configuradas' : 'Credenciais não configuradas'}
              </p>
            </div>
            {veracodeSettings?.hasApiId && veracodeSettings?.hasApiKey && (
              <span className="ml-auto rounded-[8px] px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#0e8a44' }}>
                Ativo
              </span>
            )}
          </div>

          <p className="mb-5 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            Amplia o pilar de Segurança com achados de SAST, SCA e DAST do Veracode (regras SEC-007 a
            SEC-010). O titlis-servicemap descobre suas aplicações Veracode e correlaciona com os serviços por
            nome ou repositório — a cobertura se adapta automaticamente aos produtos que sua conta
            Veracode tem habilitados (só SAST, só SCA, os três, etc.).
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
                API ID *
              </label>
              <input
                type="text"
                value={veracodeApiId}
                onChange={e => setVeracodeApiId(e.target.value)}
                placeholder={veracodeSettings?.hasApiId ? '••••••••• (deixe vazio para manter)' : 'Cole seu Veracode API ID'}
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
                API Key *
              </label>
              <div className="relative mt-2">
                <input
                  type={showVeracodeApiKey ? 'text' : 'password'}
                  value={veracodeApiKey}
                  onChange={e => setVeracodeApiKey(e.target.value)}
                  placeholder={veracodeSettings?.hasApiKey ? '••••••••• (deixe vazio para manter)' : 'Cole seu Veracode API Key'}
                  className="w-full rounded-2xl px-4 py-3 pr-12 text-sm outline-none"
                  style={inputStyle}
                />
                <button type="button" onClick={() => setShowVeracodeApiKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100">
                  {showVeracodeApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>

          {veracodeError && <p className="mt-3 text-sm" style={{ color: '#d8341a' }}>{veracodeError}</p>}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <ButtonDefault
              label={veracodeSaving ? 'Salvando...' : 'Salvar Veracode'}
              onClick={() => void handleVeracodeSave()}
              disabled={veracodeSaving || (!veracodeApiId.trim() && !veracodeApiKey.trim())}
            />
            {veracodeSaved && (
              <div className="flex items-center gap-1.5 text-sm" style={{ color: '#12a150' }}>
                <Check size={14} />
                Salvo com sucesso
              </div>
            )}
          </div>
        </Card>

        {/* Grafana MCP */}
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(37,99,235,0.08)' }}>
              <LineChart size={15} style={{ color: '#0784b0' }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--color-foreground)' }}>Grafana (MCP)</p>
              <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                {grafanaSettings?.hasMcpUrl && grafanaSettings?.hasApiKey ? 'Credenciais configuradas' : 'Opcional — credenciais não configuradas'}
              </p>
            </div>
            {grafanaSettings?.hasMcpUrl && grafanaSettings?.hasApiKey && (
              <span className="ml-auto rounded-[8px] px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#0e8a44' }}>
                Ativo
              </span>
            )}
          </div>

          <p className="mb-5 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            Dá ao ConfiaAI acesso de leitura ao seu Grafana via MCP (self-hosted mcp-grafana em modo HTTP, ou
            equivalente hospedado) — informe a URL completa do seu servidor MCP, não a URL do Grafana em si.
            Sem isso, o ConfiaAI segue respondendo normalmente só sem essa fonte.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
                URL do servidor MCP *
              </label>
              <input
                type="text"
                value={grafanaMcpUrl}
                onChange={e => setGrafanaMcpUrl(e.target.value)}
                placeholder={grafanaSettings?.hasMcpUrl ? '••••••••• (deixe vazio para manter)' : 'https://grafana.suaempresa.com/mcp'}
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
                API Key *
              </label>
              <div className="relative mt-2">
                <input
                  type={showGrafanaApiKey ? 'text' : 'password'}
                  value={grafanaApiKey}
                  onChange={e => setGrafanaApiKey(e.target.value)}
                  placeholder={grafanaSettings?.hasApiKey ? '••••••••• (deixe vazio para manter)' : 'Cole sua Grafana API Key'}
                  className="w-full rounded-2xl px-4 py-3 pr-12 text-sm outline-none"
                  style={inputStyle}
                />
                <button type="button" onClick={() => setShowGrafanaApiKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100">
                  {showGrafanaApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>

          {grafanaError && <p className="mt-3 text-sm" style={{ color: '#d8341a' }}>{grafanaError}</p>}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <ButtonDefault
              label={grafanaSaving ? 'Salvando...' : 'Salvar Grafana'}
              onClick={() => void handleGrafanaSave()}
              disabled={grafanaSaving || (!grafanaMcpUrl.trim() && !grafanaApiKey.trim())}
            />
            {grafanaSaved && (
              <div className="flex items-center gap-1.5 text-sm" style={{ color: '#12a150' }}>
                <Check size={14} />
                Salvo com sucesso
              </div>
            )}
          </div>
        </Card>

        {/* Estimativa de custo — opt-in explícito: quando ativo, estima via preço público de
            cloud × uso de CPU/mem observado pelas métricas do Datadog (estilo CastAI, sem billing
            export). Hoje só clusters GCP são precificados (detecção por Node.Spec.ProviderID);
            AWS/Azure ficam de fora do total até termos tabela de preço pra eles. Nunca liga
            sozinho: pode gerar cobrança adicional na fatura Titlis. */}
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--color-primary-soft)' }}>
              <Cloud size={15} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold" style={{ color: 'var(--color-foreground)' }}>Estimativa de Custo</p>
              <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                {costSettings?.enabled
                  ? `Estimado via preço público × uso observado${costSettings.enabledByEmail ? ` — ativado por ${costSettings.enabledByEmail}` : ''}. Hoje cobre clusters GCP; AWS e Azure em breve.`
                  : 'Estima custo por workload via preço público × uso observado (hoje cobre clusters GCP; AWS e Azure em breve) — pode gerar cobrança adicional na sua fatura Titlis.'}
              </p>
            </div>
            {costSettings?.enabled && (
              <span className="rounded-[8px] px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#12a150' }}>
                Ativo
              </span>
            )}
            <ButtonDefault
              label={costToggling ? 'Aguarde...' : costSettings?.enabled ? 'Desativar' : 'Ativar'}
              visual={costSettings?.enabled ? 'secondary' : 'primary'}
              onClick={() => void handleToggleCost()}
              disabled={costToggling}
            />
          </div>
          {costError && <p className="mt-3 text-sm" style={{ color: '#d8341a' }}>{costError}</p>}
        </Card>

      </div>
    </div>
  )
}
