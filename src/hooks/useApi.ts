import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { WorkloadSummary } from '@/types'

export interface QueueFilters {
  compliance?: string
  lifecycle?: string
  type?: string
  search?: string
}

export function useDashboardWorkloads(cluster?: string, tags?: string[]) {
  return useQuery({
    queryKey: ['dashboard', cluster ?? null, tags ?? null],
    queryFn: () => api.dashboard.list(cluster, tags),
  })
}

export function useAvailableTags(resourceType = 'workload') {
  return useQuery({
    queryKey: ['tags-available', resourceType],
    queryFn: () => api.tags.available(resourceType),
    staleTime: 60_000,
  })
}

export function useToggleFavorite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ workloadId, isFavorite }: { workloadId: string; isFavorite: boolean }) =>
      isFavorite ? api.favorites.remove(workloadId) : api.favorites.add(workloadId),
    onMutate: async ({ workloadId, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: ['dashboard'] })
      const previous = queryClient.getQueriesData<WorkloadSummary[]>({ queryKey: ['dashboard'] })
      queryClient.setQueriesData<WorkloadSummary[]>({ queryKey: ['dashboard'] }, old =>
        old?.map(w => w.id === workloadId ? { ...w, isFavorite: !isFavorite } : w),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          queryClient.setQueryData(key, data)
        }
      }
    },
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

export function useWorkloadGithubLink(id: string) {
  return useQuery({
    queryKey: ['workload', id, 'github-link'],
    queryFn: () => api.workloads.githubLink(id),
    enabled: Boolean(id),
    staleTime: 60_000,
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

export function useScoreConfigRules(engine = 'kubernetes') {
  return useQuery({
    queryKey: ['score-config', 'rules', engine],
    queryFn: () => api.scoreConfig.getRules(engine),
    staleTime: 60_000,
  })
}

export function useScoreConfigOverrides(engine = 'kubernetes') {
  return useQuery({
    queryKey: ['score-config', 'overrides', engine],
    queryFn: () => api.scoreConfig.getOverrides(engine),
    staleTime: 30_000,
  })
}

export function useScoreConfigWeights(engine = 'kubernetes') {
  return useQuery({
    queryKey: ['score-config', 'weights', engine],
    queryFn: () => api.scoreConfig.getWeights(engine),
    staleTime: 60_000,
  })
}

export function useClusters() {
  return useQuery({
    queryKey: ['clusters'],
    queryFn: () => api.clusters.list(),
    staleTime: 60_000,
  })
}

export function useNamespaces(clusterId?: number) {
  return useQuery({
    queryKey: ['namespaces', clusterId ?? null],
    queryFn: () => api.namespaces.list(clusterId),
    staleTime: 60_000,
  })
}

export function useWorkloadItems(clusterId?: number, namespaceId?: number) {
  return useQuery({
    queryKey: ['workload-items', clusterId ?? null, namespaceId ?? null],
    queryFn: () => api.workloadItems.list(clusterId, namespaceId),
    staleTime: 30_000,
  })
}

export function useResourceTags(resourceType: string) {
  return useQuery({
    queryKey: ['tags', resourceType],
    queryFn: () => api.tags.list(resourceType),
    staleTime: 30_000,
  })
}

export function useTagPolicies() {
  return useQuery({
    queryKey: ['tag-policies'],
    queryFn: () => api.tagPolicies.list(),
    staleTime: 30_000,
  })
}

export function useAdminOverview() {
  return useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => api.admin.overview(),
    staleTime: 60_000,
  })
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.admin.users(),
    staleTime: 60_000,
  })
}

export function useRemediationHistory(days: number) {
  return useQuery({
    queryKey: ['remediation-history', days],
    queryFn: () => api.remediation.history(days),
    staleTime: 60_000,
  })
}

export function useQueues(filters?: QueueFilters) {
  return useQuery({
    queryKey: ['queues', filters ?? null],
    queryFn: () => api.queues.list(filters),
    staleTime: 30_000,
  })
}

