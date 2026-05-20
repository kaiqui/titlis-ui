import { isHidden } from '@/lib/featureFlags'

interface FeatureGuardProps {
  id: string
  children: React.ReactNode
}

export function FeatureGuard({ id, children }: FeatureGuardProps) {
  if (!isHidden(id)) return <>{children}</>
  return (
    <div
      className="pointer-events-none cursor-not-allowed opacity-50"
      title="Funcionalidade desabilitada"
      aria-disabled="true"
    >
      {children}
    </div>
  )
}
