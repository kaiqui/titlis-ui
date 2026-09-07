// Feature flags controlados por VITE_HIDDEN_FEATURES no build.
// Formato: VITE_HIDDEN_FEATURES=btn_remediate,nav_assistant
//
// IDs disponíveis:
//   Sidebar — nav_incidents, nav_applications, nav_scorecards, nav_slos,
//             nav_settings_api_keys, nav_settings_auth, nav_settings_ai,
//             nav_settings_score_config, nav_settings_auto_remediation, nav_settings_tags
//
//            btn_create_api_key   (Criar — SettingsApiKeys)

const raw: string = import.meta.env.VITE_HIDDEN_FEATURES ?? ''

const hiddenFeatures = new Set<string>(
  raw.split(',').map((s) => s.trim()).filter(Boolean),
)

export function isHidden(id: string): boolean {
  return hiddenFeatures.has(id)
}
