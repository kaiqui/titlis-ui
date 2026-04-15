import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Info, KeyRound, RefreshCcw, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { ButtonDefault } from '@/components/jeitto/ButtonDefault'
import { Card, CardHeader, CardTitle } from '@/components/jeitto/Card'
import { InfoTip } from '@/components/jeitto/InfoTip'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { api } from '@/lib/api'
import type { TenantAuthIntegration, TenantAuthProviderType } from '@/lib/auth'
import { formatDate } from '@/lib/utils'

type ProviderFormState = {
  providerType: TenantAuthProviderType
  integrationName: string
  issuerUrl: string
  clientId: string
  audience: string
  scopesInput: string
  redirectUri: string
  postLogoutRedirectUri: string
}

const defaultForm: ProviderFormState = {
  providerType: 'okta',
  integrationName: 'Okta SSO',
  issuerUrl: '',
  clientId: '',
  audience: '',
  scopesInput: 'openid profile email offline_access',
  redirectUri: '',
  postLogoutRedirectUri: '',
}

function providerLabel(value: string): string {
  if (value === 'okta') return 'Okta'
  if (value === 'generic_oidc') return 'OIDC Generico'
  if (value === 'local') return 'Login Local'
  return value
}

function normalizeScopes(value: string): string[] {
  return value
    .split(/[,\s]+/)
    .map(item => item.trim())
    .filter(Boolean)
}

function mapIntegrationToForm(integration: TenantAuthIntegration): ProviderFormState {
  return {
    providerType: integration.providerType === 'generic_oidc' ? 'generic_oidc' : 'okta',
    integrationName: integration.integrationName,
    issuerUrl: integration.issuerUrl ?? '',
    clientId: integration.clientId ?? '',
    audience: integration.audience ?? '',
    scopesInput: integration.scopes.join(' '),
    redirectUri: integration.redirectUri ?? '',
    postLogoutRedirectUri: integration.postLogoutRedirectUri ?? '',
  }
}

