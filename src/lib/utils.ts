import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function scoreColor(score: number | null): string {
  if (score === null) return 'text-gray'
  if (score >= 80) return 'jc-score-good'
  if (score >= 70) return 'jc-score-attention'
  return 'jc-score-critical'
}

export function scoreLabel(score: number | null): string {
  if (score === null) return 'Sem score'
  if (score >= 90) return 'Excelente'
  if (score >= 80) return 'Bom'
  if (score >= 70) return 'Atenção'
  return 'Crítico'
}

export function scoreBgColor(score: number | null): string {
  if (score === null) return 'jc-badge-neutral'
  if (score >= 80) return 'jc-badge-good'
  if (score >= 70) return 'jc-badge-attention'
  return 'jc-badge-critical'
}

export function scoreRingColor(score: number | null): string {
  if (score === null) return 'var(--color-muted-foreground)'
  if (score >= 80) return 'var(--color-success)'
  if (score >= 70) return 'var(--color-warning)'
  return 'var(--color-danger)'
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

const ENV_LABEL_MAP: Record<string, string> = {
  prd:            'Produção',
  prod:           'Produção',
  production:     'Produção',
  hml:            'Homologação',
  homolog:        'Homologação',
  homologacao:    'Homologação',
  staging:        'Homologação',
  stg:            'Homologação',
  dev:            'Desenvolvimento',
  development:    'Desenvolvimento',
  desenvolvimento:'Desenvolvimento',
  tst:            'Teste',
  test:           'Teste',
  testing:        'Teste',
  qa:             'QA',
  uat:            'UAT',
  sandbox:        'Sandbox',
}

export function formatEnvironment(value?: string | null): string {
  if (!value || value === 'unknown') return 'Não informado'
  return ENV_LABEL_MAP[value.toLowerCase()] ?? value
}

export function statusTone(value?: string | null): string {
  const normalized = value?.toUpperCase()
  if (!normalized) return 'jc-badge-neutral'
  if (normalized.includes('NON') || normalized.includes('FAILED') || normalized.includes('ERROR')) {
    return 'jc-badge-critical'
  }
  if (normalized.includes('PENDING') || normalized.includes('IN_PROGRESS') || normalized.includes('CREATED')) {
    return 'jc-status-pending'
  }
  if (normalized.includes('COMPLIANT') || normalized.includes('OPEN') || normalized === 'OK') {
    return 'jc-badge-good'
  }
  return 'jc-status-unknown'
}

export function severityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'jc-severity-critical'
    case 'error':
      return 'jc-severity-error'
    case 'warning':
      return 'jc-severity-warning'
    default:
      return 'jc-severity-info'
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
