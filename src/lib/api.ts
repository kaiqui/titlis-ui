import type {
  ActiveRemediation,
  AdminOverview,
  AdminUsersResponse,
  AiConfig,
  DatadogQueueSettings,
  Finding,
  LabelRegistryEntry,
  LifecycleState,
  PillarScore,
  QueueFinding,
  QueueLinkSuggestion,
  QueueScorecard,
  QueueSummary,
  QueueThresholds,
  ReliabilityEvolution,
  ReliabilityFinding,
  ReliabilityMover,
  ReliabilityNode,
  ReliabilityOpportunity,
  ReliabilityProjection,
  ReliabilityTrendPoint,
  ServiceOption,
  RemediationDetail,
  Severity,
  SloListItem,
  CoverageGraph,
  CoverageScorecard,
  ServiceMap,
  SloLookupResult,
  WorkloadDetail,
  WorkloadSLOCoverage,
  WorkloadSummary,
} from '@/types'
import {
  getPendingOktaTenantSlug,
  getAuthMode,
  getDevAuthConfig,
  getStoredAccessToken,
  readStoredSession,
  type ApiKeyCreateResponse,
  type ApiKeyRecord,
  type AuthMeResponse,
  type AuthSession,
  type BootstrapSetupPayload,
  type BootstrapSetupResponse,
  type BootstrapStatus,
  type LocalLoginPayload,
  type OktaExchangePayload,
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
  is_favorite: boolean
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
  sync_error?: string | null
  auto_detect_framework?: boolean
}

interface ApiWorkloadSLOCoverage {
  workload_id: string
  name: string
  k8s_uid: string | null
  namespace: string
  cluster: string
  environment: string
  slo_status: 'WITH_SLO' | 'CANDIDATE' | 'NO_DATADOG'
  slo_config_id: string | null
  datadog_slo_state: string | null
  last_sync_at: string | null
  dd_git_repository_url: string | null
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
    case 'invalid_okta_id_token':
      return 'Nao foi possivel validar o login com Okta.'
    case 'federated_user_not_found':
      return 'Usuario Okta nao vinculado ao tenant configurado.'
    default:
      return code
    }
}

async function request<T>(
  path: string,
  options?: {
    params?: Record<string, string | undefined>
    optional?: boolean
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
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
  const oktaTenantSlug = readStoredSession()?.provider === 'okta'
    ? (readStoredSession()?.user.tenantSlug || getPendingOktaTenantSlug())
    : null
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
      ...(authMode !== 'mock' && oktaTenantSlug ? { 'X-Titlis-Tenant-Slug': oktaTenantSlug } : {}),
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

  const text = await response.text()
  if (!text) return null as unknown as T
  return JSON.parse(text) as T
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
    isFavorite: item.is_favorite ?? false,
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
    isFavorite: false,
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
    pillar: item.pillar.toLowerCase(),
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
    syncError: item.sync_error ?? null,
    autoDetectFramework: item.auto_detect_framework ?? false,
  }
}

