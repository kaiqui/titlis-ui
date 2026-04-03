import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Navigate, Link, useNavigate } from 'react-router-dom'
import { Building2, KeyRound, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/contexts/useAuth'

export function Onboarding() {
  const navigate = useNavigate()
  const { status, bootstrapStatus, bootstrapSetup } = useAuth()
  const [tenantName, setTenantName] = useState('')
  const [tenantSlug, setTenantSlug] = useState('')
  const [tenantSlugTouched, setTenantSlugTouched] = useState(false)
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldTouched, setFieldTouched] = useState({
    tenantName: false,
    tenantSlug: false,
    adminName: false,
    adminEmail: false,
    password: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const normalizedTenantSlug = useMemo(
    () => tenantSlug
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, ''),
    [tenantSlug],
  )
  const normalizedTenantNameSlug = useMemo(
    () => tenantName
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, ''),
    [tenantName],
  )
  const normalizedAdminEmail = adminEmail.trim().toLowerCase()
  const tenantNameError = useMemo(() => {
    if (!fieldTouched.tenantName) return null
    if (!tenantName.trim()) return 'Informe o nome da companhia.'
    if (tenantName.trim().length < 2) return 'Use pelo menos 2 caracteres no nome da companhia.'
    return null
  }, [fieldTouched.tenantName, tenantName])
  const tenantSlugError = useMemo(() => {
    if (!fieldTouched.tenantSlug) return null
    if (!tenantSlug.trim()) return 'Informe o slug do tenant.'
    if (!normalizedTenantSlug) return 'Use apenas letras, números e hífen.'
    if (normalizedTenantSlug.length < 3) return 'Use pelo menos 3 caracteres no slug.'
    return null
  }, [fieldTouched.tenantSlug, tenantSlug, normalizedTenantSlug])
  const adminNameError = useMemo(() => {
    if (!fieldTouched.adminName) return null
    if (!adminName.trim()) return 'Informe o nome da pessoa administradora.'
    if (adminName.trim().length < 2) return 'Use pelo menos 2 caracteres no nome.'
    return null
  }, [adminName, fieldTouched.adminName])
  const adminEmailError = useMemo(() => {
    if (!fieldTouched.adminEmail) return null
    if (!normalizedAdminEmail) return 'Informe o email do admin.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedAdminEmail)) return 'Informe um email válido.'
    return null
  }, [fieldTouched.adminEmail, normalizedAdminEmail])
  const passwordError = useMemo(() => {
    if (!fieldTouched.password) return null
    if (!password.trim()) return 'Informe uma senha inicial.'
    if (password.trim().length < 10) return 'A senha inicial precisa ter pelo menos 10 caracteres.'
    return null
  }, [fieldTouched.password, password])
  const validationError = tenantNameError
    ?? tenantSlugError
    ?? adminNameError
    ?? adminEmailError
    ?? passwordError
  const formValid = !tenantNameError
    && !tenantSlugError
    && !adminNameError
    && !adminEmailError
    && !passwordError
    && !!tenantName.trim()
    && !!normalizedTenantSlug
    && !!adminName.trim()
    && !!normalizedAdminEmail
    && password.trim().length >= 10

  useEffect(() => {
    if (!tenantSlugTouched) {
      setTenantSlug(normalizedTenantNameSlug)
    }
  }, [normalizedTenantNameSlug, tenantSlugTouched])

  useEffect(() => {
    setError(null)
  }, [tenantName, tenantSlug, adminName, adminEmail, password])

  if (status === 'authenticated' && bootstrapStatus && !bootstrapStatus.bootstrapRequired) {
    return <Navigate to="/" replace />
  }

  if (status === 'loading') {
    return null
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldTouched({
      tenantName: true,
      tenantSlug: true,
      adminName: true,
      adminEmail: true,
      password: true,
    })

    if (!formValid || validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await bootstrapSetup({
        tenantName: tenantName.trim(),
        tenantSlug: normalizedTenantSlug,
        adminName: adminName.trim(),
        adminEmail: normalizedAdminEmail,
        password: password.trim(),
      })
      navigate('/', { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível criar a conta agora.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10" style={{ background: 'var(--app-background)' }}>
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.02fr_0.98fr]">
        <section className="rounded-[2.4rem] border p-8 lg:p-10" style={{ borderColor: 'var(--color-border)', background: 'var(--hero-background)' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.5rem]" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary-strong)' }}>
              <Building2 size={24} />
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.5rem]" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary-strong)' }}>
              <ShieldCheck size={24} />
            </div>
          </div>

          <p className="mt-6 text-sm font-extrabold uppercase tracking-[0.18em]" style={{ color: 'var(--color-primary-strong)' }}>
            Criar conta
          </p>
          <h1 className="family-neighbor mt-3 text-3xl font-black tracking-tight lg:text-4xl" style={{ color: 'var(--color-foreground)' }}>
            Crie a conta admin e o workspace inicial do Titlis.
          </h1>
          <div className="mt-5 space-y-3 text-sm leading-6" style={{ color: 'var(--color-muted-foreground)' }}>
            <p>1. Você cria a conta administrativa local que controla o tenant.</p>
            <p>2. Entra na plataforma e conhece o produto pela dashboard principal.</p>
            <p>3. Só depois configura Okta ou outro OIDC para a companhia inteira, se quiser.</p>
          </div>

          <div className="mt-8 grid gap-3">
            <div className="rounded-[1.6rem] border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em]" style={{ color: 'var(--color-primary-strong)' }}>
                Fluxo recomendado
              </p>
              <p className="mt-3 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                Signup local primeiro. Configuração corporativa de login depois, dentro do produto.
              </p>
            </div>
            <div className="rounded-[1.6rem] border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
              <div className="flex items-center gap-3">
                <KeyRound size={16} style={{ color: 'var(--color-primary-strong)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                  Okta não faz parte do cadastro inicial.
                </p>
              </div>
              <p className="mt-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                O tenant nasce com login normal. O administrador decide depois se habilita OIDC para todos.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2.4rem] border p-8" style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-semibold" htmlFor="tenantName">Nome da companhia</label>
              <input
                id="tenantName"
                className="input-field"
                value={tenantName}
                onChange={event => {
                  setFieldTouched(current => ({ ...current, tenantName: true }))
                  setTenantName(event.target.value)
                }}
                onBlur={() => setFieldTouched(current => ({ ...current, tenantName: true }))}
                placeholder="Jeitto"
                autoComplete="organization"
              />
              {tenantNameError && (
                <p className="mt-2 text-xs" style={{ color: '#dc2626' }}>
                  {tenantNameError}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold" htmlFor="tenantSlug">Slug do tenant</label>
              <input
                id="tenantSlug"
                className="input-field"
                value={tenantSlug}
                onChange={event => {
                  setFieldTouched(current => ({ ...current, tenantSlug: true }))
                  setTenantSlugTouched(true)
                  setTenantSlug(event.target.value)
                }}
                onBlur={() => setFieldTouched(current => ({ ...current, tenantSlug: true }))}
                placeholder="jeitto"
              />
              <p className="mt-2 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                Valor enviado: <code>{normalizedTenantSlug || 'slug-invalido'}</code>
              </p>
              {tenantSlugError && (
                <p className="mt-2 text-xs" style={{ color: '#dc2626' }}>
                  {tenantSlugError}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold" htmlFor="adminName">Nome do admin</label>
              <input
                id="adminName"
                className="input-field"
                value={adminName}
                onChange={event => {
                  setFieldTouched(current => ({ ...current, adminName: true }))
                  setAdminName(event.target.value)
                }}
                onBlur={() => setFieldTouched(current => ({ ...current, adminName: true }))}
                placeholder="Pessoa administradora"
                autoComplete="name"
              />
              {adminNameError && (
                <p className="mt-2 text-xs" style={{ color: '#dc2626' }}>
                  {adminNameError}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold" htmlFor="adminEmail">Email do admin</label>
              <input
                id="adminEmail"
                className="input-field"
                value={adminEmail}
                onChange={event => {
                  setFieldTouched(current => ({ ...current, adminEmail: true }))
                  setAdminEmail(event.target.value)
                }}
                onBlur={() => setFieldTouched(current => ({ ...current, adminEmail: true }))}
                placeholder="admin@empresa.com"
                autoComplete="email"
              />
              {adminEmailError && (
                <p className="mt-2 text-xs" style={{ color: '#dc2626' }}>
                  {adminEmailError}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold" htmlFor="password">Senha inicial</label>
              <input
                id="password"
                className="input-field"
                type="password"
                value={password}
                onChange={event => {
                  setFieldTouched(current => ({ ...current, password: true }))
                  setPassword(event.target.value)
                }}
                onBlur={() => setFieldTouched(current => ({ ...current, password: true }))}
                placeholder="Use pelo menos 10 caracteres"
                autoComplete="new-password"
              />
              {passwordError ? (
                <p className="mt-2 text-xs" style={{ color: '#dc2626' }}>
                  {passwordError}
                </p>
              ) : password.trim() ? (
                <p className="mt-2 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                  {password.trim().length} caracteres informados.
                </p>
              ) : null}
            </div>

            {error && (
              <div className="rounded-3xl border px-4 py-3 text-sm" style={{ borderColor: 'rgba(239, 68, 68, 0.22)', color: '#dc2626', background: 'rgba(254, 242, 242, 0.8)' }}>
                {error}
              </div>
            )}

            <button className="button-jeitto w-full" type="submit" disabled={submitting || !formValid} style={{ background: 'var(--color-primary)', color: '#fff', opacity: submitting || !formValid ? 0.7 : 1 }}>
              {submitting ? 'Criando conta...' : 'Criar conta e entrar'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            Já tem conta? <Link to="/login" className="font-semibold" style={{ color: 'var(--color-primary-strong)' }}>Entrar</Link>
          </p>
        </section>
      </div>
    </div>
  )
}
