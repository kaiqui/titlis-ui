export type Severity = 'critical' | 'error' | 'warning' | 'info'

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
  monthlyTokenBudget: number | null
  tokensUsedMonth: number
  isActive: boolean
  hasApiKey: boolean
  hasGithubToken: boolean
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
