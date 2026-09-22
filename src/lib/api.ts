import type {
  AdminOverview,
  AdminUsersResponse,
  AiConfig,
  AiUsageSummary,
  DatadogQueueSettings,
  Finding,
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
  Severity,
  SloListItem,
  DiscoveredSlo,
  CoverageGraph,
  CoverageScorecard,
  ServiceMap,
  EstateNode,
  LookoutBriefing,
  LookoutChatMessage,
  LookoutChatReply,
  LookoutChatSession,
  LookoutPendingMcpAction,
  LookoutPlaybook,
  LookoutSkill,
  LookoutServiceContext,
  LookoutSeals,
  PostureTrendPoint,
  SloLookupResult,
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

function mapSeverity(value: string): Finding['severity'] {
  const normalized = value.toLowerCase()
  if (normalized === 'critical') return 'critical'
  if (normalized === 'error') return 'error'
  if (normalized === 'warning') return 'warning'
  return 'info'
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

interface ApiDiscoveredSlo {
  datadog_slo_id: string
  name: string
  type: string | null
  tags: Record<string, string | null>
  workload_uid: string | null
  workload_name: string | null
  namespace: string | null
  cluster: string | null
  last_seen_at: string
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

function buildAuthHeaders(hasBody: boolean): Record<string, string> {
  const token = getStoredAccessToken()
  const authMode = getAuthMode()
  const devAuth = getDevAuthConfig()
  const oktaTenantSlug = readStoredSession()?.provider === 'okta'
    ? (readStoredSession()?.user.tenantSlug || getPendingOktaTenantSlug())
    : null
  return {
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
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

  const response = await fetch(url.toString(), {
    method: options?.method ?? 'GET',
    headers: buildAuthHeaders(Boolean(options?.body)),
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
  try {
    return JSON.parse(text) as T
  } catch {
    const snippet = text.slice(0, 200).replace(/\s+/g, ' ').trim()
    throw new Error(
      `Resposta não-JSON de ${options?.method ?? 'GET'} ${url.toString()} (HTTP ${response.status}, content-type "${response.headers.get('content-type') ?? 'desconhecido'}"): ${snippet}`,
    )
  }
}

// Leitura de SSE via fetch() + ReadableStream (não EventSource — precisamos de POST + headers de
// auth custom, que EventSource não suporta). Chama `onDelta` a cada evento `delta` e resolve com
// o payload do evento `done`.
async function streamSse<TDone>(path: string, body: unknown, onDelta: (data: string) => void): Promise<TDone> {
  const url = buildUrl(path)
  const response = await fetch(url.toString(), { method: 'POST', headers: buildAuthHeaders(true), body: JSON.stringify(body) })
  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `API error ${response.status}`)
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let event = 'message'
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line.startsWith('event:')) {
        event = line.slice(6).trim()
      } else if (line.startsWith('data:')) {
        const data = line.slice(5).trim()
        if (event === 'delta') onDelta(data)
        else if (event === 'done') return JSON.parse(data) as TDone
        else if (event === 'error') throw new Error(data)
      }
    }
  }
  throw new Error('stream encerrou sem evento "done"')
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

function mapDiscoveredSlo(item: ApiDiscoveredSlo): DiscoveredSlo {
  return {
    datadogSloId: item.datadog_slo_id,
    name: item.name,
    type: item.type,
    tags: item.tags ?? {},
    workloadUid: item.workload_uid,
    workloadName: item.workload_name,
    namespace: item.namespace,
    cluster: item.cluster,
    lastSeenAt: item.last_seen_at,
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

export interface DailyCostPoint {
  date: string
  totalCost: number
}

export interface CostSummary {
  days: number
  currency: string
  totalCost: number
  previousTotalCost: number
  variationPct: number | null
  dailyCosts: DailyCostPoint[]
  configured: boolean
  lastCollectionAt: string | null
}

export interface TeamCost {
  team: string
  totalCost: number
  sharePct: number
  workloadCount: number
  dailyCosts: DailyCostPoint[]
}

export interface TeamCostsResponse {
  days: number
  currency: string
  totalCost: number
  teams: TeamCost[]
}

export interface WorkloadCost {
  workloadId: number
  workloadName: string
  namespace: string
  clusterName: string
  team: string | null
  totalCost: number
  avgDailyCost: number
  daysWithData: number
  // docs/todo/cost-pillar-plan.md §2 — proveniência da coleta (k8s hoje; provider "gcp-*" hoje).
  infraKind: string
  provider: string
}

export interface WorkloadCostsResponse {
  days: number
  currency: string
  totalCost: number
  workloads: WorkloadCost[]
}

export interface CostSettingsStatus {
  enabled: boolean
  enabledAt: string | null
  enabledByEmail: string | null
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

interface ApiCoverageDimension {
  pillar: string
  dimension?: string
  label?: string
  question?: string
  evaluable?: number
  passed?: number
  na?: number
  pct?: number
  strength?: number
  band?: string
  confidence?: string
  maturity_level?: number
  evidence?: Array<{ message?: string; source?: string; outcome?: string }>
}

interface ApiCoverageFinding {
  code: string
  pillar?: string
  dimension?: string
  severity?: string
  outcome?: string
  message?: string
  source?: string
  cost_impact_usd_month?: number
}

interface ApiCoverageScorecard {
  workloadUid: string
  serviceName?: string | null
  cluster?: string | null
  trustScore?: number | null
  confidence?: string | null
  uncertainty?: number | null
  maturity?: number
  dimensions?: ApiCoverageDimension[]
  findings?: ApiCoverageFinding[]
  moves?: Array<{ rank?: number; dimension?: string; code?: string; description?: string; lift?: number; is_remediable?: boolean }>
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
    confidence: item.confidence ?? null,
    uncertainty: item.uncertainty ?? null,
    maturity: deriveCoverageMaturity(item),
    dimensions: (item.dimensions ?? []).map((d) => ({
      pillar: d.pillar,
      dimension: d.dimension ?? d.pillar,
      label: d.label,
      question: d.question,
      evaluable: d.evaluable ?? 0,
      passed: d.passed ?? 0,
      na: d.na ?? 0,
      pct: d.pct ?? 0,
      strength: d.strength ?? d.pct ?? 0,
      band: d.band,
      confidence: d.confidence,
      maturityLevel: d.maturity_level ?? 0,
      evidence: (d.evidence ?? []).map((e) => ({
        message: e.message ?? '',
        source: e.source ?? '',
        outcome: e.outcome ?? '',
      })),
    })),
    findings: (item.findings ?? []).map((f) => ({
      code: f.code,
      pillar: f.pillar ?? '',
      dimension: f.dimension,
      severity: f.severity ?? '',
      outcome: (f.outcome ?? '').toLowerCase(),
      message: f.message ?? '',
      source: f.source,
      cost_impact_usd_month: f.cost_impact_usd_month,
    })),
    moves: (item.moves ?? []).map((m) => ({
      rank: m.rank ?? 0,
      dimension: m.dimension ?? '',
      code: m.code ?? '',
      description: m.description ?? '',
      lift: m.lift ?? 0,
      isRemediable: m.is_remediable ?? false,
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
    discovered: async (): Promise<DiscoveredSlo[]> => {
      const res = await request<ApiDiscoveredSlo[]>('/slos/discovered', { optional: true })
      return (res ?? []).map(mapDiscoveredSlo)
    },
    adopt: async (payload: { datadogSloId: string; workloadId?: number; namespace?: string }): Promise<void> => {
      await request('/slos/adopt', {
        method: 'POST' as const,
        body: payload,
      })
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
    // Rota legada de compatibilidade (settingsInsights.ts no titlis-api-ts): espera `site` solto
    // no body, não `ddSite`. NÃO confundir com datadogSettings.save (PUT em settingsDatadog.ts,
    // que usa `ddSite`) — são dois handlers HTTP diferentes no mesmo path.
    save: async (payload: { ddApiKey: string; ddAppKey?: string; site?: string }): Promise<void> => {
      await request('/settings/datadog', {
        method: 'POST' as const,
        body: payload,
      })
    },
    // GET /settings/datadog/status NUNCA faz probe de verdade — só diz se existe credencial salva
    // (probeStatus fica 'not_checked'/'not_configured', nunca 'ok'/'error'). Para saber se a
    // credencial funciona de fato, use datadogSettings.test() (GET /settings/datadog/test).
    status: async (): Promise<DatadogConfigStatus> => {
      const res = await request<DatadogConfigStatus>('/settings/datadog/status', { optional: true })
      return res ?? { configured: false, probeStatus: 'not_configured' }
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
    // GET /settings/datadog/test (settingsDatadog.ts) — único endpoint que faz probe de verdade
    // contra a API do Datadog. Responde { ok: true } ou { ok: false, error }, nunca `message`.
    test: async (): Promise<{ ok: boolean; message: string }> => {
      const res = await request<{ ok: boolean; error?: string }>('/settings/datadog/test')
      if (!res) return { ok: false, message: 'Sem resposta do servidor.' }
      return { ok: res.ok, message: res.ok ? 'Conexão com o Datadog verificada com sucesso.' : (res.error ?? 'Falha ao validar as credenciais.') }
    },
  },

  // Veracode (SAST/SCA/DAST) — amplia o pilar de Segurança via VeracodeProvider do operator.
  // Credenciais write-only: a resposta de GET nunca traz as chaves em claro.
  veracodeSettings: {
    get: async (): Promise<{ hasApiId: boolean; hasApiKey: boolean }> => {
      const res = await request<{ hasApiId: boolean; hasApiKey: boolean }>('/settings/veracode', { optional: true })
      return res ?? { hasApiId: false, hasApiKey: false }
    },
    save: async (payload: { veracodeApiId?: string; veracodeApiKey?: string }): Promise<void> => {
      await request('/settings/veracode', { method: 'PUT' as const, body: payload })
    },
  },

  // docs/todo/lookout-chat-plan.md §2.4 — credencial do servidor MCP do Grafana do tenant
  // (ConfAI/Argus consulta via sessão MCP, mesmo padrão do Datadog).
  grafanaSettings: {
    get: async (): Promise<{ hasMcpUrl: boolean; hasApiKey: boolean }> => {
      const res = await request<{ hasMcpUrl: boolean; hasApiKey: boolean }>('/settings/grafana', { optional: true })
      return res ?? { hasMcpUrl: false, hasApiKey: false }
    },
    save: async (payload: { grafanaMcpUrl?: string; grafanaApiKey?: string }): Promise<void> => {
      await request('/settings/grafana', { method: 'PUT' as const, body: payload })
    },
  },

  costs: {
    summary: async (days = 30): Promise<CostSummary> => {
      const res = await request<CostSummary>('/costs/summary', {
        params: { days: String(days) },
        optional: true,
      })
      return res ?? {
        days, currency: 'USD', totalCost: 0, previousTotalCost: 0, variationPct: null,
        dailyCosts: [], configured: false, lastCollectionAt: null,
      }
    },
    teams: async (days = 30): Promise<TeamCostsResponse> => {
      const res = await request<TeamCostsResponse>('/costs/teams', {
        params: { days: String(days) },
        optional: true,
      })
      return res ?? { days, currency: 'USD', totalCost: 0, teams: [] }
    },
    workloads: async (days = 30, team?: string, namespace?: string): Promise<WorkloadCostsResponse> => {
      const res = await request<WorkloadCostsResponse>('/costs/workloads', {
        params: { days: String(days), team, namespace },
        optional: true,
      })
      return res ?? { days, currency: 'USD', totalCost: 0, workloads: [] }
    },
  },

  costSettings: {
    // Opt-in explícito (admin) — a estimativa de custo nunca liga sozinha, pode gerar cobrança
    // adicional na fatura Titlis.
    get: async (): Promise<CostSettingsStatus> => {
      const res = await request<CostSettingsStatus>('/settings/cost', { optional: true })
      return res ?? { enabled: false, enabledAt: null, enabledByEmail: null }
    },
    enable: async (): Promise<CostSettingsStatus> => {
      const res = await request<CostSettingsStatus>('/settings/cost/enable', { method: 'POST' as const })
      return res ?? { enabled: false, enabledAt: null, enabledByEmail: null }
    },
    disable: async (): Promise<CostSettingsStatus> => {
      const res = await request<CostSettingsStatus>('/settings/cost/disable', { method: 'POST' as const })
      return res ?? { enabled: false, enabledAt: null, enabledByEmail: null }
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

  // RPM Fase C — ConfAI: mural do analista de confiabilidade (briefings + playbooks + contexto).
  lookout: {
    briefings: async (days = 14): Promise<LookoutBriefing[]> => {
      const res = await request<LookoutBriefing[]>('/lookout/briefings', { params: { days: String(days) }, optional: true })
      return res ?? []
    },
    feedback: async (id: number, verdict: 'util' | 'ruido'): Promise<void> => {
      await request(`/lookout/briefings/${id}/feedback`, { method: 'POST', body: { verdict } })
    },
    playbooks: async (): Promise<LookoutPlaybook[]> => {
      const res = await request<LookoutPlaybook[]>('/lookout/playbooks', { optional: true })
      return res ?? []
    },
    estateReport: async (): Promise<LookoutBriefing | null> => {
      return await request<LookoutBriefing>('/lookout/estate-report/latest', { optional: true })
    },
    serviceContext: async (uid: string): Promise<LookoutServiceContext> => {
      const res = await request<LookoutServiceContext>(`/lookout/service/${encodeURIComponent(uid)}/context`, { optional: true })
      return res ?? { investigations: [], memory: [] }
    },
    seals: async (): Promise<LookoutSeals> => {
      const res = await request<LookoutSeals>('/lookout/seals', { optional: true })
      return res ?? {}
    },
    investigate: async (workloadUid: string): Promise<{ investigation_id?: number; message?: string }> => {
      const res = await request<{ investigation_id?: number; message?: string }>('/lookout/investigate', {
        method: 'POST',
        body: { workloadUid },
      })
      return res ?? {}
    },
    aiUsage: async (days = 30): Promise<AiUsageSummary | null> =>
      request<AiUsageSummary>('/lookout/ai-usage', { params: { days: String(days) }, optional: true }),
    chat: {
      sessions: async (): Promise<LookoutChatSession[]> => {
        const res = await request<LookoutChatSession[]>('/lookout/chat/sessions', { optional: true })
        return res ?? []
      },
      createSession: async (): Promise<number> => {
        const res = await request<{ chatSessionId: number }>('/lookout/chat/sessions', { method: 'POST' })
        if (!res) throw new Error('Não foi possível iniciar a conversa.')
        return res.chatSessionId
      },
      messages: async (chatSessionId: number): Promise<LookoutChatMessage[]> => {
        const res = await request<LookoutChatMessage[]>(`/lookout/chat/sessions/${chatSessionId}`, { optional: true })
        return res ?? []
      },
      send: async (chatSessionId: number, message: string, activeSkills?: string[]): Promise<LookoutChatReply> => {
        const res = await request<LookoutChatReply>(`/lookout/chat/sessions/${chatSessionId}/messages`, {
          method: 'POST',
          body: { message, activeSkills },
        })
        if (!res) throw new Error('O ConfAI não respondeu.')
        return res
      },
      // Fase J — mesmo resultado de `send`, só que `onDelta` é chamado token a token conforme
      // a resposta chega (SSE via fetch()+ReadableStream, não EventSource — precisamos de POST).
      stream: async (
        chatSessionId: number,
        message: string,
        onDelta: (delta: string) => void,
        activeSkills?: string[],
      ): Promise<LookoutChatReply> => {
        type DoneEvent = { message_md: string; tool_trace: LookoutChatReply['toolTrace']; out_of_scope: boolean }
        const done = await streamSse<DoneEvent>(`/lookout/chat/sessions/${chatSessionId}/stream`, { message, activeSkills }, onDelta)
        return { messageMd: done.message_md, toolTrace: done.tool_trace, outOfScope: done.out_of_scope }
      },
    },
    skills: {
      list: async (): Promise<LookoutSkill[]> => {
        const res = await request<LookoutSkill[]>('/lookout/skills', { optional: true })
        return res ?? []
      },
      create: async (input: { title: string; appliesWhen?: string; bodyMd: string; invocationName: string }): Promise<number> => {
        const res = await request<{ playbookId: number }>('/lookout/skills', { method: 'POST', body: input })
        if (!res) throw new Error('Não foi possível criar a skill.')
        return res.playbookId
      },
    },
    mcpActions: {
      list: async (): Promise<LookoutPendingMcpAction[]> => {
        const res = await request<LookoutPendingMcpAction[]>('/lookout/mcp-actions', { optional: true })
        return res ?? []
      },
      approve: async (id: number): Promise<{ ok: boolean; message: string }> => {
        const res = await request<{ ok: boolean; message: string }>(`/lookout/mcp-actions/${id}/approve`, { method: 'POST' })
        return res ?? { ok: false, message: 'sem resposta' }
      },
      reject: async (id: number): Promise<{ ok: boolean; message: string }> => {
        const res = await request<{ ok: boolean; message: string }>(`/lookout/mcp-actions/${id}/reject`, { method: 'POST' })
        return res ?? { ok: false, message: 'sem resposta' }
      },
    },
  },

  hub: {
    // RPM Fase A: rollup do estate sobre a postura. titlis-ui puxa a árvore inteira (depth=all).
    // includeCost (Fase 4 do cost-real-billing-plan.md §3-4) é opt-in — nunca ligado por padrão,
    // pra não pagar a leitura extra de custo em quem não pediu.
    rollup: async (includeCost = false): Promise<EstateNode | null> => {
      return await request<EstateNode>('/hub/rollup', {
        params: { depth: 'all', ...(includeCost ? { includeCost: 'true' } : {}) },
        optional: true,
      })
    },
    trend: async (node = '', days = 30): Promise<PostureTrendPoint[]> => {
      const res = await request<PostureTrendPoint[]>('/hub/trend', { params: { node: node || undefined, days: String(days) }, optional: true })
      return res ?? []
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
