import type { PillarScore, QueueFinding, QueueScorecard } from '@/types'

// Filas na linguagem de postura — os mesmos dados de queue_scorecards vistos como força +
// confiança por dimensão. Nenhum score é recalculado: strength = score do pilar; confiança vem
// do ciclo de vida da fila (DISCOVERING/LEARNING = pouco sinal).

const PILLAR_DIM: Record<string, { slug: string; label: string; question: string }> = {
  resilience: { slug: 'resiliencia', label: 'Resiliência', question: 'Aguenta pico e falha de consumo?' },
  operational: { slug: 'prontidao', label: 'Prontidão operacional', question: 'O alarme dispara antes do cliente sentir?' },
  performance: { slug: 'vazao', label: 'Vazão', question: 'O processamento acompanha a carga?' },
  observability: { slug: 'observabilidade', label: 'Observabilidade', question: 'Dá pra ver a fila por dentro?' },
  security: { slug: 'exposicao', label: 'Exposição', question: 'O acesso à fila está restrito?' },
}

const DIM_ORDER = ['resiliencia', 'prontidao', 'vazao', 'observabilidade', 'exposicao']

export function overallBand(score: number | null): string {
  if (score === null) return 'sem_sinal'
  if (score >= 75) return 'forte'
  if (score >= 55) return 'adequado'
  if (score >= 35) return 'fragil'
  return 'exposto'
}

export interface QueueDimension {
  slug: string
  label: string
  question: string
  strength: number | null
  band: string
  fails: QueueFinding[]
  passes: number
}

export function queueDimensions(sc: QueueScorecard): QueueDimension[] {
  const byPillar = new Map<string, PillarScore>()
  for (const p of sc.pillarScores) byPillar.set(p.pillar.toLowerCase(), p)
  const failsByPillar = new Map<string, QueueFinding[]>()
  const passByPillar = new Map<string, number>()
  for (const f of sc.findings) {
    const key = (f.pillar || '').toLowerCase()
    if (f.passed) passByPillar.set(key, (passByPillar.get(key) ?? 0) + 1)
    else {
      const b = failsByPillar.get(key)
      if (b) b.push(f)
      else failsByPillar.set(key, [f])
    }
  }

  return DIM_ORDER.flatMap((slug) => {
    const entry = Object.entries(PILLAR_DIM).find(([, d]) => d.slug === slug)
    if (!entry) return []
    const [pillarKey, meta] = entry
    const ps = byPillar.get(pillarKey)
    const fails = failsByPillar.get(pillarKey) ?? []
    const passes = passByPillar.get(pillarKey) ?? 0
    if (!ps && fails.length === 0 && passes === 0) {
      return [{ slug, label: meta.label, question: meta.question, strength: null, band: 'sem_sinal', fails, passes }]
    }
    const strength = ps?.score ?? null
    return [{ slug, label: meta.label, question: meta.question, strength, band: overallBand(strength), fails, passes }]
  })
}

export function queueConfidence(lifecycleState: string, observationCount: number): string {
  if (lifecycleState === 'DISCOVERING') return 'insuficiente'
  if (lifecycleState === 'LEARNING') return 'baixa'
  if (observationCount < 20) return 'media'
  return 'alta'
}

const SEV_RANK: Record<string, number> = { critical: 0, error: 1, warning: 2, info: 3 }

export function queueMoves(sc: QueueScorecard): Array<{ code: string; message: string; dimension: string }> {
  const dimByPillar = new Map<string, string>()
  for (const [pillarKey, meta] of Object.entries(PILLAR_DIM)) dimByPillar.set(pillarKey, meta.label)
  return sc.findings
    .filter((f) => !f.passed)
    .slice()
    .sort((a, b) => (SEV_RANK[a.severity] ?? 3) - (SEV_RANK[b.severity] ?? 3))
    .slice(0, 6)
    .map((f) => ({ code: f.ruleId, message: f.message ?? f.ruleName, dimension: dimByPillar.get((f.pillar || '').toLowerCase()) ?? '' }))
}

export function weakestQueueDimension(sc: QueueScorecard): QueueDimension | null {
  const withSignal = queueDimensions(sc).filter((d) => d.band !== 'sem_sinal' && d.strength !== null)
  if (withSignal.length === 0) return null
  return withSignal.reduce((min, d) => ((d.strength ?? 100) < (min.strength ?? 100) ? d : min))
}