export function SettingsAuth() {
  const queryClient = useQueryClient()
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState<ProviderFormState>(defaultForm)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const {
    data: providers,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['auth-settings-providers'],
    queryFn: api.authSettings.listProviders,
  })

  const ssoProviders = useMemo(
    () => (providers ?? []).filter(item => item.integrationKind === 'sso_oidc'),
    [providers],
  )
  const localProvider = useMemo(
    () => (providers ?? []).find(item => item.providerType === 'local') ?? null,
    [providers],
  )
  const primaryProvider = useMemo(
    () => (providers ?? []).find(item => item.isPrimary) ?? null,
    [providers],
  )
  const selectedIntegration = useMemo(
    () => ssoProviders.find(item => item.id === selectedIntegrationId) ?? null,
    [selectedIntegrationId, ssoProviders],
  )

  useEffect(() => {
    if (ssoProviders.length === 0) {
      setSelectedIntegrationId(null)
      return
    }

    const exists = selectedIntegrationId !== null && ssoProviders.some(item => item.id === selectedIntegrationId)
    if (!exists) setSelectedIntegrationId(ssoProviders[0].id)
  }, [selectedIntegrationId, ssoProviders])

  useEffect(() => {
    if (isCreating) return
    if (!selectedIntegration) return
    setForm(mapIntegrationToForm(selectedIntegration))
    setSubmitAttempted(false)
  }, [isCreating, selectedIntegration])

  useEffect(() => {
    setFeedback(null)
  }, [
    form.providerType,
    form.integrationName,
    form.issuerUrl,
    form.clientId,
    form.audience,
    form.scopesInput,
    form.redirectUri,
    form.postLogoutRedirectUri,
  ])

  const fieldErrors = useMemo(() => {
    const next: Record<string, string | null> = {
      integrationName: null,
      issuerUrl: null,
      clientId: null,
      audience: null,
      scopesInput: null,
    }

    if (!form.integrationName.trim()) next.integrationName = 'Informe um nome para a integracao.'
    if (!form.issuerUrl.trim()) {
      next.issuerUrl = 'Informe o issuer do provedor.'
    } else if (!/^https?:\/\/[^/\s]+/i.test(form.issuerUrl.trim())) {
      next.issuerUrl = 'Issuer invalido. Use uma URL completa.'
    }
    if (!form.clientId.trim()) next.clientId = 'Informe o client id.'
    if (!form.audience.trim()) next.audience = 'Informe a audience.'
    if (normalizeScopes(form.scopesInput).length === 0) next.scopesInput = 'Informe ao menos um scope.'

    return next
  }, [form])

  const hasValidationErrors = Object.values(fieldErrors).some(Boolean)

  const saveMutation = useMutation({
    mutationFn: api.authSettings.upsertProvider,
    onSuccess: (integration) => {
      setFeedback({ tone: 'success', message: 'Configuracao salva com sucesso.' })
      setIsCreating(false)
      setSelectedIntegrationId(integration.id)
      setSubmitAttempted(false)
      void queryClient.invalidateQueries({ queryKey: ['auth-settings-providers'] })
    },
    onError: (cause) => {
      const message = cause instanceof Error ? cause.message : 'Nao foi possivel salvar agora.'
      setFeedback({ tone: 'error', message })
    },
  })

  const verifyMutation = useMutation({
    mutationFn: api.authSettings.verifyProvider,
    onSuccess: () => {
      setFeedback({ tone: 'success', message: 'Integracao validada com sucesso.' })
      void queryClient.invalidateQueries({ queryKey: ['auth-settings-providers'] })
    },
    onError: (cause) => {
      const message = cause instanceof Error ? cause.message : 'Falha ao validar integracao.'
      setFeedback({ tone: 'error', message })
    },
  })

  const activateMutation = useMutation({
    mutationFn: api.authSettings.activateProvider,
    onSuccess: () => {
      setFeedback({ tone: 'success', message: 'Provider principal atualizado.' })
      void queryClient.invalidateQueries({ queryKey: ['auth-settings-providers'] })
    },
    onError: (cause) => {
      const message = cause instanceof Error ? cause.message : 'Falha ao ativar provider.'
      setFeedback({ tone: 'error', message })
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: api.authSettings.deactivateProvider,
    onSuccess: () => {
      setFeedback({ tone: 'success', message: 'Provider desativado.' })
      void queryClient.invalidateQueries({ queryKey: ['auth-settings-providers'] })
    },
    onError: (cause) => {
      const message = cause instanceof Error ? cause.message : 'Falha ao desativar provider.'
      setFeedback({ tone: 'error', message })
    },
  })

  if (isLoading) {
    return (
      <>
        <Header title="Autenticacao" subtitle="Configurar login corporativo por tenant." />
        <PageLoading />
      </>
    )
  }

  if (error) {
    return (
      <>
        <Header title="Autenticacao" subtitle="Configurar login corporativo por tenant." />
        <PageError
          message={error instanceof Error ? error.message : 'Nao foi possivel carregar as integracoes.'}
          onRetry={() => void refetch()}
        />
      </>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Autenticacao" subtitle="Resumo primeiro, detalhes sob demanda, tudo na mesma tela." />

      <div className="flex-1 space-y-5 px-4 py-6 lg:px-8">
        <Card>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border p-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-muted)' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--color-muted-foreground)' }}>Principal</p>
              <p className="mt-2 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{providerLabel(primaryProvider?.providerType ?? 'local')}</p>
            </div>
            <div className="rounded-2xl border p-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-muted)' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--color-muted-foreground)' }}>Local Break-Glass</p>
              <p className="mt-2 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{localProvider?.isEnabled ? 'Ativo' : 'Indisponivel'}</p>
            </div>
            <div className="rounded-2xl border p-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-muted)' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--color-muted-foreground)' }}>Integracoes OIDC</p>
              <p className="mt-2 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{ssoProviders.length}</p>
            </div>
            <div className="rounded-2xl border p-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-muted)' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--color-muted-foreground)' }}>Ultima ativacao</p>
              <p className="mt-2 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>
                {primaryProvider?.activatedAt ? formatDate(primaryProvider.activatedAt) : 'Nao ativado'}
              </p>
            </div>
          </div>
        </Card>

        {feedback && (
          <Card>
            <div className="flex items-center gap-2 text-sm" style={{ color: feedback.tone === 'success' ? '#166534' : '#b91c1c' }}>
              {feedback.tone === 'success' ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
              <span>{feedback.message}</span>
            </div>
          </Card>
        )}

        <section className="grid gap-4 xl:grid-cols-[24rem_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Providers</CardTitle>
              <ButtonDefault
                label="Novo"
                visual="secondary"
                onClick={() => {
                  setIsCreating(true)
                  setSubmitAttempted(false)
                  setSelectedIntegrationId(null)
                  setForm(defaultForm)
                }}
              />
            </CardHeader>

            {ssoProviders.length === 0 ? (
              <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: 'var(--color-border)', background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                Nenhum provider OIDC configurado ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {ssoProviders.map(item => {
                  const isSelected = !isCreating && item.id === selectedIntegrationId
                  return (
                    <button
                      type="button"
                      key={item.id}
                      className="w-full rounded-2xl border p-3 text-left transition-colors"
                      style={{
                        borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                        background: isSelected ? 'var(--color-primary-soft)' : 'var(--color-muted)',
                      }}
                      onClick={() => {
                        setIsCreating(false)
                        setSelectedIntegrationId(item.id)
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{item.integrationName}</p>
                          <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{providerLabel(item.providerType)}</p>
                        </div>
                        {item.isPrimary && (
                          <span className="rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ background: 'var(--color-card)', color: 'var(--color-primary-strong)' }}>
                            Principal
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ background: 'var(--color-card)', color: 'var(--color-muted-foreground)' }}>
                          {item.verifiedAt ? 'Verificado' : 'Pendente'}
                        </span>
                        <span className="rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ background: 'var(--color-card)', color: 'var(--color-muted-foreground)' }}>
                          {item.isEnabled ? 'Ativo' : 'Desativado'}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{isCreating ? 'Nova Integracao OIDC' : 'Detalhes da Integracao'}</CardTitle>
              <div className="flex gap-2">
                {!isCreating && selectedIntegration && (
                  <>
                    <ButtonDefault
                      label="Validar"
                      visual="secondary"
                      icon={RefreshCcw}
                      onClick={() => verifyMutation.mutate(selectedIntegration.id)}
                      disabled={verifyMutation.isPending}
                    />
                    <ButtonDefault
                      label="Ativar"
                      icon={ShieldCheck}
                      onClick={() => activateMutation.mutate(selectedIntegration.id)}
                      disabled={activateMutation.isPending || selectedIntegration.isPrimary}
                    />
                  </>
                )}
              </div>
            </CardHeader>

            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault()
                setSubmitAttempted(true)
                if (hasValidationErrors) return

                saveMutation.mutate({
                  providerType: form.providerType,
                  integrationName: form.integrationName.trim(),
                  issuerUrl: form.issuerUrl.trim(),
                  clientId: form.clientId.trim(),
                  audience: form.audience.trim(),
                  scopes: normalizeScopes(form.scopesInput),
                  redirectUri: form.redirectUri.trim() || undefined,
                  postLogoutRedirectUri: form.postLogoutRedirectUri.trim() || undefined,
                })
              }}
            >
              <div>
                <label className="mb-2 block text-sm font-semibold" htmlFor="providerType">
                  Tipo do provedor <InfoTip content="Okta ou OIDC generico. O provider e salvo por tenant." />
                </label>
                <select
                  id="providerType"
                  className="jc-select w-full px-4 py-3 text-sm"
                  value={form.providerType}
                  onChange={event => {
                    const value = event.target.value === 'generic_oidc' ? 'generic_oidc' : 'okta'
                    setForm(current => ({
                      ...current,
                      providerType: value,
                      integrationName: value === 'okta' ? 'Okta SSO' : 'OIDC Corporativo',
                    }))
                  }}
                >
                  <option value="okta">Okta</option>
                  <option value="generic_oidc">OIDC Generico</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold" htmlFor="integrationName">
                  Nome da integracao
                </label>
                <input
                  id="integrationName"
                  className="input-field"
                  value={form.integrationName}
                  onChange={event => setForm(current => ({ ...current, integrationName: event.target.value }))}
                  placeholder="Okta Producao"
                />
                {submitAttempted && fieldErrors.integrationName && (
                  <p className="mt-1 text-xs" style={{ color: '#b91c1c' }}>{fieldErrors.integrationName}</p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold" htmlFor="issuerUrl">
                  Issuer <InfoTip content="Exemplo: https://empresa.okta.com/oauth2/default" />
                </label>
                <input
                  id="issuerUrl"
                  className="input-field"
                  value={form.issuerUrl}
                  onChange={event => setForm(current => ({ ...current, issuerUrl: event.target.value }))}
                  placeholder="https://empresa.okta.com/oauth2/default"
                />
                {submitAttempted && fieldErrors.issuerUrl && (
                  <p className="mt-1 text-xs" style={{ color: '#b91c1c' }}>{fieldErrors.issuerUrl}</p>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold" htmlFor="clientId">
                    Client ID
                  </label>
                  <input
                    id="clientId"
                    className="input-field"
                    value={form.clientId}
                    onChange={event => setForm(current => ({ ...current, clientId: event.target.value }))}
                    placeholder="0oa..."
                  />
                  {submitAttempted && fieldErrors.clientId && (
                    <p className="mt-1 text-xs" style={{ color: '#b91c1c' }}>{fieldErrors.clientId}</p>
                  )}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold" htmlFor="audience">
                    Audience
                  </label>
                  <input
                    id="audience"
                    className="input-field"
                    value={form.audience}
                    onChange={event => setForm(current => ({ ...current, audience: event.target.value }))}
                    placeholder="api://titlis"
                  />
                  {submitAttempted && fieldErrors.audience && (
                    <p className="mt-1 text-xs" style={{ color: '#b91c1c' }}>{fieldErrors.audience}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold" htmlFor="scopesInput">
                  Scopes <InfoTip content="Use espaco ou virgula para separar os scopes." />
                </label>
                <input
                  id="scopesInput"
                  className="input-field"
                  value={form.scopesInput}
                  onChange={event => setForm(current => ({ ...current, scopesInput: event.target.value }))}
                  placeholder="openid profile email offline_access"
                />
                {submitAttempted && fieldErrors.scopesInput && (
                  <p className="mt-1 text-xs" style={{ color: '#b91c1c' }}>{fieldErrors.scopesInput}</p>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold" htmlFor="redirectUri">
                    Redirect URI
                  </label>
                  <input
                    id="redirectUri"
                    className="input-field"
                    value={form.redirectUri}
                    onChange={event => setForm(current => ({ ...current, redirectUri: event.target.value }))}
                    placeholder="http://localhost:13000/login/callback"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold" htmlFor="postLogoutRedirectUri">
                    Post logout URI
                  </label>
                  <input
                    id="postLogoutRedirectUri"
                    className="input-field"
                    value={form.postLogoutRedirectUri}
                    onChange={event => setForm(current => ({ ...current, postLogoutRedirectUri: event.target.value }))}
                    placeholder="http://localhost:13000/login"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <ButtonDefault
                  label={saveMutation.isPending ? 'Salvando...' : 'Salvar configuracao'}
                  icon={KeyRound}
                  type="submit"
                  disabled={saveMutation.isPending}
                />
                {!isCreating && selectedIntegration && selectedIntegration.providerType !== 'local' && (
                  <ButtonDefault
                    label="Desativar"
                    visual="secondary"
                    onClick={() => deactivateMutation.mutate(selectedIntegration.id)}
                    disabled={deactivateMutation.isPending}
                  />
                )}
              </div>
            </form>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Contrato de Token</CardTitle>
            <InfoTip content="Essas claims devem estar no access token do provider OIDC." />
          </CardHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border p-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-muted)' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--color-muted-foreground)' }}>Claim obrigatoria</p>
              <p className="mt-2 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>titlis_tenant_id</p>
            </div>
            <div className="rounded-2xl border p-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-muted)' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--color-muted-foreground)' }}>Claim obrigatoria</p>
              <p className="mt-2 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>titlis_roles</p>
            </div>
            <div className="rounded-2xl border p-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-muted)' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--color-muted-foreground)' }}>Roles aceitas</p>
              <p className="mt-2 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>titlis.admin, titlis.viewer</p>
            </div>
            <div className="rounded-2xl border p-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-muted)' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--color-muted-foreground)' }}>Regra de remediacao</p>
              <p className="mt-2 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>Somente admin pode executar a acao</p>
            </div>
          </div>
          <div className="mt-3 rounded-2xl border p-3 text-sm" style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)', color: 'var(--color-muted-foreground)' }}>
            <Info size={14} className="mr-2 inline-block align-text-top" />
            Exemplo: {`{ "titlis_tenant_id": "42", "titlis_roles": ["titlis.admin"] }`}
          </div>
        </Card>
      </div>
    </div>
  )
}
