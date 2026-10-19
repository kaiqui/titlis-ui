import type { ReliabilityState } from '@/types'

// docs/todo/customer-reliability-plan.md V-2 — leitura de resultado de um nó do Hub: quantos
// serviços estão degradados / em risco / saudáveis / não medidos (pior primeiro).
const ORDER: Array<{ state: ReliabilityState; one: string; many: string; color: string }> = [
  { state: 'degraded', one: 'degradado', many: 'degradados', color: 'var(--color-danger)' },
  { state: 'at_risk', one: 'em risco', many: 'em risco', color: 'var(--color-warning)' },
  { state: 'healthy', one: 'saudável', many: 'saudáveis', color: 'var(--color-success)' },
  { state: 'not_measured', one: 'não medido', many: 'não medidos', color: 'var(--color-muted-foreground)' },
]

export function OutcomeMix({ mix, single }: { mix: Record<ReliabilityState, number>; single?: ReliabilityState }) {
  const items = single ? ORDER.filter((o) => o.state === single) : ORDER.filter((o) => (mix[o.state] ?? 0) > 0)
  if (items.length === 0) return null
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" data-testid="outcome-mix">
      <span style={{ color: 'var(--color-muted-foreground)' }}>Resultado:</span>
      {items.map((o) => {
        const n = mix[o.state] ?? 0
        return (
          <span key={o.state} className="inline-flex items-center gap-1 tabular-nums" style={{ color: o.color }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: o.color }} aria-hidden />
            {single ? o.one : `${n} ${n === 1 ? o.one : o.many}`}
          </span>
        )
      })}
    </p>
  )
}
