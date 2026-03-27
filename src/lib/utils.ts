import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function scoreColor(score: number | null): string {
  if (score === null) return 'text-slate-400'
  if (score >= 90) return 'text-emerald-500'
  if (score >= 80) return 'text-amber-500'
  if (score >= 70) return 'text-orange-500'
  return 'text-red-500'
}

export function scoreLabel(score: number | null): string {
  if (score === null) return 'Sem score'
  if (score >= 90) return 'Excelente'
  if (score >= 80) return 'Bom'
  if (score >= 70) return 'Atenção'
  return 'Crítico'
}

export function scoreBgColor(score: number | null): string {
  if (score === null) return 'bg-slate-500/10 text-slate-500'
  if (score >= 90) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
  if (score >= 80) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
  if (score >= 70) return 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
  return 'bg-red-500/10 text-red-600 dark:text-red-400'
}

export function scoreRingColor(score: number | null): string {
  if (score === null) return '#94a3b8'
  if (score >= 90) return '#16a34a'
  if (score >= 80) return '#f59e0b'
  if (score >= 70) return '#f97316'
  return '#dc2626'
}

export function formatDate(iso?: string | null): string {
  if (!iso) return 'Ainda não sincronizado'

  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatNumber(value: number | null, digits = 1): string {
  if (value === null) return 'N/D'
  return value.toFixed(digits)
}

export function formatEnum(value?: string | null): string {
  if (!value) return 'Não informado'

  return value
    .toLowerCase()
    .split('_')
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ')
}

export function statusTone(value?: string | null): string {
  const normalized = value?.toUpperCase()
  if (!normalized) return 'bg-slate-500/10 text-slate-500'
  if (normalized.includes('NON') || normalized.includes('FAILED') || normalized.includes('ERROR')) {
    return 'bg-red-500/10 text-red-600 dark:text-red-400'
  }
  if (normalized.includes('PENDING') || normalized.includes('IN_PROGRESS') || normalized.includes('CREATED')) {
    return 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
  }
  if (normalized.includes('COMPLIANT') || normalized.includes('OPEN') || normalized === 'OK') {
    return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
  }
  return 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
}

export function severityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
    case 'error':
      return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800'
    case 'warning':
      return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
    default:
      return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
  }
}

export function pillarLabel(pillar: string): string {
  const labels: Record<string, string> = {
    resilience: 'Resiliência',
    security: 'Segurança',
    compliance: 'Compliance',
    performance: 'Performance',
    operational: 'Operacional',
    cost: 'Custo',
  }

  return labels[pillar.toLowerCase()] ?? formatEnum(pillar)
}

export function pillarWeight(pillar: string): number {
  const weights: Record<string, number> = {
    resilience: 30,
    security: 25,
    compliance: 20,
    performance: 15,
    operational: 10,
    cost: 10,
  }

  return weights[pillar.toLowerCase()] ?? 0
}
