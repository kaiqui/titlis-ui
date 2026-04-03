import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/useAuth'

interface AuthGateProps {
  children: ReactNode
  requireAdmin?: boolean
}

function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6" style={{ background: 'var(--app-background)' }}>
      <div className="w-full max-w-md rounded-[2rem] border p-8 text-center" style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
        <p className="family-neighbor text-lg font-black" style={{ color: 'var(--color-foreground)' }}>
          Carregando acesso
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          Estamos validando sua sessão antes de abrir a plataforma.
        </p>
      </div>
    </div>
  )
}

export function AuthGate({ children, requireAdmin = false }: AuthGateProps) {
  const location = useLocation()
  const { status, bootstrapStatus, user } = useAuth()

  if (status === 'loading' || bootstrapStatus === null) {
    return <AuthLoading />
  }

  if (bootstrapStatus.bootstrapRequired && location.pathname !== '/signup') {
    return <Navigate to="/signup" replace />
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (requireAdmin && !user?.canRemediate) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
