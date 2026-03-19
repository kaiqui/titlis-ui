import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function scoreColor(score: number): string {
  if (score >= 90) return 'text-emerald-500'
  if (score >= 80) return 'text-yellow-500'
  if (score >= 70) return 'text-orange-500'
  return 'text-red-500'
}

export function scoreLabel(score: number): string {
  if (score >= 90) return 'Excelente'
  if (score >= 80) return 'Bom'
  if (score >= 70) return 'Regular'
  return 'Critico'
}

export function scoreBgColor(score: number): string {
  if (score >= 90) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
  if (score >= 80) return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
  if (score >= 70) return 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
  return 'bg-red-500/10 text-red-600 dark:text-red-400'
}

export function scoreRingColor(score: number): string {
  if (score >= 90) return '#10b981'
  if (score >= 80) return '#eab308'
  if (score >= 70) return '#f97316'
  return '#ef4444'
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function severityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
    case 'error': return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800'
    case 'warning': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800'
    default: return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
  }
}

export function pillarLabel(pillar: string): string {
  const labels: Record<string, string> = {
    resilience: 'Resiliencia',
    security: 'Seguranca',
    compliance: 'Compliance',
    performance: 'Performance',
    operational: 'Operacional',
    cost: 'Custo',
  }
  return labels[pillar] ?? pillar
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
  return weights[pillar] ?? 0
}
