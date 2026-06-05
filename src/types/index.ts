export type Severity = 'critical' | 'error' | 'warning' | 'info'

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
