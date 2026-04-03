import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { KeyRound, Shield } from 'lucide-react'
import { useAuth } from '@/contexts/useAuth'

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { authMode, status, bootstrapStatus, hasOktaConfig, loginLocal, loginWithOkta } = useAuth()
  const [tenantSlug, setTenantSlug] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [oktaSubmitting, setOktaSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/'

  if (status === 'authenticated') {
    return <Navigate to={from} replace />
  }

  if (bootstrapStatus?.bootstrapRequired) {
    return <Navigate to="/signup" replace />
  }

  if (status === 'loading') {
    return null
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      await loginLocal({ tenantSlug, email, password })
      navigate(from, { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível entrar agora.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleOktaLogin() {
    setOktaSubmitting(true)
    setError(null)

    try {
      await loginWithOkta(from)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível iniciar o login com Okta.')
      setOktaSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10" style={{ background: 'var(--app-background)' }}>
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2.4rem] border p-8 lg:p-10" style={{ borderColor: 'var(--color-border)', background: 'var(--hero-background)' }}>
          <div className="flex h-14 w-14 items-center justify-center rounded-[1.5rem]" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary-strong)' }}>
            <Shield size={26} />
          </div>
          <p className="mt-6 text-sm font-extrabold uppercase tracking-[0.18em]" style={{ color: 'var(--color-primary-strong)' }}>
            Acesso Titlis
          </p>
          <h1 className="family-neighbor mt-3 text-3xl font-black tracking-tight lg:text-4xl" style={{ color: 'var(--color-foreground)' }}>
            Entre com sua conta da plataforma.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6" style={{ color: 'var(--color-muted-foreground)' }}>
            O login normal abre a plataforma e deixa a configuração de SSO corporativo para depois, dentro do produto.
          </p>
          {authMode === 'mock' && (
            <div className="mt-6 rounded-[1.8rem] border p-4 text-sm" style={{ borderColor: 'rgba(245, 158, 11, 0.2)', background: 'rgba(254, 249, 195, 0.8)', color: '#92400e' }}>
              O frontend esta em modo de desenvolvimento. A sessao sera criada automaticamente usando o bypass local.
            </div>
          )}
          {hasOktaConfig && (
            <div className="mt-6 rounded-[1.8rem] border p-4 text-sm" style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)', color: 'var(--color-muted-foreground)' }}>
              O login federado com Okta já está habilitado no frontend. Use a conta local só para bootstrap, suporte e acesso de emergência.
            </div>
          )}
        </section>

        <section className="rounded-[2.4rem] border p-8" style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
          {hasOktaConfig && (
            <div className="mb-5 space-y-3 rounded-[1.8rem] border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--hero-background)' }}>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em]" style={{ color: 'var(--color-primary-strong)' }}>
                Login Corporativo
              </p>
              <button
                className="button-jeitto w-full inline-flex items-center justify-center gap-2"
                type="button"
                onClick={handleOktaLogin}
                disabled={oktaSubmitting}
                style={{ background: 'var(--color-primary)', color: '#fff', opacity: oktaSubmitting ? 0.72 : 1 }}
              >
                <KeyRound size={16} />
                {oktaSubmitting ? 'Redirecionando...' : 'Entrar com Okta'}
              </button>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-semibold" htmlFor="tenantSlug">Tenant</label>
              <input id="tenantSlug" className="input-field" value={tenantSlug} onChange={event => setTenantSlug(event.target.value)} placeholder="empresa-exemplo" autoComplete="organization" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold" htmlFor="email">Email</label>
              <input id="email" className="input-field" value={email} onChange={event => setEmail(event.target.value)} placeholder="admin@empresa.com" autoComplete="email" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold" htmlFor="password">Senha</label>
              <input id="password" className="input-field" type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Sua senha administrativa" autoComplete="current-password" />
            </div>

            {error && (
              <div className="rounded-3xl border px-4 py-3 text-sm" style={{ borderColor: 'rgba(239, 68, 68, 0.22)', color: '#dc2626', background: 'rgba(254, 242, 242, 0.8)' }}>
                {error}
              </div>
            )}

            <button className="button-jeitto w-full" type="submit" disabled={submitting} style={{ background: 'var(--color-primary)', color: '#fff' }}>
              {submitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            Ainda não tem conta? <Link to="/signup" className="font-semibold" style={{ color: 'var(--color-primary-strong)' }}>Criar conta</Link>
          </p>
        </section>
      </div>
    </div>
  )
}
