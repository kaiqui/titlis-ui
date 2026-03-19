import type { Application, SLO, SquadSummary, PlatformSummary, RecommendationItem } from '@/types'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1'

async function get<T>(path: string, params?: Record<string, string | boolean | undefined>): Promise<T> {
  const url = new URL(`${BASE}${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v))
    })
  }
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
  return res.json() as Promise<T>
}

export const api = {
  platform: {
    summary: () => get<PlatformSummary>('/platform/summary'),
  },

  applications: {
    list: (params?: {
      search?: string
      namespace?: string
      scoreFilter?: string
      squad?: string
      sortBy?: string
      sortAsc?: boolean
    }) => get<Application[]>('/applications', params as Record<string, string | boolean | undefined>),

    getById: (id: string) => get<Application>(`/applications/${id}`),

    scoreHistory: (id: string) =>
      get<Array<{ date: string; score: number }>>(`/applications/${id}/score-history`),

    namespaces: () => get<string[]>('/applications/namespaces'),
  },

  slos: {
    list: (status?: string) =>
      get<SLO[]>('/slos', status ? { status } : undefined),

    getById: (id: string) => get<SLO>(`/slos/${id}`),

    byService: (service: string) => get<SLO[]>(`/slos/by-service/${service}`),

    compliance: () => get<{ compliancePct: number }>('/slos/compliance'),
  },

  recommendations: {
    list: (params?: { severity?: string; remediableOnly?: boolean }) =>
      get<RecommendationItem[]>('/recommendations', params as Record<string, string | boolean | undefined>),

    grouped: (params?: { severity?: string; remediableOnly?: boolean }) =>
      get<Record<string, RecommendationItem[]>>('/recommendations/grouped', params as Record<string, string | boolean | undefined>),
  },

  squads: {
    list: () => get<SquadSummary[]>('/squads'),
    getBySquad: (squad: string) => get<SquadSummary>(`/squads/${squad}`),
    products: () => get<string[]>('/squads/meta/products'),
    domains: () => get<string[]>('/squads/meta/domains'),
  },
}
