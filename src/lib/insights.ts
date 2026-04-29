import type {
  ClusterSummary,
  NamespaceSummary,
  PlatformSummary,
  ScoreBucket,
  WorkloadSummary,
} from '@/types'

function hasScore(workload: WorkloadSummary) {
  return workload.overallScore !== null
}

export function buildPlatformSummary(workloads: WorkloadSummary[]): PlatformSummary {
  const scored = workloads.filter(hasScore)
  const totalScore = scored.reduce((sum, workload) => sum + (workload.overallScore ?? 0), 0)

  return {
    totalWorkloads: workloads.length,
    averageScore: scored.length > 0 ? totalScore / scored.length : 0,
    scoredWorkloads: scored.length,
    unscoredWorkloads: workloads.length - scored.length,
    compliantCount: workloads.filter(workload => workload.complianceStatus === 'COMPLIANT').length,
    nonCompliantCount: workloads.filter(workload => workload.complianceStatus === 'NON_COMPLIANT').length,
    remediatedCount: workloads.filter(workload => workload.remediationStatus !== null).length,
    clusters: new Set(workloads.map(workload => workload.cluster)).size,
    namespaces: new Set(workloads.map(workload => `${workload.cluster}:${workload.namespace}`)).size,
  }
}

export function buildScoreBuckets(workloads: WorkloadSummary[]): ScoreBucket[] {
  const buckets = [
    { label: 'Excelente', value: 0, color: '#16a34a' },
    { label: 'Bom', value: 0, color: 'var(--color-primary-strong)' },
    { label: 'Atenção', value: 0, color: 'var(--color-primary)' },
    { label: 'Crítico', value: 0, color: '#dc2626' },
    { label: 'Sem score', value: 0, color: '#94a3b8' },
  ]

  workloads.forEach(workload => {
    if (workload.overallScore === null) {
      buckets[4].value += 1
      return
    }

    if (workload.overallScore >= 90) {
      buckets[0].value += 1
      return
    }

    if (workload.overallScore >= 80) {
      buckets[1].value += 1
      return
    }

    if (workload.overallScore >= 70) {
      buckets[2].value += 1
      return
    }

    buckets[3].value += 1
  })

  return buckets.filter(bucket => bucket.value > 0)
}

export function buildClusterSummaries(workloads: WorkloadSummary[]): ClusterSummary[] {
  const groups = new Map<string, WorkloadSummary[]>()

  workloads.forEach(workload => {
    const key = `${workload.cluster}:${workload.environment}`
    const current = groups.get(key) ?? []
    current.push(workload)
    groups.set(key, current)
  })

  return Array.from(groups.entries())
    .map(([key, clusterWorkloads]) => {
      const scored = clusterWorkloads.filter(hasScore)
      const averageScore = scored.length > 0
        ? scored.reduce((sum, workload) => sum + (workload.overallScore ?? 0), 0) / scored.length
        : null

      return {
        key,
        cluster: clusterWorkloads[0].cluster,
        environment: clusterWorkloads[0].environment,
        workloadCount: clusterWorkloads.length,
        scoredWorkloads: scored.length,
        averageScore,
        compliantCount: clusterWorkloads.filter(workload => workload.complianceStatus === 'COMPLIANT').length,
        nonCompliantCount: clusterWorkloads.filter(workload => workload.complianceStatus === 'NON_COMPLIANT').length,
        remediatedCount: clusterWorkloads.filter(workload => workload.remediationStatus !== null).length,
        namespaces: new Set(clusterWorkloads.map(workload => workload.namespace)).size,
      }
    })
    .sort((left, right) => {
      const rightScore = right.averageScore ?? -1
      const leftScore = left.averageScore ?? -1
      if (rightScore !== leftScore) return rightScore - leftScore
      return right.workloadCount - left.workloadCount
    })
}

export function buildNamespaceSummaries(workloads: WorkloadSummary[]): NamespaceSummary[] {
  const groups = new Map<string, WorkloadSummary[]>()

  workloads.forEach(workload => {
    const key = `${workload.cluster}:${workload.namespace}`
    const current = groups.get(key) ?? []
    current.push(workload)
    groups.set(key, current)
  })

  return Array.from(groups.entries())
    .map(([key, namespaceWorkloads]) => {
      const scored = namespaceWorkloads.filter(hasScore)
      const averageScore = scored.length > 0
        ? scored.reduce((sum, workload) => sum + (workload.overallScore ?? 0), 0) / scored.length
        : null

      return {
        key,
        namespace: namespaceWorkloads[0].namespace,
        cluster: namespaceWorkloads[0].cluster,
        environment: namespaceWorkloads[0].environment,
        workloadCount: namespaceWorkloads.length,
        averageScore,
        openRemediations: namespaceWorkloads.filter(workload => workload.remediationStatus !== null).length,
        nonCompliantCount: namespaceWorkloads.filter(workload => workload.complianceStatus === 'NON_COMPLIANT').length,
      }
    })
    .sort((left, right) => right.workloadCount - left.workloadCount)
}

export function buildRemediationQueue(workloads: WorkloadSummary[]): WorkloadSummary[] {
  return workloads
    .filter(workload => workload.remediationStatus !== null || workload.complianceStatus === 'NON_COMPLIANT')
    .sort((left, right) => {
      const leftScore = left.overallScore ?? -1
      const rightScore = right.overallScore ?? -1
      return leftScore - rightScore
    })
}

export function buildCriticalWorkloads(workloads: WorkloadSummary[]): WorkloadSummary[] {
  return workloads
    .filter(workload => workload.overallScore === null || workload.overallScore < 80 || workload.complianceStatus === 'NON_COMPLIANT')
    .sort((left, right) => {
      const leftScore = left.overallScore ?? -1
      const rightScore = right.overallScore ?? -1
      return leftScore - rightScore
    })
}