export function useCoverage() {
  return useQuery({
    queryKey: ['coverage'],
    queryFn: () => api.coverage.list(),
    staleTime: 30_000,
  })
}

export function useServiceMap() {
  return useQuery({
    queryKey: ['service-map'],
    queryFn: () => api.serviceMap.get(),
    staleTime: 30_000,
  })
}

export function useHubRollup() {
  return useQuery({
    queryKey: ['hub-rollup'],
    queryFn: () => api.hub.rollup(),
    staleTime: 30_000,
  })
}

export function useCoverageDetail(uid: string) {
  return useQuery({
    queryKey: ['coverage', 'detail', uid],
    queryFn: () => api.coverage.detail(uid),
    enabled: !!uid,
    staleTime: 30_000,
  })
}

export function useCoverageGraph(uid: string) {
  return useQuery({
    queryKey: ['coverage', 'graph', uid],
    queryFn: () => api.coverage.graph(uid),
    enabled: !!uid,
    staleTime: 30_000,
  })
}

export function useCoverageTopRisks(limit = 10) {
  return useQuery({
    queryKey: ['coverage', 'top-risks', limit],
    queryFn: () => api.coverage.topRisks(limit),
    staleTime: 30_000,
  })
}

export function useQueueScorecard(id: string) {
  return useQuery({
    queryKey: ['queue', id, 'scorecard'],
    queryFn: () => api.queues.scorecard(id),
    enabled: Boolean(id),
  })
}

export function useQueueThresholds(id: string) {
  return useQuery({
    queryKey: ['queue', id, 'thresholds'],
    queryFn: () => api.queues.thresholds(id),
    enabled: Boolean(id),
    staleTime: 60_000,
  })
}

export function useQueueSuggestions(id: string) {
  return useQuery({
    queryKey: ['queue', id, 'suggestions'],
    queryFn: () => api.queues.suggestions(id),
    enabled: Boolean(id),
    staleTime: 15_000,
  })
}

export function useServiceOptions() {
  return useQuery({
    queryKey: ['service-options'],
    queryFn: () => api.queues.services(),
    staleTime: 60_000,
  })
}

export function useLinkQueue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, serviceDefinitionId }: { id: string; serviceDefinitionId: number }) =>
      api.queues.link(id, serviceDefinitionId),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['queues'] })
      void queryClient.invalidateQueries({ queryKey: ['queue', id, 'suggestions'] })
    },
  })
}

export function useReliabilityTree() {
  return useQuery({
    queryKey: ['reliability', 'tree', 'all'],
    queryFn: () => api.reliability.tree('all'),
    staleTime: 30_000,
  })
}

export function useServiceFindings(serviceDefinitionId: string) {
  return useQuery({
    queryKey: ['reliability', 'findings', serviceDefinitionId],
    queryFn: () => api.reliability.serviceFindings(serviceDefinitionId),
    enabled: Boolean(serviceDefinitionId),
    staleTime: 15_000,
  })
}

export function useReliabilityTrend(root: string) {
  return useQuery({
    queryKey: ['reliability', 'trend', root],
    queryFn: () => api.reliability.trend(root),
    staleTime: 60_000,
  })
}

export function useReliabilityEvolution(root: string, days: number) {
  return useQuery({
    queryKey: ['reliability', 'evolution', root, days],
    queryFn: () => api.reliability.evolution(root, days),
    staleTime: 60_000,
  })
}

export function useDatadogQueueSettings() {
  return useQuery({
    queryKey: ['datadog-queue-settings'],
    queryFn: () => api.datadogSettings.get(),
    staleTime: 30_000,
  })
}

export function useSaveDatadogSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { ddApiKey?: string; ddAppKey?: string; site?: string; queueMonitoringEnabled?: boolean }) =>
      api.datadogSettings.save(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['datadog-queue-settings'] })
    },
  })
}

export function useTestDatadogConnection() {
  return useMutation({
    mutationFn: () => api.datadogSettings.test(),
  })
}


export function useUpdateUserRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: 'admin' | 'viewer' }) =>
      api.admin.updateUserRole(userId, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
    },
  })
}

