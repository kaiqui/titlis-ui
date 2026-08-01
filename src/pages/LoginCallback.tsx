import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { animate, stagger } from 'animejs'
import { useAuth } from '@/contexts/useAuth'

export function LoginCallback() {
  const navigate = useNavigate()
  const { finishOktaLogin } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const dotsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void (async () => {
      try {
        const returnPath = await finishOktaLogin(window.location.href)
        navigate(returnPath || '/', { replace: true })
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Falha ao concluir o login com Okta.')
      }
    })()
  }, [finishOktaLogin, navigate])

  useEffect(() => {
    if (!dotsRef.current) return
    const animation = animate(dotsRef.current.children, {
      translateY: [0, -8, 0],
      opacity: [0.4, 1, 0.4],
      delay: stagger(120),
      duration: 700,
      loop: true,
      easing: 'easeInOutSine',
    })
    return () => {
      animation.pause()
    }
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center px-6" style={{ background: 'var(--app-background)' }}>
      <div className="w-full max-w-md rounded-[2rem] border p-8 text-center" style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
        <p className="family-neighbor text-lg font-black" style={{ color: 'var(--color-foreground)' }}>
          Finalizando login
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          Estamos concluindo a autenticação com o Okta.
        </p>
        {!error && (
          <div ref={dotsRef} className="mt-5 flex items-center justify-center gap-2">
            {[0, 1, 2].map(dot => (
              <span key={dot} className="h-2 w-2 rounded-full" style={{ background: 'var(--color-primary)' }} />
            ))}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-3xl border px-4 py-3 text-sm" style={{ borderColor: 'rgba(239, 68, 68, 0.22)', color: '#dc2626', background: 'rgba(254, 242, 242, 0.8)' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
