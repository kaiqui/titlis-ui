import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { isFeatureEnabled, type Feature } from '@/lib/featureFlags'

// Renderiza os filhos só quando a feature está ligada (botões, cards, abas).
export function WhenFeature({
  feature,
  children,
  fallback = null,
}: {
  feature: Feature
  children: ReactNode
  fallback?: ReactNode
}) {
  return isFeatureEnabled(feature) ? <>{children}</> : <>{fallback}</>
}

// Guarda de rota: quando a feature está desligada, redireciona para o Hub.
export function FeatureRoute({ feature, children }: { feature: Feature; children: ReactNode }) {
  return isFeatureEnabled(feature) ? <>{children}</> : <Navigate to="/" replace />
}
