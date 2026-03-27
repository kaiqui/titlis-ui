import type {
  Finding,
  PillarScore,
  RemediationDetail,
  SloListItem,
  SloLookupResult,
  WorkloadDetail,
  WorkloadSummary,
} from '@/types'

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

async function request<T>(path: string, options?: { params?: Record<string, string | undefined>; optional?: boolean }): Promise<T | null> {
  const url = buildUrl(path)

  Object.entries(options?.params ?? {}).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value)
  })

  const response = await fetch(url.toString())
  if (options?.optional && response.status === 404) return null

  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${await response.text()}`)
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

export const api = {
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
}
