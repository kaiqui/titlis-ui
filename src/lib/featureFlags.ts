// Feature flags controlados no build.
//
// 1) VITE_HIDDEN_FEATURES — lista de IDs granulares escondidos (botões pontuais).
//    Formato: VITE_HIDDEN_FEATURES=btn_create_api_key
//
// 2) Flags booleanas por domínio — ligam/desligam páginas + botões + itens de sidebar
//    de uma área inteira. Quando desligada, o item da sidebar continua visível como
//    "em breve" (sem clique) e as rotas redirecionam para o Hub.
//      VITE_FEATURE_AI=false      → ConfAI, memória/investigação, Custos de IA, Modelo de IA
//      VITE_FEATURE_SLOS=false    → página SLOs
//      VITE_FEATURE_QUEUES=false  → página Filas
//    Ausente/qualquer valor = ligada; só desliga com false/0/off/no.

const raw: string = import.meta.env.VITE_HIDDEN_FEATURES ?? ''

const hiddenFeatures = new Set<string>(
  raw.split(',').map((s) => s.trim()).filter(Boolean),
)

export function isHidden(id: string): boolean {
  return hiddenFeatures.has(id)
}

export type Feature = 'ai' | 'slos' | 'queues'

const OFF_VALUES = new Set(['false', '0', 'off', 'no', 'disabled', 'nao', 'não'])

function boolEnv(name: string, def = true): boolean {
  const v = (import.meta.env[name] ?? '').toString().trim().toLowerCase()
  if (v === '') return def
  return !OFF_VALUES.has(v)
}

const FEATURES: Record<Feature, boolean> = {
  ai: boolEnv('VITE_FEATURE_AI'),
  slos: boolEnv('VITE_FEATURE_SLOS'),
  queues: boolEnv('VITE_FEATURE_QUEUES'),
}

export function isFeatureEnabled(feature: Feature): boolean {
  return FEATURES[feature]
}
