import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useDashboardWorkloads(cluster?: string) {
  return useQuery({
    queryKey: ['dashboard', cluster],
    queryFn: () => api.dashboard.list(cluster),
  })
}

export function useWorkloadScorecard(id: string) {
  return useQuery({
    queryKey: ['workload', id, 'scorecard'],
    queryFn: () => api.workloads.scorecard(id),
    enabled: Boolean(id),
  })
}

export function useWorkloadRemediation(id: string) {
  return useQuery({
    queryKey: ['workload', id, 'remediation'],
    queryFn: () => api.workloads.remediation(id),
    enabled: Boolean(id),
  })
}

export function useSloLookup(namespace: string, name: string, enabled: boolean) {
  return useQuery({
    queryKey: ['slo', namespace, name],
    queryFn: () => api.slos.lookup(namespace, name),
    enabled,
    retry: false,
  })
}

export function useSloCatalog(namespace?: string, cluster?: string) {
  return useQuery({
    queryKey: ['slos', namespace ?? '', cluster ?? ''],
    queryFn: () => api.slos.list({ namespace, cluster }),
  })
}

export function useAiConfig() {
  return useQuery({
    queryKey: ['ai-config'],
    queryFn: () => api.aiConfig.get(),
    retry: false,
  })
}