function mapWorkloadSLOCoverage(item: ApiWorkloadSLOCoverage): WorkloadSLOCoverage {
  return {
    workloadId: item.workload_id,
    name: item.name,
    k8sUid: item.k8s_uid,
    namespace: item.namespace,
    cluster: item.cluster,
    environment: item.environment,
    sloStatus: item.slo_status,
    sloConfigId: item.slo_config_id,
    datadogSloState: item.datadog_slo_state,
    lastSyncAt: item.last_sync_at,
    ddGitRepositoryUrl: item.dd_git_repository_url,
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
  githubAuthMode: string
  monthlyTokenBudget: number | null
  tokensUsedMonth: number
  isActive: boolean
  hasApiKey: boolean
  hasGithubToken: boolean
  hasGithubApp: boolean
  updatedAt: string
}

interface AiConfigUpsertPayload {
  provider?: string
  model?: string
  apiKey?: string
  githubToken?: string
  githubBaseBranch?: string
  githubAuthMode?: string
  githubAppId?: string
  githubAppPrivateKey?: string
  githubAppInstallationId?: string
  monthlyTokenBudget?: number | null
}

const SUPPORTED_AI_PROVIDERS = new Set([
  'openai',
  'anthropic',
  'google',
  'gemini',
  'mistral',
  'cohere',
  'azure',
  'ollama',
])

function sanitizeAiConfigPayload(payload: AiConfigUpsertPayload): AiConfigUpsertPayload {
  const provider = payload.provider?.trim()
  const model = payload.model?.trim()

  return {
    ...payload,
    provider: provider && SUPPORTED_AI_PROVIDERS.has(provider) ? provider : undefined,
    model: model && model !== 'pending' ? model : undefined,
  }
}

export interface RemediationTimelineItem {
  workload: string
  namespace: string
  cluster: string
  environment: string
  status: string
  github_pr_number: number | null
  github_pr_url: string | null
  triggered_at: string
  resolved_at: string | null
}

export interface RemediationTimelineResponse {
  period_days: number
  summary: {
    total_prs: number
    merged: number
    failed: number
    in_progress: number
    success_rate: number | null
  }
  items: RemediationTimelineItem[]
}

export interface ClusterItem {
  id: number
  name: string
  environment: string
}

export interface NamespaceItem {
  id: number
  name: string
  clusterId: number
  clusterName: string
}

export interface WorkloadItem {
  id: number
  name: string
  namespaceId: number
  namespaceName: string
  clusterName: string
}

export interface ResourceTagItem {
  resourceId: number
  tags: string[]
}

export interface TagPolicy {
  id: number
  tenant_id: number
  tag: string
  rule_id?: string
  severity?: string
  action: string
  created_by?: string
  created_at: string
}

export interface CreateTagPolicyPayload {
  tag: string
  rule_id?: string
  severity?: string
  action?: string
  created_by?: string
}

export interface ScoreConfigRule {
  engine_id: number
  rule_id: string
  pillar: string
  name: string
  severity: string
  enabled_by_default: boolean
}

export interface ScoreConfigOverride {
  id: number
  tenant_id: number
  engine_id: number
  rule_id: string
  scope: 'tenant' | 'cluster' | 'namespace' | 'workload'
  cluster_name: string | null
  namespace: string | null
  workload_uid: string | null
  enabled: boolean
  reason: string | null
  created_by: string | null
  created_at: string
}

export interface CreateOverridePayload {
  engine_id: number
  rule_id: string
  scope: 'tenant' | 'cluster' | 'namespace' | 'workload'
  cluster_name?: string
  namespace?: string
  workload_uid?: string
  enabled: boolean
  reason?: string
  created_by: string
}

export interface PillarWeight {
  engine_id: number
  pillar: string
  weight: number
}

export interface SetWeightsPayload {
  engine_id: number
  weights: Record<string, number>
  updated_by?: string
}


export interface ServiceDefinitionMapping {
  workloadName: string
  repoUrl: string
  lastSyncedAt: string
}

export interface DatadogProbeResult {
  ok: boolean
  reason: string
  tenant_id: number
}

export interface DatadogConfigStatus {
  configured: boolean
  probeStatus: 'ok' | 'error' | 'not_configured'
}

type SseEvent = { type: string } & Record<string, unknown>

async function fetchWithBackoff(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error = new Error('fetch failed')
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, Math.min(1000 * 2 ** (attempt - 1), 8000)))
    }
    try {
      const response = await fetch(url, options)
      return response
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }
  throw lastError
}

