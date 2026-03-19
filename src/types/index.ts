export type Severity = 'critical' | 'error' | 'warning' | 'info'
export type ScoreStatus = 'excellent' | 'good' | 'warning' | 'critical'
export type SLOStatus = 'healthy' | 'at_risk' | 'breached' | 'no_data'
export type WorkloadKind = 'Deployment' | 'StatefulSet' | 'DaemonSet'

export interface PillarScore {
  score: number
  passedChecks: number
  totalChecks: number
}

export interface Finding {
  ruleId: string
  ruleName: string
  severity: Severity
  message: string
  remediation: string
  remediable: boolean
}

export interface RemediationPR {
  prNumber: number
  prUrl: string
  prBranch: string
  status: 'open' | 'merged' | 'closed'
  issuesFixed: string[]
  createdAt: string
}

export interface Application {
  id: string
  name: string
  namespace: string
  kind: WorkloadKind
  squad: string
  product: string
  domain: string
  owner: string
  techLead: string
  tier: 'tier-1' | 'tier-2' | 'tier-3'
  overallScore: number
  pillarScores: Record<string, PillarScore>
  issues: { critical: number; errors: number; warnings: number }
  findings: Finding[]
  remediationPR?: RemediationPR
  lastEvaluated: string
  monthlyCostUsd?: number
  cpuEfficiencyPct?: number
  memoryEfficiencyPct?: number
  wasteUsd?: number
  sloCount?: number
  sloHealthy?: number
  trend: 'up' | 'down' | 'stable'
  scoreHistory: Array<{ date: string; score: number }>
}

export interface SLO {
  id: string
  name: string
  service: string
  namespace: string
  squad: string
  target: number
  current: number
  status: SLOStatus
  errorBudgetRemaining: number
  framework: 'fastapi' | 'wsgi' | 'aiohttp' | 'custom'
  lastUpdated: string
  burnRate7d: number
  burnRate1h: number
  history: Array<{ date: string; score: number }>
}

export interface SquadSummary {
  squad: string
  product: string
  domain: string
  appCount: number
  avgScore: number
  criticalApps: number
  openPRs: number
  reliabilityScore: number
  securityScore: number
  trend: 'up' | 'down' | 'stable'
}

export interface RecommendationItem {
  appId: string
  appName: string
  namespace: string
  squad: string
  ruleId: string
  ruleName: string
  severity: Severity
  message: string
  remediation: string
  remediable: boolean
  hasPR: boolean
  prUrl?: string
}

export interface PlatformSummary {
  totalApps: number
  avgScore: number
  criticalApps: number
  excellentApps: number
  goodApps: number
  warningApps: number
  openPRs: number
  totalFindings: { critical: number; errors: number; warnings: number }
  sloCompliance: number
  totalMonthlyCost: number
  scoreHistory: Array<{ date: string; score: number; critical: number }>
}
