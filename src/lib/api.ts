import type {
  ActiveRemediation,
  AiConfig,
  Finding,
  PillarScore,
  RemediationDetail,
  SloListItem,
  SloLookupResult,
  WorkloadDetail,
  WorkloadSummary,
} from '@/types'
import {
  getAuthMode,
  getDevAuthConfig,
  getStoredAccessToken,
  type ApiKeyCreateResponse,
  type ApiKeyRecord,
  type AuthMeResponse,
  type AuthSession,
  type BootstrapSetupPayload,
  type BootstrapSetupResponse,
  type BootstrapStatus,
  type LocalLoginPayload,
  type TenantAuthIntegration,
  type UpsertTenantAuthIntegrationPayload,
  type VerifyTenantAuthIntegrationResult,
} from '@/lib/auth'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/v1'

interface ApiDashboardItem {
  workload_id: string
  cluster: string
  environment: string
  namespace: string
  workload: string
  overall_score: number | string | null
  compliance_status: string | null
  remediation_status: string | null
  github_pr_url: string | null
}

interface ApiScorecardItem {
  workload_id: string
  workload: string
  workload_kind: string | null
  namespace: string
  cluster: string
  environment: string
  overall_score: number | string | null
  compliance_status: string | null
  version: number | null
  evaluated_at: string | null
  total_rules: number | null
  passed_rules: number | null
  failed_rules: number | null
  critical_failures: number | null
  error_count: number | null
  warning_count: number | null
  pillar_scores: ApiPillarScoreItem[]
  validation_results: ApiValidationResultItem[]
  active_remediation?: ApiActiveRemediation | null
}

interface ApiPillarScoreItem {
  pillar: string
  score: number | string | null
  passed_checks: number | null
  failed_checks: number | null
  weighted_score: number | string | null
}

interface ApiValidationResultItem {
  rule_id: string
  rule_name: string
  pillar: string
  severity: string
  rule_type: string
  weight: number | string | null
  passed: boolean
  message: string | null
  actual_value: string | null
  is_remediable: boolean
  remediation_category: string | null
  evaluated_at: string | null
  remediation_pending?: boolean
  remediation_pr_url?: string | null
}

interface ApiActiveRemediation {
  status: string
  pr_url: string | null
  pr_number: number | null
  pending_rule_ids: string[]
}

interface ApiRemediationItem {
  status: string
  version: number
  github_pr_url: string | null
  github_pr_number: number | null
  triggered_at: string | null
}

interface ApiSloItem {
  slo_config_id: number | string
  name?: string
  namespace?: string
  cluster?: string
  environment?: string
  slo_type: string
  timeframe: string
  target: number | string | null
  warning?: number | string | null
  datadog_slo_id: string | null
  datadog_slo_state: string | null
  detected_framework: string | null
  detection_source: string | null
  last_sync_at: string | null
}

interface ApiTenantAuthIntegration {
  id: number
  providerType: string
  integrationKind: string
  integrationName: string
  isEnabled: boolean
  isPrimary: boolean
  issuerUrl: string | null
  clientId: string | null
  audience: string | null
  scopes: string[]
  redirectUri: string | null
  postLogoutRedirectUri: string | null
  verifiedAt: string | null
  activatedAt: string | null
  configuredByUserId: number | null
  updatedAt: string
}

interface ApiVerifyTenantAuthIntegrationResult {
  status: string
  message: string
  integration: ApiTenantAuthIntegration
}

function parseNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function buildUrl(path: string): URL {
  const target = `${BASE}${path}`

  if (BASE.startsWith('http://') || BASE.startsWith('https://')) {
    return new URL(target)
  }

  return new URL(target, window.location.origin)
}

function mapAuthErrorMessage(code: string): string {
  switch (code) {
    case 'tenant_slug_taken':
      return 'Esse identificador de tenant já está em uso. Escolha outro slug para continuar.'
    case 'bootstrap_already_configured':
      return 'A configuração inicial já foi concluída neste ambiente. Use a tela de login ou crie outro tenant.'
    case 'invalid_credentials':
      return 'Tenant, email ou senha inválidos.'
    default:
      return code
    }
}

