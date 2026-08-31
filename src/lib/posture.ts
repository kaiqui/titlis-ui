import type { CoverageDimension, CoverageFinding, CoverageScorecard } from '@/types'

// Modelo de postura de confiabilidade (RPM). A dimensão é a unidade; os findings vivem dentro dela.

export const DIMENSION_LABELS: Record<string, string> = {
  elasticidade: 'Elasticidade',
  resiliencia: 'Resiliência',
  prontidao: 'Prontidão operacional',
  velocidade: 'Velocidade segura',
  exposicao: 'Exposição',
  observabilidade: 'Observabilidade',
}

const PILLAR_LABELS: Record<string, string> = {
  resilience: 'Resiliência',
  security: 'Segurança',
  performance: 'Performance',
  operational: 'Operacional',
  observability: 'Observabilidade',
}

export function dimensionLabel(p: string): string {
  return DIMENSION_LABELS[p.toLowerCase()] ?? PILLAR_LABELS[p.toLowerCase()] ?? p
}

export const POSTURE_BAND: Record<string, { label: string; color: string }> = {
  forte: { label: 'Forte', color: '#16a34a' },
  adequado: { label: 'Adequado', color: '#d97706' },
  fragil: { label: 'Frágil', color: '#ea580c' },
  exposto: { label: 'Exposto', color: '#dc2626' },
  sem_sinal: { label: 'Sem sinal', color: 'var(--color-muted-foreground)' },
}

export function postureBand(band: string | undefined): { label: string; color: string } {
  return POSTURE_BAND[band ?? 'sem_sinal'] ?? POSTURE_BAND.sem_sinal
}

export function confidenceLabel(c: string | undefined | null): string {
  return (
    {
      alta: 'confiança alta',
      media: 'confiança média',
      baixa: 'confiança baixa',
      insuficiente: 'sinal insuficiente',
      sem_sinal: 'sem sinal',
    }[c ?? ''] ?? ''
  )
}

export function overallBand(score: number | null): string {
  if (score === null) return 'sem_sinal'
  if (score >= 75) return 'forte'
  if (score >= 55) return 'adequado'
  if (score >= 35) return 'fragil'
  return 'exposto'
}

export function weakestDimension(sc: CoverageScorecard): CoverageDimension | null {
  const withSignal = sc.dimensions.filter((d) => (d.band ?? 'sem_sinal') !== 'sem_sinal')
  if (withSignal.length === 0) return null
  return withSignal.reduce((min, d) => ((d.strength ?? d.pct) < (min.strength ?? min.pct) ? d : min))
}

export function stripIcon(s: string): string {
  return s.replace(/^[⏭❌✅⚠️ℹ️]\s*/u, '').trim()
}

export function topReason(sc: CoverageScorecard): string {
  if (sc.moves && sc.moves.length > 0) return stripIcon(sc.moves[0].description)
  const w = weakestDimension(sc)
  if (w) return `${w.label ?? dimensionLabel(w.pillar)} frágil`
  return 'sinal insuficiente'
}

const K8S_CONFIG_CODES = new Set([
  'RES-003', 'RES-004', 'RES-005', 'RES-006', 'RES-001', 'RES-002', 'RES-007', 'RES-020',
  'RES-009', 'RES-010', 'RES-011', 'RES-013', 'SEC-001', 'SEC-002', 'SEC-003', 'SEC-004', 'SEC-006',
])

function sourceOfNaFinding(f: CoverageFinding): string {
  if (f.source && f.source.trim().length > 0) return f.source
  if (K8S_CONFIG_CODES.has(f.code)) return 'Discovery Kubernetes (operator)'
  if (/^SEC-00[789]|^SEC-010/.test(f.code)) return 'Veracode'
  return 'Datadog'
}

function cleanNaLabel(msg: string): string {
  return msg
    .replace(/^[⏭❌✅]\s*/u, '')
    .replace(/\s*—\s*requer discovery Kubernetes \(operator\)\s*$/u, '')
    .replace(/^não avaliável.*$/i, '')
    .trim()
}

export function findingsForDimension(
  sc: CoverageScorecard,
  slug: string,
  outcome: 'fail' | 'pass' | 'na',
): CoverageFinding[] {
  return sc.findings.filter((f) => (f.dimension ?? '') === slug && f.outcome === outcome)
}

export interface NaGroup {
  sourceLabel: string
  items: { label: string; code: string }[]
}

export function naGroupsForDimension(sc: CoverageScorecard, slug: string): NaGroup[] {
  const bySource = new Map<string, { label: string; code: string }[]>()
  for (const f of findingsForDimension(sc, slug, 'na')) {
    const src = sourceOfNaFinding(f)
    const label = cleanNaLabel(f.message) || f.code
    const bucket = bySource.get(src)
    if (bucket) bucket.push({ label, code: f.code })
    else bySource.set(src, [{ label, code: f.code }])
  }
  return [...bySource.entries()].map(([sourceLabel, items]) => ({ sourceLabel, items }))
}

export function distinctNaSources(sc: CoverageScorecard): number {
  const s = new Set<string>()
  for (const f of sc.findings) if (f.outcome === 'na') s.add(sourceOfNaFinding(f))
  return s.size
}

export function isFindingRemediable(f: CoverageFinding): boolean {
  return f.outcome === 'fail' && /^(RES|SEC|PERF|OPS)-/.test(f.code)
}
