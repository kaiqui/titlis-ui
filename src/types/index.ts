export type Severity = 'critical' | 'error' | 'warning' | 'info'

export type LifecycleState = 'DISCOVERING' | 'LEARNING' | 'MONITORING'

export interface QueueSummary {
  id: string
  provider: string
  externalId: string
  displayName: string
  projectId: string | null
  topicId: string | null
  isDlq: boolean
  lifecycleState: LifecycleState
  observationCount: number
  learningTarget: number
  overallScore: number | null
  complianceStatus: string | null
  sendMessageCountRate: number | null
  pullMessageCountRate: number | null
  lastSeenAt: string | null
  serviceDefinitionId: number | null
  serviceName: string | null
  team: string | null
  linkSource: string | null
  suggestionCount: number
}

export interface QueueLinkSuggestion {
  serviceDefinitionId: number
  serviceName: string
  team: string | null
  confidence: number
  source: string
}

export interface ServiceOption {
  serviceDefinitionId: number
  serviceName: string
  team: string | null
}

export interface ReliabilityNode {
  path: string
  kind: string // estate | product | team | service
  name: string
  ri: number | null
  debt: number
  weight: number
  coverage: number
  scoredLeaves: number
  totalLeaves: number
  criticalBreach: boolean
  hasChildren: boolean
  children: ReliabilityNode[]
}

export interface ReliabilityFinding {
  leafKind: string // workload | queue
  leafName: string
  workloadUid: string | null
  ruleId: string
  pillar: string | null
  severity: string | null
  message: string | null
  actualValue: string | null
  debt: number
  riGainService: number
  remediable: boolean
  outcome: string // pass | fail | na
}

export interface ReliabilityTrendPoint {
  date: string
  ri: number
}

export interface ReliabilityOpportunity {
  ruleId: string
  pillar: string | null
  severity: string | null
  occurrences: number
  debt: number
  riGain: number
  remediable: boolean
  message: string | null
}

export interface ReliabilityProjection {
  potentialRi: number | null
  remediableDebt: number
  totalDebt: number
  opportunities: ReliabilityOpportunity[]
}

export interface ReliabilityMover {
  path: string
  kind: string // product | team | service | workload
  name: string
  riStart: number | null
  riEnd: number | null
  delta: number | null
}

export interface ReliabilityEvolution {
  root: string
  days: number
  current: ReliabilityNode
  trend: ReliabilityTrendPoint[]
  projection: ReliabilityProjection
  movers: ReliabilityMover[]
}

