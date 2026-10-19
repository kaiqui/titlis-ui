// Formatação da leitura de resultado (customer-reliability-plan V-1) — pt-BR.
const pct = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 2 })

export function formatPct(v: number | null): string {
  return v === null ? 'N/D' : `${pct.format(v)}%`
}

export function formatCount(v: number): string {
  return compact.format(v)
}

export function formatMs(v: number | null): string {
  if (v === null) return 'N/D'
  return v >= 1000 ? `${pct.format(v / 1000)} s` : `${Math.round(v)} ms`
}

// "get_/cashout/keys/{key}" (resource_name do ddtrace) → "GET /cashout/keys/{key}"
export function routeLabel(resource: string): string {
  const m = /^([a-z]+)_(\/.*)$/.exec(resource)
  return m ? `${m[1]!.toUpperCase()} ${m[2]}` : resource
}