async function* streamSse(path: string, body: unknown, signal?: AbortSignal): AsyncGenerator<SseEvent> {
  const url = buildUrl(path)
  const token = getStoredAccessToken()
  const authMode = getAuthMode()
  const devAuth = getDevAuthConfig()

  const response = await fetchWithBackoff(url.toString(), {
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
    signal,
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
  const hasConfiguredProvider = SUPPORTED_AI_PROVIDERS.has(item.provider)
  return {
    provider: hasConfiguredProvider ? item.provider : '',
    model: hasConfiguredProvider && item.model !== 'pending' ? item.model : '',
    githubBaseBranch: item.githubBaseBranch,
    githubAuthMode: item.githubAuthMode ?? 'pat',
    monthlyTokenBudget: item.monthlyTokenBudget,
    tokensUsedMonth: item.tokensUsedMonth,
    isActive: item.isActive,
    hasApiKey: item.hasApiKey,
    hasGithubToken: item.hasGithubToken,
    hasGithubApp: item.hasGithubApp ?? false,
    updatedAt: item.updatedAt,
  }
}

interface ApiQueueSummaryItem {
  queueId: string | number
  provider: string
  externalId: string
  displayName: string
  isDlq: boolean
  lifecycleState: string
  observationCount: number
  overallScore: number | null
  complianceStatus: string | null
  firstSeenAt: string
  lastSeenAt: string
  serviceDefinitionId?: number | null
  serviceName?: string | null
  team?: string | null
  linkSource?: string | null
  suggestionCount?: number | null
}

interface ApiQueueLinkSuggestion {
  serviceDefinitionId: number
  serviceName: string
  team: string | null
  confidence: number
  source: string
}

interface ApiServiceOption {
  serviceDefinitionId: number
  serviceName: string
  team: string | null
}

interface ApiReliabilityNode {
  path: string
  kind: string
  name: string
  ri: number | null
  debt: number | null
  weight: number | null
  coverage: number | null
  scoredLeaves: number | null
  totalLeaves: number | null
  criticalBreach: boolean
  hasChildren: boolean
  children?: ApiReliabilityNode[]
}

interface ApiReliabilityFinding {
  leafKind: string
  leafName: string
  workloadUid: string | null
  ruleId: string
  pillar: string | null
  severity: string | null
  message: string | null
  actualValue: string | null
  debt: number | null
  riGainService: number | null
  remediable: boolean
  outcome?: string | null
}

interface ApiReliabilityTrendPoint {
  date: string
  ri: number | null
}

interface ApiReliabilityOpportunity {
  ruleId: string
  pillar?: string | null
  severity?: string | null
  occurrences?: number | null
  debt?: number | null
  riGain?: number | null
  remediable?: boolean
  message?: string | null
}

interface ApiReliabilityProjection {
  potentialRi?: number | null
  remediableDebt?: number | null
  totalDebt?: number | null
  opportunities?: ApiReliabilityOpportunity[]
}

interface ApiReliabilityMover {
  path: string
  kind: string
  name: string
  riStart?: number | null
  riEnd?: number | null
  delta?: number | null
}

interface ApiReliabilityEvolution {
  root?: string | null
  days?: number | null
  current: ApiReliabilityNode
  trend?: ApiReliabilityTrendPoint[]
  projection?: ApiReliabilityProjection
  movers?: ApiReliabilityMover[]
}

interface ApiQueuePillarScoreItem {
  pillar: string
  pillarScore: number | string | null
  passedChecks: number | null
  failedChecks: number | null
  weightedScore: number | string | null
}

interface ApiQueueScorecardItem {
  queueId: string | number
  overallScore: number | string | null
  complianceStatus: string | null
  totalRules: number | null
  passedRules: number | null
  failedRules: number | null
  criticalFailures: number | null
  errorCount: number | null
  warningCount: number | null
  evaluatedAt: string | null
  pillarScores: ApiQueuePillarScoreItem[]
  validationResults: ApiQueueFindingItem[]
}

interface ApiQueueFindingItem {
  ruleId: string
  ruleName: string | null
  pillar: string | null
  severity: string | null
  rulePassed: boolean
  resultMessage: string | null
  actualValue: string | null
}

interface ApiQueueThresholdsItem {
  backlogWarning: number
  backlogCritical: number
  ageWarningSec: number
  ageCriticalSec: number
  p50Backlog: number
  p75Backlog: number
  p95Backlog: number
  p50AgeSec: number
  p75AgeSec: number
  p95AgeSec: number
  calculatedAt: string
  observationCount: number
}

interface ApiDatadogQueueSettings {
  hasApiKey: boolean
  hasAppKey: boolean
  site: string
  queueMonitoringEnabled: boolean
  monitorCreationEnabled: boolean
  queueCounts: { discovering: number; learning: number; monitoring: number }
}

interface ApiLabelRegistryEntry {
  labelRegistryId: number
  labelKey: string
  labelValue: string
  isActive: boolean
}

function mapQueueSummary(item: ApiQueueSummaryItem): QueueSummary {
  return {
    id: String(item.queueId),
    provider: item.provider,
    externalId: item.externalId,
    displayName: item.displayName,
    projectId: null,
    topicId: null,
    isDlq: item.isDlq,
    lifecycleState: (item.lifecycleState as LifecycleState) ?? 'DISCOVERING',
    observationCount: item.observationCount ?? 0,
    learningTarget: 7,
    overallScore: parseNumber(item.overallScore),
    complianceStatus: item.complianceStatus,
    sendMessageCountRate: null,
    pullMessageCountRate: null,
    lastSeenAt: item.lastSeenAt,
    serviceDefinitionId: item.serviceDefinitionId ?? null,
    serviceName: item.serviceName ?? null,
    team: item.team ?? null,
    linkSource: item.linkSource ?? null,
    suggestionCount: item.suggestionCount ?? 0,
  }
}

function mapQueueLinkSuggestion(item: ApiQueueLinkSuggestion): QueueLinkSuggestion {
  return {
    serviceDefinitionId: item.serviceDefinitionId,
    serviceName: item.serviceName,
    team: item.team ?? null,
    confidence: parseNumber(item.confidence) ?? 0,
    source: item.source,
  }
}

function mapServiceOption(item: ApiServiceOption): ServiceOption {
  return {
    serviceDefinitionId: item.serviceDefinitionId,
    serviceName: item.serviceName,
    team: item.team ?? null,
  }
}

function mapReliabilityNode(item: ApiReliabilityNode): ReliabilityNode {
  return {
    path: item.path,
    kind: item.kind,
    name: item.name,
    ri: item.ri ?? null,
    debt: item.debt ?? 0,
    weight: item.weight ?? 0,
    coverage: item.coverage ?? 0,
    scoredLeaves: item.scoredLeaves ?? 0,
    totalLeaves: item.totalLeaves ?? 0,
    criticalBreach: item.criticalBreach ?? false,
    hasChildren: item.hasChildren ?? false,
    children: (item.children ?? []).map(mapReliabilityNode),
  }
}

function mapReliabilityFinding(item: ApiReliabilityFinding): ReliabilityFinding {
  return {
    leafKind: item.leafKind,
    leafName: item.leafName,
    workloadUid: item.workloadUid ?? null,
    ruleId: item.ruleId,
    pillar: item.pillar ?? null,
    severity: item.severity ?? null,
    message: item.message ?? null,
    actualValue: item.actualValue ?? null,
    debt: item.debt ?? 0,
    riGainService: item.riGainService ?? 0,
    remediable: item.remediable ?? false,
    outcome: item.outcome ?? 'fail',
  }
}

function mapReliabilityOpportunity(item: ApiReliabilityOpportunity): ReliabilityOpportunity {
  return {
    ruleId: item.ruleId,
    pillar: item.pillar ?? null,
    severity: item.severity ?? null,
    occurrences: item.occurrences ?? 0,
    debt: item.debt ?? 0,
    riGain: item.riGain ?? 0,
    remediable: item.remediable ?? false,
    message: item.message ?? null,
  }
}

function mapReliabilityProjection(item?: ApiReliabilityProjection): ReliabilityProjection {
  return {
    potentialRi: item?.potentialRi ?? null,
    remediableDebt: item?.remediableDebt ?? 0,
    totalDebt: item?.totalDebt ?? 0,
    opportunities: (item?.opportunities ?? []).map(mapReliabilityOpportunity),
  }
}

function mapReliabilityMover(item: ApiReliabilityMover): ReliabilityMover {
  return {
    path: item.path,
    kind: item.kind,
    name: item.name,
    riStart: item.riStart ?? null,
    riEnd: item.riEnd ?? null,
    delta: item.delta ?? null,
  }
}

function mapReliabilityEvolution(item: ApiReliabilityEvolution): ReliabilityEvolution {
  return {
    root: item.root ?? '',
    days: item.days ?? 30,
    current: mapReliabilityNode(item.current),
    trend: (item.trend ?? []).map((p) => ({ date: p.date, ri: p.ri ?? 0 })),
    projection: mapReliabilityProjection(item.projection),
    movers: (item.movers ?? []).map(mapReliabilityMover),
  }
}

function mapQueuePillarScoreItem(item: ApiQueuePillarScoreItem): PillarScore {
  return {
    pillar: item.pillar,
    score: parseNumber(item.pillarScore) ?? 0,
    passedChecks: item.passedChecks ?? 0,
    failedChecks: item.failedChecks ?? 0,
    weightedScore: parseNumber(item.weightedScore),
  }
}

function mapQueueFinding(item: ApiQueueFindingItem): QueueFinding {
  return {
    ruleId: item.ruleId,
    ruleName: item.ruleName ?? '',
    pillar: item.pillar ?? '',
    severity: mapSeverity(item.severity ?? '') as Severity,
    passed: item.rulePassed,
    message: item.resultMessage,
    actualValue: item.actualValue,
  }
}

function mapQueueScorecard(item: ApiQueueScorecardItem): QueueScorecard {
  return {
    queueId: String(item.queueId),
    overallScore: parseNumber(item.overallScore),
    complianceStatus: item.complianceStatus,
    totalRules: item.totalRules ?? 0,
    passedRules: item.passedRules ?? 0,
    failedRules: item.failedRules ?? 0,
    criticalFailures: item.criticalFailures ?? 0,
    errorCount: item.errorCount ?? 0,
    warningCount: item.warningCount ?? 0,
    evaluatedAt: item.evaluatedAt,
    pillarScores: (item.pillarScores ?? []).map(mapQueuePillarScoreItem),
    findings: (item.validationResults ?? []).map(mapQueueFinding),
  }
}

function mapQueueThresholds(item: ApiQueueThresholdsItem): QueueThresholds {
  return {
    backlogWarning: item.backlogWarning,
    backlogCritical: item.backlogCritical,
    ageWarningSec: item.ageWarningSec,
    ageCriticalSec: item.ageCriticalSec,
    p50Backlog: item.p50Backlog,
    p75Backlog: item.p75Backlog,
    p95Backlog: item.p95Backlog,
    p50AgeSec: item.p50AgeSec,
    p75AgeSec: item.p75AgeSec,
    p95AgeSec: item.p95AgeSec,
    calculatedAt: item.calculatedAt,
    observationCount: item.observationCount,
  }
}

function mapDatadogSettings(item: ApiDatadogQueueSettings): DatadogQueueSettings {
  return {
    configured: item.hasApiKey,
    hasAppKey: item.hasAppKey,
    site: item.site ?? 'datadoghq.com',
    queueMonitoringEnabled: item.queueMonitoringEnabled,
    monitorCreationEnabled: item.monitorCreationEnabled ?? false,
    lastCollectedAt: null,
    activeMonitorCount: 0,
    queuesByState: item.queueCounts ?? { discovering: 0, learning: 0, monitoring: 0 },
    probeStatus: item.hasApiKey ? 'ok' : 'not_configured',
  }
}

function mapLabelRegistryEntry(item: ApiLabelRegistryEntry): LabelRegistryEntry {
  return {
    id: item.labelRegistryId,
    labelKey: item.labelKey,
    labelValue: item.labelValue,
    isActive: item.isActive,
    createdAt: '',
  }
}

interface ApiCoverageDimension {
  pillar: string
  evaluable?: number
  passed?: number
  na?: number
  pct?: number
  maturity_level?: number
}

interface ApiCoverageFinding {
  code: string
  pillar?: string
  severity?: string
  outcome?: string
  message?: string
}

interface ApiCoverageScorecard {
  workloadUid: string
  serviceName?: string | null
  cluster?: string | null
  trustScore?: number | null
  maturity?: number
  dimensions?: ApiCoverageDimension[]
  findings?: ApiCoverageFinding[]
  evaluatedAt?: string
}

function deriveCoverageMaturity(item: ApiCoverageScorecard): number {
  if ((item.maturity ?? 0) > 0) return item.maturity ?? 0
  const levels = (item.dimensions ?? [])
    .map((d) => d.maturity_level ?? 0)
    .filter((level) => level > 0)
  return levels.length ? Math.min(...levels) : 0
}

function mapCoverageScorecard(item: ApiCoverageScorecard): CoverageScorecard {
  return {
    workloadUid: item.workloadUid,
    serviceName: item.serviceName ?? null,
    cluster: item.cluster ?? null,
    trustScore: item.trustScore ?? null,
    maturity: deriveCoverageMaturity(item),
    dimensions: (item.dimensions ?? []).map((d) => ({
      pillar: d.pillar,
      evaluable: d.evaluable ?? 0,
      passed: d.passed ?? 0,
      na: d.na ?? 0,
      pct: d.pct ?? 0,
      maturityLevel: d.maturity_level ?? 0,
    })),
    findings: (item.findings ?? []).map((f) => ({
      code: f.code,
      pillar: f.pillar ?? '',
      severity: f.severity ?? '',
      outcome: (f.outcome ?? '').toLowerCase(),
      message: f.message ?? '',
    })),
    evaluatedAt: item.evaluatedAt ?? '',
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
    exchangeOkta: async (payload: OktaExchangePayload) => {
      try {
        const response = await request<AuthSession>('/auth/okta/exchange', {
          method: 'POST',
          body: payload,
        })
        if (!response) throw new Error('Nao foi possivel criar a sessao do Titlis.')
        return response
      } catch (cause) {
        if (cause instanceof Error) {
          throw new Error(mapAuthErrorMessage(cause.message))
        }
        throw cause
      }
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
  favorites: {
    add: async (workloadId: string) => {
      await request<null>(`/workloads/${workloadId}/favorite`, { method: 'POST' })
    },
    remove: async (workloadId: string) => {
      await request<null>(`/workloads/${workloadId}/favorite`, { method: 'DELETE' })
    },
  },
  dashboard: {
    list: async (cluster?: string, tags?: string[]) => {
      const url = buildUrl('/dashboard')
      if (cluster) url.searchParams.set('cluster', cluster)
      tags?.forEach(t => url.searchParams.append('tag', t))
      const token = getStoredAccessToken()
      const authMode = getAuthMode()
      const devAuth = getDevAuthConfig()
      const response = await fetch(url.toString(), {
        headers: {
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
      })
      if (!response.ok) throw new Error(`API error ${response.status}`)
      const data = await response.json() as ApiDashboardItem[]
      return data.map(mapDashboardItem)
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
    githubLink: async (id: string): Promise<{ linked: boolean; repoUrl?: string; serviceYamlPath?: string } | null> =>
      request<{ linked: boolean; repo_url?: string; service_yaml_path?: string }>(
        `/workloads/${id}/github-link`,
        { optional: true },
      ).then(r => r ? { linked: !!(r.linked ?? r.repo_url), repoUrl: r.repo_url, serviceYamlPath: r.service_yaml_path } : null),
    setGithubLink: async (
      id: string,
      repoUrl: string,
      serviceYamlPath = '.titlis/service.yaml',
    ): Promise<{ linked: boolean; repoUrl: string; serviceYamlPath: string; serviceYamlFound: boolean }> => {
      const r = await request<{
        linked: boolean
        repo_url: string
        service_yaml_path: string
        service_yaml_found: boolean
      }>(`/workloads/${id}/github-link`, { method: 'POST', body: { repoUrl, serviceYamlPath } })
      return {
        linked: r!.linked,
        repoUrl: r!.repo_url,
        serviceYamlPath: r!.service_yaml_path,
        serviceYamlFound: r!.service_yaml_found,
      }
    },
    removeGithubLink: (id: string) =>
      request<void>(`/workloads/${id}/github-link`, { method: 'DELETE' }),
  },
  github: {
    searchRepos: async (q: string): Promise<{ fullName: string; htmlUrl: string; description: string }[]> => {
      const r = await request<{ items: { full_name: string; html_url: string; description: string }[] }>(
        `/github/repos/search?q=${encodeURIComponent(q)}`,
        { optional: true },
      )
      return (r?.items ?? []).map(i => ({ fullName: i.full_name, htmlUrl: i.html_url, description: i.description }))
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
    proposeChange: async (sloConfigId: string, payload: { field: string; oldValue: string; newValue: string }): Promise<void> => {
      await request(`/slos/${sloConfigId}/propose-change`, {
        method: 'POST' as const,
        body: payload,
      })
    },
    coverage: async (): Promise<WorkloadSLOCoverage[]> => {
      const res = await request<ApiWorkloadSLOCoverage[]>('/slos/coverage', { optional: true })
      return (res ?? []).map(mapWorkloadSLOCoverage)
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
        body: sanitizeAiConfigPayload(payload),
      })
      if (!response) throw new Error('Não foi possível salvar a configuração.')
      return mapAiConfig(response)
    },
    testGithub: async (): Promise<{ ok: boolean; mode: string; message: string }> => {
      const res = await request<{ ok: boolean; mode: string; message: string }>('/settings/ai-config/github/test', {
        method: 'POST' as const,
        optional: true,
      })
      return res ?? { ok: false, mode: 'pat', message: 'Sem resposta do servidor.' }
    },
  },
  datadogConfig: {
    save: async (payload: { ddApiKey: string; ddAppKey?: string; site?: string }): Promise<void> => {
      await request('/settings/datadog', {
        method: 'POST' as const,
        body: payload,
      })
    },
    status: async (): Promise<DatadogConfigStatus> => {
      const res = await request<DatadogConfigStatus>('/settings/datadog/status', { optional: true })
      return res ?? { configured: false, probeStatus: 'not_configured' }
    },
  },
  scoreConfig: {
    getRules: async (engine = 'kubernetes'): Promise<ScoreConfigRule[]> => {
      const res = await request<ScoreConfigRule[]>(`/settings/score-config/rules?engine=${engine}`, { optional: true })
      return res ?? []
    },
    getOverrides: async (engine = 'kubernetes'): Promise<ScoreConfigOverride[]> => {
      const res = await request<ScoreConfigOverride[]>(`/settings/score-config/overrides?engine=${engine}`, { optional: true })
      return res ?? []
    },
    createOverride: async (body: CreateOverridePayload): Promise<ScoreConfigOverride> => {
      const res = await request<ScoreConfigOverride>('/settings/score-config/overrides', {
        method: 'POST' as const,
        body,
      })
      if (!res) throw new Error('Não foi possível salvar a configuração.')
      return res
    },
    deleteOverride: async (id: number): Promise<void> => {
      await request(`/settings/score-config/overrides/${id}`, { method: 'DELETE' as const })
    },
    getWeights: async (engine = 'kubernetes'): Promise<PillarWeight[]> => {
      const res = await request<PillarWeight[]>(`/settings/score-config/weights?engine=${engine}`, { optional: true })
      return res ?? []
    },
    setWeights: async (body: SetWeightsPayload): Promise<PillarWeight[]> => {
      const res = await request<PillarWeight[]>('/settings/score-config/weights', {
        method: 'PUT' as const,
        body,
      })
      if (!res) throw new Error('Não foi possível salvar os pesos.')
      return res
    },
  },
  clusters: {
    list: async (): Promise<ClusterItem[]> => {
      const res = await request<ClusterItem[]>('/settings/tags/resource-list/clusters', { optional: true })
      return res ?? []
    },
  },
  namespaces: {
    list: async (clusterId?: number): Promise<NamespaceItem[]> => {
      const path = clusterId
        ? `/settings/tags/resource-list/namespaces?clusterId=${clusterId}`
        : '/settings/tags/resource-list/namespaces'
      const res = await request<NamespaceItem[]>(path, { optional: true })
      return res ?? []
    },
  },
  workloadItems: {
    list: async (clusterId?: number, namespaceId?: number): Promise<WorkloadItem[]> => {
      const params = new URLSearchParams()
      if (namespaceId) params.set('namespaceId', String(namespaceId))
      else if (clusterId) params.set('clusterId', String(clusterId))
      const qs = params.toString()
      const res = await request<WorkloadItem[]>(
        `/settings/tags/resource-list/workloads${qs ? `?${qs}` : ''}`,
        { optional: true },
      )
      return res ?? []
    },
  },
  tags: {
    available: async (resourceType = 'workload'): Promise<string[]> => {
      const res = await request<string[]>(`/tags/available?resourceType=${encodeURIComponent(resourceType)}`, { optional: true })
      return res ?? []
    },
    list: async (resourceType: string): Promise<ResourceTagItem[]> => {
      const res = await request<ResourceTagItem[]>(`/settings/tags/${resourceType}`, { optional: true })
      return res ?? []
    },
    add: async (resourceType: string, resourceId: number, tag: string): Promise<void> => {
      await request(`/settings/tags/${resourceType}/${resourceId}`, {
        method: 'POST' as const,
        body: { tag },
      })
    },
    remove: async (resourceType: string, resourceId: number, tag: string): Promise<void> => {
      await request(`/settings/tags/${resourceType}/${resourceId}/${encodeURIComponent(tag)}`, {
        method: 'DELETE' as const,
      })
    },
  },
  tagPolicies: {
    list: async (): Promise<TagPolicy[]> => {
      const res = await request<TagPolicy[]>('/settings/scoring/tag-policies', { optional: true })
      return res ?? []
    },
    create: async (body: CreateTagPolicyPayload): Promise<TagPolicy> => {
      const res = await request<TagPolicy>('/settings/scoring/tag-policies', {
        method: 'POST' as const,
        body,
      })
      if (!res) throw new Error('Não foi possível criar a política.')
      return res
    },
    delete: async (id: number): Promise<void> => {
      await request(`/settings/scoring/tag-policies/${id}`, { method: 'DELETE' as const })
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
      signal?: AbortSignal,
    ) =>
      streamSse(`/ai/workloads/${workloadId}/findings/${ruleId}/explain`, {
        pillar: body.pillar,
        severity: body.severity,
        deploymentName: body.deploymentName,
        namespace: body.namespace,
        actualValue: body.actualValue ?? null,
        containerName: body.containerName ?? null,
      }, signal),
    remediateStream: (
      workloadId: string,
      body: { findingIds: string[]; repoUrl: string; deployManifestPath?: string; serviceYamlPath?: string },
    ) =>
      streamSse(`/ai/workloads/${workloadId}/remediate`, {
        findingIds: body.findingIds,
        repoUrl: body.repoUrl,
        deployManifestPath: body.deployManifestPath ?? 'manifests/kubernetes/main/deploy.yaml',
        serviceYamlPath: body.serviceYamlPath ?? '.titlis/service.yaml',
      }),
    confirmRemediation: (threadId: string, approved: boolean) =>
      streamSse(`/ai/remediate/${threadId}/confirm`, { approved }),
    setManifestPath: (threadId: string, manifestPath: string) =>
      streamSse(`/ai/remediate/${threadId}/set-path`, { manifestPath }),
    submitServiceYaml: (
      threadId: string,
      form: {
        manifestPath: string
        baseBranch: string
        name: string
        team: string
        namespaces: string[]
        namePattern: string
        env: string
        contacts?: Array<Record<string, unknown>>
        extraPaths?: Record<string, unknown>
      },
    ) =>
      streamSse(`/ai/remediate/${threadId}/submit-service-yaml`, {
        manifestPath: form.manifestPath,
        baseBranch: form.baseBranch,
        name: form.name,
        team: form.team,
        namespaces: form.namespaces,
        namePattern: form.namePattern,
        env: form.env,
        contacts: form.contacts ?? null,
        extraPaths: form.extraPaths ?? null,
      }),
    agentChat: (sessionId: string, message: string, workloadId?: string) =>
      streamSse('/ai/agent/chat', { sessionId, message, ...(workloadId ? { workloadId } : {}) }),
    agentToolsRespond: (
      sessionId: string,
      decisions: { proposalId: string; approved: boolean; editedArgs?: Record<string, unknown> }[],
    ) =>
      streamSse(`/ai/agent/${sessionId}/tools/respond`, { decisions }),
  },
  remediation: {
    history: async (days = 30): Promise<RemediationTimelineResponse> => {
      const res = await request<RemediationTimelineResponse>(`/remediation/history?days=${days}`)
      return res ?? { period_days: days, summary: { total_prs: 0, merged: 0, failed: 0, in_progress: 0, success_rate: null }, items: [] }
    },
  },

  queues: {
    list: async (filters?: { compliance?: string; lifecycle?: string; type?: string; search?: string }): Promise<QueueSummary[]> => {
      const res = await request<ApiQueueSummaryItem[]>('/queues', {
        params: {
          compliance: filters?.compliance && filters.compliance !== 'all' ? filters.compliance : undefined,
          lifecycle: filters?.lifecycle && filters.lifecycle !== 'all' ? filters.lifecycle : undefined,
          type: filters?.type && filters.type !== 'all' ? filters.type : undefined,
          search: filters?.search || undefined,
        },
        optional: true,
      })
      return (res ?? []).map(mapQueueSummary)
    },
    scorecard: async (id: string): Promise<QueueScorecard | null> => {
      const res = await request<ApiQueueScorecardItem>(`/queues/${id}/scorecard`, { optional: true })
      return res ? mapQueueScorecard(res) : null
    },
    thresholds: async (id: string): Promise<QueueThresholds | null> => {
      const res = await request<ApiQueueThresholdsItem>(`/queues/${id}/thresholds`, { optional: true })
      return res ? mapQueueThresholds(res) : null
    },
    suggestions: async (id: string): Promise<QueueLinkSuggestion[]> => {
      const res = await request<ApiQueueLinkSuggestion[]>(`/queues/${id}/suggestions`, { optional: true })
      return (res ?? []).map(mapQueueLinkSuggestion)
    },
    services: async (): Promise<ServiceOption[]> => {
      const res = await request<ApiServiceOption[]>('/queues/services', { optional: true })
      return (res ?? []).map(mapServiceOption)
    },
    link: async (id: string, serviceDefinitionId: number): Promise<void> => {
      await request<null>(`/queues/${id}/link`, { method: 'POST', body: { serviceDefinitionId } })
    },
  },

  reliability: {
    // Abordagem A (titlis-ui): puxa a árvore inteira de uma vez (depth=all) e navega in-memory.
    tree: async (depth: string = 'all', root?: string): Promise<ReliabilityNode | null> => {
      const res = await request<ApiReliabilityNode>('/reliability/tree', {
        params: { depth, root: root || undefined },
        optional: true,
      })
      return res ? mapReliabilityNode(res) : null
    },
    serviceFindings: async (serviceDefinitionId: string): Promise<ReliabilityFinding[]> => {
      const res = await request<ApiReliabilityFinding[]>(`/reliability/services/${serviceDefinitionId}/findings`, { optional: true })
      return (res ?? []).map(mapReliabilityFinding)
    },
    trend: async (root?: string, days = 14): Promise<ReliabilityTrendPoint[]> => {
      const res = await request<ApiReliabilityTrendPoint[]>('/reliability/trend', {
        params: { root: root || undefined, days: String(days) },
        optional: true,
      })
      return (res ?? []).map((p) => ({ date: p.date, ri: p.ri ?? 0 }))
    },
    evolution: async (root?: string, days = 30): Promise<ReliabilityEvolution | null> => {
      const res = await request<ApiReliabilityEvolution>('/reliability/evolution', {
        params: { root: root || undefined, days: String(days) },
        optional: true,
      })
      return res ? mapReliabilityEvolution(res) : null
    },
  },

  datadogSettings: {
    get: async (): Promise<DatadogQueueSettings> => {
      const res = await request<ApiDatadogQueueSettings>('/settings/datadog', { optional: true })
      return res ? mapDatadogSettings(res) : {
        configured: false,
        hasAppKey: false,
        site: 'datadoghq.com',
        queueMonitoringEnabled: false,
        monitorCreationEnabled: false,
        lastCollectedAt: null,
        activeMonitorCount: 0,
        queuesByState: { discovering: 0, learning: 0, monitoring: 0 },
        probeStatus: 'not_configured' as const,
      }
    },
    save: async (payload: { ddApiKey?: string; ddAppKey?: string; ddSite?: string; queueMonitoringEnabled?: boolean; monitorCreationEnabled?: boolean }): Promise<void> => {
      await request('/settings/datadog', { method: 'PUT' as const, body: payload })
    },
    test: async (): Promise<{ ok: boolean; message: string }> => {
      const res = await request<{ ok: boolean; message: string }>('/settings/datadog/test', { optional: true })
      return res ?? { ok: false, message: 'Sem resposta do servidor.' }
    },
  },

  labelRegistry: {
    list: async (): Promise<LabelRegistryEntry[]> => {
      const res = await request<ApiLabelRegistryEntry[]>('/settings/labels', { optional: true })
      return (res ?? []).map(mapLabelRegistryEntry)
    },
    add: async (labelKey: string, labelValue: string): Promise<LabelRegistryEntry> => {
      const res = await request<ApiLabelRegistryEntry>('/settings/labels', {
        method: 'POST' as const,
        body: { label_key: labelKey, label_value: labelValue },
      })
      if (!res) throw new Error('Não foi possível adicionar o valor.')
      return mapLabelRegistryEntry(res)
    },
    remove: async (id: number): Promise<void> => {
      await request(`/settings/labels/${id}`, { method: 'DELETE' as const })
    },
  },

  coverage: {
    list: async (): Promise<CoverageScorecard[]> => {
      const res = await request<ApiCoverageScorecard[]>('/coverage', { optional: true })
      return (res ?? []).map(mapCoverageScorecard)
    },
    topRisks: async (limit = 10): Promise<CoverageScorecard[]> => {
      const res = await request<ApiCoverageScorecard[]>('/coverage/top-risks', {
        params: { limit: String(limit) },
        optional: true,
      })
      return (res ?? []).map(mapCoverageScorecard)
    },
    detail: async (uid: string): Promise<CoverageScorecard | null> => {
      const res = await request<ApiCoverageScorecard>(`/coverage/${encodeURIComponent(uid)}`, { optional: true })
      return res ? mapCoverageScorecard(res) : null
    },
    graph: async (uid: string): Promise<CoverageGraph> => {
      const res = await request<CoverageGraph>(`/coverage/${encodeURIComponent(uid)}/graph`, { optional: true })
      return res ?? { workloadUid: uid, neighbors: [] }
    },
  },

  // H1/H2 — service-map do hub (produto → squad → serviço → score + bucket de órfãos).
  serviceMap: {
    get: async (): Promise<ServiceMap> => {
      const res = await request<ServiceMap>('/service-map', { optional: true })
      return res ?? { products: [], orphans: [] }
    },
  },

  admin: {
    overview: async (): Promise<AdminOverview> => {
      const res = await request<AdminOverview>('/admin/overview')
      if (!res) throw new Error('Sem dados de visão executiva.')
      return res
    },
    users: async (): Promise<AdminUsersResponse> => {
      const res = await request<AdminUsersResponse>('/admin/users')
      return res ?? { users: [] }
    },
    updateUserRole: async (userId: number, role: 'admin' | 'viewer'): Promise<void> => {
      await request(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: { role },
      })
    },
  },
}