export interface QueueThresholds {
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

export interface QueueFinding {
  ruleId: string
  ruleName: string
  pillar: string
  severity: Severity
  passed: boolean
  message: string | null
  actualValue: string | null
}

export interface QueueScorecard {
  queueId: string
  overallScore: number | null
  complianceStatus: string | null
  totalRules: number
  passedRules: number
  failedRules: number
  criticalFailures: number
  errorCount: number
  warningCount: number
  evaluatedAt: string | null
  pillarScores: PillarScore[]
  findings: QueueFinding[]
}

export interface DatadogQueueSettings {
  configured: boolean
  hasAppKey: boolean
  site: string
  queueMonitoringEnabled: boolean
  monitorCreationEnabled: boolean
  lastCollectedAt: string | null
  activeMonitorCount: number
  queuesByState: { discovering: number; learning: number; monitoring: number }
  probeStatus: 'ok' | 'error' | 'not_configured'
}

export interface RemediationDiffFile {
  path: string
  current: string
  patched: string
  isNew: boolean
}

export interface ServiceYamlPrefill {
  name: string
  team: string
  namePattern: string
  namespaces: string[]
  env: string
  path: string
  baseBranch: string
}

export interface PillarScore {
  pillar: string
  score: number | null
  passedChecks: number
  failedChecks: number
  weightedScore: number | null
}

export interface Finding {
  ruleId: string
  ruleName: string
  pillar: string
  severity: Severity
  ruleType: string
  weight: number | null
  passed: boolean
  message: string | null
  actualValue: string | null
  remediable: boolean
  remediationCategory: string | null
  evaluatedAt: string | null
  remediationPending: boolean
  remediationPrUrl: string | null
}

export interface ActiveRemediation {
  status: string
  prUrl: string | null
  prNumber: number | null
  pendingRuleIds: string[]
}

export interface AiConfig {
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

export interface WorkloadSummary {
  id: string
  name: string
  namespace: string
  cluster: string
  environment: string
  overallScore: number | null
  complianceStatus: string | null
  remediationStatus: string | null
  githubPrUrl: string | null
  isFavorite: boolean
}

export interface WorkloadDetail extends WorkloadSummary {
  kind: string | null
  version: number | null
  evaluatedAt: string | null
  totalRules: number
  passedRules: number
  failedRules: number
  criticalFailures: number
  errorCount: number
  warningCount: number
  pillarScores: PillarScore[]
  validationResults: Finding[]
  activeRemediation: ActiveRemediation | null
}

export interface RemediationDetail {
  status: string
  version: number
  githubPrUrl: string | null
  githubPrNumber: number | null
  triggeredAt: string | null
}

export interface SloLookupResult {
  namespace: string
  name: string
  sloConfigId: string
  sloType: string
  timeframe: string
  target: number | null
  datadogSloId: string | null
  datadogSloState: string | null
  detectedFramework: string | null
  detectionSource: string | null
  lastSyncAt: string | null
}

export interface SloListItem extends SloLookupResult {
  cluster: string
  environment: string
  warning: number | null
  syncError: string | null
  autoDetectFramework: boolean
}

export type SloStatus = 'WITH_SLO' | 'CANDIDATE' | 'NO_DATADOG'

export interface WorkloadSLOCoverage {
  workloadId: string
  name: string
  k8sUid: string | null
  namespace: string
  cluster: string
  environment: string
  sloStatus: SloStatus
  sloConfigId: string | null
  datadogSloState: string | null
  lastSyncAt: string | null
  ddGitRepositoryUrl: string | null
}

// SLO pré-existente no Datadog (Discovery Engine do operator-go), ainda não adotado para
// gestão completa pelo Titlis — ver GET /slos/discovered e POST /slos/adopt.
export interface DiscoveredSlo {
  datadogSloId: string
  name: string
  type: string | null
  tags: Record<string, string | null>
  workloadUid: string | null
  workloadName: string | null
  namespace: string | null
  cluster: string | null
  lastSeenAt: string
}

export interface PlatformSummary {
  totalWorkloads: number
  averageScore: number
  scoredWorkloads: number
  unscoredWorkloads: number
  compliantCount: number
  nonCompliantCount: number
  remediatedCount: number
  clusters: number
  namespaces: number
}

export interface ScoreBucket {
  label: string
  value: number
  color: string
}

export interface ClusterSummary {
  key: string
  cluster: string
  environment: string
  workloadCount: number
  scoredWorkloads: number
  averageScore: number | null
  compliantCount: number
  nonCompliantCount: number
  remediatedCount: number
  namespaces: number
}

export interface NamespaceSummary {
  key: string
  namespace: string
  cluster: string
  environment: string
  workloadCount: number
  averageScore: number | null
  openRemediations: number
  nonCompliantCount: number
}

export interface AdminComplianceStats {
  averageScore: number
  compliancePercent: number
  totalWorkloads: number
  compliantWorkloads: number
  criticalWorkloads: number
  totalCriticalFailures: number
  workloadsWithoutEvaluation: number
}

export interface AdminRemediationStats {
  totalAutomated: number
  merged: number
  inProgress: number
  failed: number
  successRate: number
}

export interface AdminPillarScore {
  pillar: string
  averageScore: number
}

export interface AdminUserStats {
  total: number
  activeLastThirtyDays: number
  neverAccessed: number
  byRole: Record<string, number>
}

export interface AdminAiStats {
  isConfigured: boolean
  provider: string | null
  model: string | null
  tokensUsedMonth: number
  monthlyTokenBudget: number | null
  usagePercent: number | null
}

export interface AdminOverview {
  compliance: AdminComplianceStats
  remediations: AdminRemediationStats
  pillars: AdminPillarScore[]
  users: AdminUserStats
  ai: AdminAiStats
}

export interface AdminUser {
  id: number
  email: string
  displayName: string | null
  role: string
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

export interface AdminUsersResponse {
  users: AdminUser[]
}

export interface IncidentItem {
  id: string
  workloadId: string
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  status: 'active' | 'investigating' | 'mitigated'
  service: string
  cluster: string
  namespace: string
  environment: string
  score: number | null
  summary: string
  impact: string
  owner: string
  startedAt: string
  source: 'scorecard' | 'remediation'
  runbookUrl: string | null
  githubPrUrl: string | null
  evidence: string[]
  actions: string[]
}

export interface CoverageDimension {
  pillar: string
  evaluable: number
  passed: number
  na: number
  pct: number
  maturityLevel: number
}

export interface CoverageFinding {
  code: string
  pillar: string
  severity: string
  outcome: string
  message: string
}

export interface CoverageScorecard {
  workloadUid: string
  serviceName: string | null
  cluster: string | null
  trustScore: number | null
  maturity: number
  dimensions: CoverageDimension[]
  findings: CoverageFinding[]
  evaluatedAt: string
}

// Service-map do hub (H1/H2): produto → squad → serviço → workload (+ bucket de órfãos).
export interface ServiceMapWorkload {
  workloadUid: string
  name: string
  cluster: string | null
  score: number | null
  maturity: number
  tags: string[]
  environment: string | null
}

export interface ServiceMapService {
  serviceDefinitionId: number
  serviceName: string
  repoUrl: string | null
  score: number | null
  workloads: ServiceMapWorkload[]
}

export interface ServiceMapSquad {
  team: string
  score: number | null
  services: ServiceMapService[]
}

export interface ServiceMapProduct {
  product: string
  score: number | null
  squads: ServiceMapSquad[]
}

export interface ServiceMap {
  products: ServiceMapProduct[]
  orphans: ServiceMapWorkload[]
}

// U6 — correlação por grafo (blast radius) do serviço.
export interface CoverageGraphNeighbor {
  provider: string
  kind: string
  name: string
  relation: string
  via: string | null
}

export interface CoverageGraph {
  workloadUid: string
  neighbors: CoverageGraphNeighbor[]
}