async function request<T>(
  path: string,
  options?: {
    params?: Record<string, string | undefined>
    optional?: boolean
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    body?: unknown
  },
): Promise<T | null> {
  const url = buildUrl(path)

  Object.entries(options?.params ?? {}).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value)
  })

  const token = getStoredAccessToken()
  const authMode = getAuthMode()
  const devAuth = getDevAuthConfig()
  const response = await fetch(url.toString(), {
    method: options?.method ?? 'GET',
    headers: {
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(authMode === 'mock'
        ? {
            'X-Dev-Auth': 'true',
            'X-Dev-Tenant-Id': String(devAuth.tenantId),
            'X-Dev-User': devAuth.email,
            'X-Dev-Roles': devAuth.roles.join(','),
          }
        : {}),
      ...(authMode !== 'mock' && token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(options?.body ? { body: JSON.stringify(options.body) } : {}),
  })
  if (options?.optional && response.status === 404) return null
  if (response.status === 204) return null

  if (!response.ok) {
    const message = await response.text()
    const parsedError = (() => {
      try {
        const decoded = JSON.parse(message) as { error?: string }
        return decoded.error
      } catch {
        return null
      }
    })()
    throw new Error(parsedError || message || `API error ${response.status}`)
  }

  return response.json() as Promise<T>
}

function mapDashboardItem(item: ApiDashboardItem): WorkloadSummary {
  return {
    id: item.workload_id,
    name: item.workload,
    namespace: item.namespace,
    cluster: item.cluster,
    environment: item.environment,
    overallScore: parseNumber(item.overall_score),
    complianceStatus: item.compliance_status,
    remediationStatus: item.remediation_status,
    githubPrUrl: item.github_pr_url,
  }
}

function mapAuthSettingsError(code: string): string {
  switch (code) {
    case 'forbidden':
      return 'Somente administradores podem alterar a autenticacao do tenant.'
    case 'provider_type_unsupported':
      return 'Tipo de provedor nao suportado por enquanto.'
    case 'integration_name_required':
      return 'Informe um nome para a integracao.'
    case 'integration_name_taken':
      return 'Ja existe uma integracao com esse nome no tenant.'
    case 'issuer_required':
      return 'Informe o issuer do provedor OIDC.'
    case 'issuer_invalid':
      return 'Issuer invalido. Use uma URL completa, como https://empresa.okta.com/oauth2/default.'
    case 'oidc_discovery_invalid_url':
      return 'Nao foi possivel montar a URL de discovery para este issuer.'
    case 'oidc_discovery_unreachable':
      return 'Falha ao acessar o endpoint de discovery do provider. Verifique URL e conectividade.'
    case 'oidc_discovery_http_error':
      return 'O endpoint de discovery respondeu com erro HTTP.'
    case 'oidc_discovery_invalid_json':
      return 'O endpoint de discovery retornou um payload invalido.'
    case 'oidc_discovery_missing_issuer':
      return 'O discovery nao retornou a claim issuer.'
    case 'oidc_discovery_issuer_mismatch':
      return 'O issuer retornado no discovery nao corresponde ao issuer configurado.'
    case 'oidc_discovery_missing_jwks_uri':
      return 'O discovery nao retornou jwks_uri.'
    case 'oidc_discovery_invalid_jwks_uri':
      return 'O jwks_uri retornado pelo discovery e invalido.'
    case 'client_id_required':
      return 'Informe o client id da aplicacao no provedor.'
    case 'audience_required':
      return 'Informe a audience esperada no token.'
    case 'integration_not_verified':
      return 'Valide a integracao antes de ativar como provider principal.'
    case 'integration_not_found':
      return 'Integracao nao encontrada para este tenant.'
    case 'invalid_integration_id':
      return 'Identificador da integracao invalido.'
    case 'local_provider_cannot_be_disabled':
      return 'O login local de emergencia nao pode ser desativado.'
    default:
      return code
  }
}

function mapScorecardItem(item: ApiScorecardItem): WorkloadDetail {
  return {
    id: item.workload_id,
    name: item.workload,
    namespace: item.namespace,
    cluster: item.cluster,
    environment: item.environment,
    kind: item.workload_kind,
    overallScore: parseNumber(item.overall_score),
    complianceStatus: item.compliance_status,
    remediationStatus: null,
    githubPrUrl: null,
    version: item.version,
    evaluatedAt: item.evaluated_at,
    totalRules: item.total_rules ?? 0,
    passedRules: item.passed_rules ?? 0,
    failedRules: item.failed_rules ?? 0,
    criticalFailures: item.critical_failures ?? 0,
    errorCount: item.error_count ?? 0,
    warningCount: item.warning_count ?? 0,
    pillarScores: (item.pillar_scores ?? []).map(mapPillarScoreItem),
    validationResults: (item.validation_results ?? []).map(mapValidationResultItem),
    activeRemediation: item.active_remediation ? mapActiveRemediation(item.active_remediation) : null,
  }
}

function mapPillarScoreItem(item: ApiPillarScoreItem): PillarScore {
  return {
    pillar: item.pillar,
    score: parseNumber(item.score),
    passedChecks: item.passed_checks ?? 0,
    failedChecks: item.failed_checks ?? 0,
    weightedScore: parseNumber(item.weighted_score),
  }
}

function mapSeverity(value: string): Finding['severity'] {
  const normalized = value.toLowerCase()
  if (normalized === 'critical') return 'critical'
  if (normalized === 'error') return 'error'
  if (normalized === 'warning') return 'warning'
  return 'info'
}

function mapValidationResultItem(item: ApiValidationResultItem): Finding {
  return {
    ruleId: item.rule_id,
    ruleName: item.rule_name,
    pillar: item.pillar,
    severity: mapSeverity(item.severity),
    ruleType: item.rule_type,
    weight: parseNumber(item.weight),
    passed: item.passed,
    message: item.message,
    actualValue: item.actual_value,
    remediable: item.is_remediable,
    remediationCategory: item.remediation_category,
    evaluatedAt: item.evaluated_at,
    remediationPending: item.remediation_pending ?? false,
    remediationPrUrl: item.remediation_pr_url ?? null,
  }
}

function mapActiveRemediation(item: ApiActiveRemediation): ActiveRemediation {
  return {
    status: item.status,
    prUrl: item.pr_url,
    prNumber: item.pr_number,
    pendingRuleIds: item.pending_rule_ids ?? [],
  }
}

function mapRemediationItem(item: ApiRemediationItem): RemediationDetail {
  return {
    status: item.status,
    version: item.version,
    githubPrUrl: item.github_pr_url,
    githubPrNumber: item.github_pr_number,
    triggeredAt: item.triggered_at,
  }
}

function mapSloItem(namespace: string, name: string, item: ApiSloItem): SloLookupResult {
  return {
    namespace,
    name,
    sloConfigId: String(item.slo_config_id),
    sloType: item.slo_type,
    timeframe: item.timeframe,
    target: parseNumber(item.target),
    datadogSloId: item.datadog_slo_id,
    datadogSloState: item.datadog_slo_state,
    detectedFramework: item.detected_framework,
    detectionSource: item.detection_source,
    lastSyncAt: item.last_sync_at,
  }
}

function mapSloListItem(item: ApiSloItem): SloListItem {
  return {
    namespace: item.namespace ?? 'Não informado',
    name: item.name ?? 'Não informado',
    cluster: item.cluster ?? 'Não informado',
    environment: item.environment ?? 'Não informado',
    sloConfigId: String(item.slo_config_id),
    sloType: item.slo_type,
    timeframe: item.timeframe,
    target: parseNumber(item.target),
    warning: parseNumber(item.warning),
    datadogSloId: item.datadog_slo_id,
    datadogSloState: item.datadog_slo_state,
    detectedFramework: item.detected_framework,
    detectionSource: item.detection_source,
    lastSyncAt: item.last_sync_at,
  }
}

function mapTenantAuthIntegration(item: ApiTenantAuthIntegration): TenantAuthIntegration {
  return {
    id: item.id,
    providerType: item.providerType,
    integrationKind: item.integrationKind,
    integrationName: item.integrationName,
    isEnabled: item.isEnabled,
    isPrimary: item.isPrimary,
    issuerUrl: item.issuerUrl,
    clientId: item.clientId,
    audience: item.audience,
    scopes: item.scopes ?? [],
    redirectUri: item.redirectUri,
    postLogoutRedirectUri: item.postLogoutRedirectUri,
    verifiedAt: item.verifiedAt,
    activatedAt: item.activatedAt,
    configuredByUserId: item.configuredByUserId,
    updatedAt: item.updatedAt,
  }
}

interface AiConfigApiResponse {
  provider: string
  model: string
  githubBaseBranch: string
  monthlyTokenBudget: number | null
  tokensUsedMonth: number
  isActive: boolean
  hasApiKey: boolean
  hasGithubToken: boolean
  updatedAt: string
}

interface AiConfigUpsertPayload {
  provider: string
  model: string
  apiKey: string
  githubToken?: string
  githubBaseBranch?: string
  monthlyTokenBudget?: number | null
}

type SseEvent = { type: string } & Record<string, unknown>

async function* streamSse(path: string, body: unknown): AsyncGenerator<SseEvent> {
  const url = buildUrl(path)
  const token = getStoredAccessToken()
  const authMode = getAuthMode()
  const devAuth = getDevAuthConfig()

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authMode === 'mock'
        ? {
            'X-Dev-Auth': 'true',
            'X-Dev-Tenant-Id': String(devAuth.tenantId),
            'X-Dev-User': devAuth.email,
            'X-Dev-Roles': devAuth.roles.join(','),
          }
        : {}),
      ...(authMode !== 'mock' && token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `API error ${response.status}`)
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const json = line.slice(6).trim()
        if (json) {
          try {
            yield JSON.parse(json) as SseEvent
          } catch {
            /* skip malformed */
          }
        }
      }
    }
  }
}

