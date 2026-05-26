import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Check, Database, Eye, EyeOff, Github, Info } from 'lucide-react'
import { ButtonDefault } from '@/components/jeitto/ButtonDefault'
import { Card } from '@/components/jeitto/Card'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { Header } from '@/components/layout/Header'
import { useAiConfig } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'

type GithubAuthMode = 'pat' | 'github_app'

export function SettingsIntegrations() {
  const queryClient = useQueryClient()
  const { data: config, isLoading, error } = useAiConfig()
  const { data: ddStatus } = useQuery({
    queryKey: ['datadog-config-status'],
    queryFn: api.datadogConfig.status,
    staleTime: 30_000,
  })

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

  // Datadog
  const [ddApiKey, setDdApiKey] = useState('')
  const [ddAppKey, setDdAppKey] = useState('')
  const [showDdApiKey, setShowDdApiKey] = useState(false)
  const [showDdAppKey, setShowDdAppKey] = useState(false)
  const [ddSaving, setDdSaving] = useState(false)
  const [ddError, setDdError] = useState<string | null>(null)
  const [ddSaved, setDdSaved] = useState(false)

  useEffect(() => {
    if (config) {
      setGithubBranch(config.githubBaseBranch ?? 'main')
      setGithubAuthMode((config.githubAuthMode as GithubAuthMode) ?? 'pat')
    }
  }, [config])

  if (isLoading) return <><Header title="Integrações" /><PageLoading /></>
  if (error) return <><Header title="Integrações" /><PageError message="Não foi possível carregar a configuração." /></>

  const githubConfigured = config?.hasGithubToken || config?.hasGithubApp

  const handleGithubSave = async () => {
    if (!config) return
    setGithubSaving(true)
    setGithubError(null)
    setGithubSaved(false)
    try {
      const payload: Parameters<typeof api.aiConfig.upsert>[0] = {
        provider: config.provider,
        model: config.model,
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
    if (!ddApiKey.trim()) return
    setDdSaving(true)
    setDdError(null)
    setDdSaved(false)
    try {
      await api.datadogConfig.save({
        ddApiKey: ddApiKey.trim(),
        ddAppKey: ddAppKey.trim() || undefined,
      })
      await queryClient.invalidateQueries({ queryKey: ['datadog-config-status'] })
      setDdApiKey('')
      setDdAppKey('')
      setDdSaved(true)
    } catch (err) {
      setDdError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setDdSaving(false)
    }
  }

  const githubSaveDisabled = githubSaving || (() => {
    const branchUnchanged = githubBranch === (config?.githubBaseBranch ?? 'main')
    const modeUnchanged = githubAuthMode === (config?.githubAuthMode ?? 'pat')
    if (githubAuthMode === 'pat') return !githubToken.trim() && branchUnchanged && modeUnchanged
    return !githubAppId.trim() && !githubAppPrivateKey.trim() && !githubAppInstallationId.trim() && branchUnchanged && modeUnchanged
  })()

  const inputCls = 'mt-2 w-full rounded-2xl px-4 py-3 text-sm outline-none'
  const inputStyle = { backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }
  const tabBase = 'flex-1 rounded-xl py-2 text-xs font-semibold transition-colors'
  const tabActive = { backgroundColor: 'var(--color-foreground)', color: 'var(--color-background)' }
  const tabInactive = { backgroundColor: 'transparent', color: 'var(--color-muted-foreground)', border: '1px solid var(--color-border)' }

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title="Integrações"
        subtitle="Credenciais de GitHub e Datadog usadas pelo assistente ARIA para remediações e análise de incidentes."
      />

      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">

        {/* GitHub */}
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(0,0,0,0.06)' }}>
              <Github size={15} style={{ color: 'var(--color-foreground)' }} />
            </div>
            <div>
              <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>GitHub</p>
              <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                {githubConfigured
                  ? config?.githubAuthMode === 'github_app' ? 'GitHub App configurado' : 'Token configurado'
                  : 'Não configurado'}
              </p>
            </div>
            {githubConfigured && (
              <span className="ml-auto rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#059669' }}>
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
              <div className="md:col-span-2 flex items-start gap-2 rounded-2xl px-4 py-3 text-xs" style={{ backgroundColor: 'rgba(99,102,241,0.07)', color: 'var(--color-muted-foreground)' }}>
                <Info size={13} className="mt-0.5 shrink-0" style={{ color: '#6366f1' }} />
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
                  Installation ID *
                </label>
                <input
                  type="text"
                  value={githubAppInstallationId}
                  onChange={e => setGithubAppInstallationId(e.target.value)}
                  placeholder={config?.hasGithubApp ? '••• (deixe vazio para manter)' : 'Ex: 45678901'}
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

          {githubError && <p className="mt-3 text-sm" style={{ color: '#dc2626' }}>{githubError}</p>}

          <div className="mt-5 flex items-center gap-3">
            <ButtonDefault
              label={githubSaving ? 'Salvando...' : 'Salvar GitHub'}
              onClick={() => void handleGithubSave()}
              disabled={githubSaveDisabled}
            />
            {githubSaved && (
              <div className="flex items-center gap-1.5 text-sm" style={{ color: '#10b981' }}>
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
              <Database size={15} style={{ color: '#6326c2' }} />
            </div>
            <div>
              <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>Datadog</p>
              <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                {ddStatus?.configured ? 'Credenciais configuradas' : 'Credenciais não configuradas'}
              </p>
            </div>
            {ddStatus?.configured && (
              <span className="ml-auto rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#059669' }}>
                Ativo
              </span>
            )}
          </div>

          <p className="mb-4 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            Usado pelo assistente ARIA para análise de métricas via MCP Datadog. As credenciais são
            armazenadas de forma criptografada e nunca expostas na UI.
          </p>

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
                  placeholder={ddStatus?.configured ? '•••••••••' : 'Cole sua DD API Key'}
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
                  placeholder={ddStatus?.configured ? '•••••••••' : 'Cole sua DD Application Key'}
                  className="w-full rounded-2xl px-4 py-3 pr-12 text-sm outline-none"
                  style={inputStyle}
                />
                <button type="button" onClick={() => setShowDdAppKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100">
                  {showDdAppKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>

          {ddError && <p className="mt-3 text-sm" style={{ color: '#dc2626' }}>{ddError}</p>}

          <div className="mt-5 flex items-center gap-3">
            <ButtonDefault
              label={ddSaving ? 'Salvando...' : 'Salvar Datadog'}
              onClick={() => void handleDatadogSave()}
              disabled={ddSaving || !ddApiKey.trim()}
            />
            {ddSaved && (
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
