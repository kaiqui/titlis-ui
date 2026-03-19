import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { SLOStatus } from '@/types'

export function usePlatformSummary() {
  return useQuery({
    queryKey: ['platform', 'summary'],
    queryFn: () => api.platform.summary(),
  })
}

export function useApplications(params?: {
  search?: string
  namespace?: string
  scoreFilter?: string
  squad?: string
  sortBy?: string
  sortAsc?: boolean
}) {
  return useQuery({
    queryKey: ['applications', params],
    queryFn: () => api.applications.list(params),
  })
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: ['applications', id],
    queryFn: () => api.applications.getById(id),
    enabled: !!id,
  })
}

export function useApplicationNamespaces() {
  return useQuery({
    queryKey: ['applications', 'namespaces'],
    queryFn: () => api.applications.namespaces(),
    staleTime: 60_000,
  })
}

export function useSLOs(status?: SLOStatus) {
  return useQuery({
    queryKey: ['slos', status],
    queryFn: () => api.slos.list(status),
  })
}

export function useRecommendations(params?: { severity?: string; remediableOnly?: boolean }) {
  return useQuery({
    queryKey: ['recommendations', params],
    queryFn: () => api.recommendations.grouped(params),
  })
}

export function useSquads() {
  return useQuery({
    queryKey: ['squads'],
    queryFn: () => api.squads.list(),
  })
}