function mapAiConfig(item: AiConfigApiResponse): AiConfig {
  return {
    provider: item.provider,
    model: item.model,
    githubBaseBranch: item.githubBaseBranch,
    monthlyTokenBudget: item.monthlyTokenBudget,
    tokensUsedMonth: item.tokensUsedMonth,
    isActive: item.isActive,
    hasApiKey: item.hasApiKey,
    hasGithubToken: item.hasGithubToken,
    updatedAt: item.updatedAt,
  }
}

export const api = {
  auth: {
    bootstrapStatus: async () => {
      const response = await request<BootstrapStatus>('/auth/bootstrap/status')
      return response ?? {
        bootstrapRequired: true,
        localLoginEnabled: true,
        oktaConfigured: false,
        primaryProvider: null,
      }
    },
    bootstrapSetup: async (payload: BootstrapSetupPayload) => {
      try {
        const response = await request<BootstrapSetupResponse>('/auth/bootstrap/setup', {
          method: 'POST',
          body: payload,
        })
        if (!response) throw new Error('Não foi possível criar a sessão inicial.')
        return response
      } catch (cause) {
        if (cause instanceof Error) {
          throw new Error(mapAuthErrorMessage(cause.message))
        }
        throw cause
      }
    },
    loginLocal: async (payload: LocalLoginPayload) => {
      try {
        const response = await request<AuthSession>('/auth/local/login', {
          method: 'POST',
          body: payload,
        })
        if (!response) throw new Error('Não foi possível criar a sessão.')
        return response
      } catch (cause) {
        if (cause instanceof Error) {
          throw new Error(mapAuthErrorMessage(cause.message))
        }
        throw cause
      }
    },
    me: async () => {
      const response = await request<AuthMeResponse>('/auth/me')
      if (!response) throw new Error('Sessão indisponível.')
      return response
    },
  },
  authSettings: {
    listProviders: async () => {
      const response = await request<ApiTenantAuthIntegration[]>('/settings/auth/providers')
      return (response ?? []).map(mapTenantAuthIntegration)
    },
    upsertProvider: async (payload: UpsertTenantAuthIntegrationPayload) => {
      try {
        const response = await request<ApiTenantAuthIntegration>('/settings/auth/providers', {
          method: 'POST',
          body: payload,
        })
        if (!response) throw new Error('Nao foi possivel salvar a integracao.')
        return mapTenantAuthIntegration(response)
      } catch (cause) {
        if (cause instanceof Error) {
          throw new Error(mapAuthSettingsError(cause.message))
        }
        throw cause
      }
    },
    verifyProvider: async (integrationId: number) => {
      try {
        const response = await request<ApiVerifyTenantAuthIntegrationResult>(`/settings/auth/providers/${integrationId}/verify`, {
          method: 'POST',
        })
        if (!response) throw new Error('Nao foi possivel validar a integracao.')
        const result: VerifyTenantAuthIntegrationResult = {
          status: response.status,
          message: response.message,
          integration: mapTenantAuthIntegration(response.integration),
        }
        return result
      } catch (cause) {
        if (cause instanceof Error) {
          throw new Error(mapAuthSettingsError(cause.message))
        }
        throw cause
      }
    },
    activateProvider: async (integrationId: number) => {
      try {
        const response = await request<ApiTenantAuthIntegration>(`/settings/auth/providers/${integrationId}/activate`, {
          method: 'POST',
        })
        if (!response) throw new Error('Nao foi possivel ativar a integracao.')
        return mapTenantAuthIntegration(response)
      } catch (cause) {
        if (cause instanceof Error) {
          throw new Error(mapAuthSettingsError(cause.message))
        }
        throw cause
      }
    },
    deactivateProvider: async (integrationId: number) => {
      try {
        const response = await request<ApiTenantAuthIntegration>(`/settings/auth/providers/${integrationId}/deactivate`, {
          method: 'POST',
        })
        if (!response) throw new Error('Nao foi possivel desativar a integracao.')
        return mapTenantAuthIntegration(response)
      } catch (cause) {
        if (cause instanceof Error) {
          throw new Error(mapAuthSettingsError(cause.message))
        }
        throw cause
      }
    },
  },
  dashboard: {
    list: async (cluster?: string) => {
      const response = await request<ApiDashboardItem[]>('/dashboard', {
        params: { cluster },
      })
      return (response ?? []).map(mapDashboardItem)
    },
  },
  workloads: {
    scorecard: async (id: string) => {
      const response = await request<ApiScorecardItem>(`/workloads/${id}/scorecard`, {
        optional: true,
      })
      return response ? mapScorecardItem(response) : null
    },
    remediation: async (id: string) => {
      const response = await request<ApiRemediationItem>(`/workloads/${id}/remediation`, {
        optional: true,
      })
      return response ? mapRemediationItem(response) : null
    },
  },
  apiKeys: {
    list: async () => {
      const response = await request<ApiKeyRecord[]>('/settings/api-keys')
      return response ?? []
    },
    create: async (description?: string) => {
      const response = await request<ApiKeyCreateResponse>('/settings/api-keys', {
        method: 'POST',
        body: { description: description ?? null },
      })
      if (!response) throw new Error('Não foi possível criar a chave.')
      return response
    },
    revoke: async (id: number) => {
      await request<void>(`/settings/api-keys/${id}`, { method: 'DELETE' })
    },
    connectionStatus: async () => {
      const response = await request<{ connected: boolean; lastEventAt: string | null; activeKeyCount: number }>(
        '/settings/api-keys/connection-status',
      )
      return response ?? { connected: false, lastEventAt: null, activeKeyCount: 0 }
    },
  },
  slos: {
    list: async (filters?: { namespace?: string; cluster?: string }) => {
      const response = await request<ApiSloItem[]>('/slos', {
        params: {
          namespace: filters?.namespace,
          cluster: filters?.cluster,
        },
      })
      return (response ?? []).map(mapSloListItem)
    },
    lookup: async (namespace: string, name: string) => {
      const response = await request<ApiSloItem>(`/namespaces/${namespace}/slos/${name}`, {
        optional: true,
      })
      return response ? mapSloItem(namespace, name, response) : null
    },
  },
  aiConfig: {
    get: async (): Promise<AiConfig | null> => {
      const response = await request<AiConfigApiResponse>('/settings/ai-config', { optional: true })
      return response ? mapAiConfig(response) : null
    },
    upsert: async (payload: AiConfigUpsertPayload): Promise<AiConfig> => {
      const response = await request<AiConfigApiResponse>('/settings/ai-config', {
        method: 'PUT' as const,
        body: payload,
      })
      if (!response) throw new Error('Não foi possível salvar a configuração.')
      return mapAiConfig(response)
    },
  },
  ai: {
    explainStream: (
      workloadId: string,
      ruleId: string,
      body: {
        pillar: string
        severity: string
        deploymentName: string
        namespace: string
        actualValue?: string | null
        containerName?: string | null
      },
    ) =>
      streamSse(`/ai/workloads/${workloadId}/findings/${ruleId}/explain`, {
        pillar: body.pillar,
        severity: body.severity,
        deploymentName: body.deploymentName,
        namespace: body.namespace,
        actualValue: body.actualValue ?? null,
        containerName: body.containerName ?? null,
      }),
    remediateStream: (
      workloadId: string,
      body: { findingIds: string[]; repoUrl: string; deployManifestPath?: string },
    ) =>
      streamSse(`/ai/workloads/${workloadId}/remediate`, {
        findingIds: body.findingIds,
        repoUrl: body.repoUrl,
        deployManifestPath: body.deployManifestPath ?? 'manifests/kubernetes/main/deploy.yaml',
      }),
    confirmRemediation: (threadId: string, approved: boolean) =>
      streamSse(`/ai/remediate/${threadId}/confirm`, { approved }),
  },
}
