// Faixa de tempo global, no formato do Datadog: presets relativos ("Último 1 mês") + faixa
// absoluta ("De … Até …"). Fonte da verdade é a URL: ?range=<preset> OU ?from=<ms>&to=<ms>.

export interface RangePreset {
  id: string
  label: string
  ms: number
}

export const RANGE_PRESETS: RangePreset[] = [
  { id: '15m', label: 'Últimos 15 minutos', ms: 15 * 60_000 },
  { id: '1h', label: 'Última 1 hora', ms: 60 * 60_000 },
  { id: '4h', label: 'Últimas 4 horas', ms: 4 * 60 * 60_000 },
  { id: '1d', label: 'Último 1 dia', ms: 24 * 60 * 60_000 },
  { id: '2d', label: 'Últimos 2 dias', ms: 2 * 24 * 60 * 60_000 },
  { id: '1w', label: 'Última 1 semana', ms: 7 * 24 * 60 * 60_000 },
  { id: '1mo', label: 'Último 1 mês', ms: 30 * 24 * 60 * 60_000 },
  { id: '3mo', label: 'Últimos 3 meses', ms: 90 * 24 * 60 * 60_000 },
]

export const DEFAULT_PRESET = '1mo'
const DAY = 24 * 60 * 60_000

export interface ResolvedRange {
  from: number
  to: number
  preset: string | null // null = faixa absoluta
  label: string
  days: number // span em dias, mín. 1 — para os endpoints que ainda pedem ?days=
}

function fmtAbs(from: number, to: number): string {
  const opt: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }
  const f = new Date(from).toLocaleString('pt-BR', opt)
  const t = new Date(to).toLocaleString('pt-BR', opt)
  return `${f} – ${t}`
}

export function resolveRange(params: URLSearchParams): ResolvedRange {
  const rangeId = params.get('range')
  const fromRaw = Number(params.get('from'))
  const toRaw = Number(params.get('to'))

  if (Number.isFinite(fromRaw) && Number.isFinite(toRaw) && fromRaw > 0 && toRaw > fromRaw) {
    return {
      from: fromRaw,
      to: toRaw,
      preset: null,
      label: fmtAbs(fromRaw, toRaw),
      days: Math.max(1, Math.ceil((toRaw - fromRaw) / DAY)),
    }
  }

  const preset = RANGE_PRESETS.find((p) => p.id === rangeId) ?? RANGE_PRESETS.find((p) => p.id === DEFAULT_PRESET)!
  const to = Date.now()
  const from = to - preset.ms
  return { from, to, preset: preset.id, label: preset.label, days: Math.max(1, Math.round(preset.ms / DAY)) }
}

export function toDatetimeLocal(ms: number): string {
  const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60_000)
  return d.toISOString().slice(0, 16)
}

export function fromDatetimeLocal(value: string): number {
  return new Date(value).getTime()
}
