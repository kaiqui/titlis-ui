import type { IncidentItem, WorkloadSummary } from '@/types'

function severityFromWorkload(workload: WorkloadSummary): IncidentItem['severity'] {
  if (workload.overallScore === null || (workload.overallScore ?? 0) < 60) return 'critical'
  if ((workload.overallScore ?? 0) < 75) return 'high'
  if ((workload.overallScore ?? 0) < 85) return 'medium'
  return 'low'
}

function statusFromWorkload(workload: WorkloadSummary): IncidentItem['status'] {
  const remediation = workload.remediationStatus?.toUpperCase()
  if (remediation?.includes('OPEN') || remediation?.includes('IN_PROGRESS') || remediation?.includes('CREATED')) {
    return 'investigating'
  }
  if (workload.complianceStatus === 'NON_COMPLIANT') return 'active'
  return 'mitigated'
}

function ownerFromNamespace(namespace: string) {
  return namespace
    .split('-')
    .slice(0, 2)
    .join('-') || 'plataforma'
}

export function buildIncidents(workloads: WorkloadSummary[]): IncidentItem[] {
  return workloads
    .filter(workload => workload.complianceStatus === 'NON_COMPLIANT' || workload.remediationStatus !== null)
    .sort((left, right) => (left.overallScore ?? -1) - (right.overallScore ?? -1))
    .map(workload => {
      const severity = severityFromWorkload(workload)
      const status = statusFromWorkload(workload)
      const owner = ownerFromNamespace(workload.namespace)
      const score = workload.overallScore

      return {
        id: `incident-${workload.id}`,
        workloadId: workload.id,
        title: `${workload.name} degradado`,
        severity,
        status,
        service: workload.name,
        cluster: workload.cluster,
        namespace: workload.namespace,
        environment: workload.environment,
        score,
        summary: workload.githubPrUrl
          ? 'Existe trilha ativa de correção ligada ao incidente.'
          : 'O workload precisa de investigação técnica e ação do time responsável.',
        impact: workload.complianceStatus === 'NON_COMPLIANT'
          ? 'Risco direto de perda de aderência operacional e aumento de exposição a falhas.'
          : 'Há remediação em andamento; impacto controlado, mas ainda exige acompanhamento.',
        owner,
        startedAt: new Date(Date.now() - ((score ?? 50) * 37_000)).toISOString(),
        source: workload.remediationStatus ? 'remediation' : 'scorecard',
        runbookUrl: null,
        githubPrUrl: workload.githubPrUrl,
        evidence: [
          `Score atual: ${score === null ? 'N/D' : score.toFixed(1)}`,
          `Conformidade: ${workload.complianceStatus ?? 'não informada'}`,
          `Remediação: ${workload.remediationStatus ?? 'sem ação aberta'}`,
        ],
        actions: [
          'Confirmar impacto no serviço e validar janela de degradação.',
          'Definir owner e acompanhar correção até mitigação.',
          workload.githubPrUrl ? 'Monitorar PR vinculado e validar rollout.' : 'Abrir trilha de correção técnica.',
        ],
      }
    })
}
