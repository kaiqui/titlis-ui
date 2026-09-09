import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Navigate, Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  Building2,
  Check,
  ChevronRight,
  Copy,
  Database,
  KeyRound,
  Loader2,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/contexts/useAuth'
import { api } from '@/lib/api'
import { fadeInUp } from '@/lib/motion/tokens'

// ── Step indicators ────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Conta',           icon: Building2 },
  { id: 2, label: 'Chave de API',    icon: KeyRound },
  { id: 3, label: 'Datadog',         icon: Database },
] as const

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((step, idx) => {
        const done = current > step.id
        const active = current === step.id
        return (
          <div key={step.id} className="flex items-center gap-2">
            <motion.div
              layout
              className="flex h-7 w-7 items-center justify-center rounded-[6px] text-xs font-bold"
              animate={{ scale: active ? 1.12 : 1 }}
              transition={{ duration: 0.2 }}
              style={{
                background: done
                  ? 'var(--color-primary)'
                  : active
                    ? 'var(--color-primary-soft)'
                    : 'var(--color-border)',
                color: done
                  ? '#fff'
                  : active
                    ? 'var(--color-primary-strong)'
                    : 'var(--color-muted-foreground)',
                border: active ? '2px solid var(--color-primary)' : '2px solid transparent',
              }}
            >
              {done ? <Check size={13} /> : step.id}
            </motion.div>
            {idx < STEPS.length - 1 && (
              <div
                className="h-0.5 w-6 rounded-[2px] transition-colors duration-300"
                style={{ background: done ? 'var(--color-primary)' : 'var(--color-border)' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Wrapper ────────────────────────────────────────────────────────────────────

function WizardCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10" style={{ background: 'var(--app-background)' }}>
      <div className="w-full max-w-lg">
        <motion.div
          className="rounded-[var(--radius-nb-lg)] border p-8"
          style={{ borderColor: 'var(--color-hairline)', background: 'var(--color-card)', boxShadow: 'var(--shadow-brutal)' }}
          {...fadeInUp}
        >
          {children}
        </motion.div>
      </div>
    </div>
  )
}

// ── Step 1: Account creation ───────────────────────────────────────────────────

interface Step1Props {
  onSuccess: (apiKey: string) => void
}

function Step1Account({ onSuccess }: Step1Props) {
  const { bootstrapSetup } = useAuth()
  const [tenantName, setTenantName] = useState('')
  const [tenantSlug, setTenantSlug] = useState('')
  const [tenantSlugTouched, setTenantSlugTouched] = useState(false)
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldTouched, setFieldTouched] = useState({
    tenantName: false, tenantSlug: false, adminName: false, adminEmail: false, password: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const normalizedTenantSlug = useMemo(
    () => tenantSlug.trim().toLowerCase().normalize('NFD')
      .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]+/g, '-')
      .replace(/-{2,}/g, '-').replace(/^-|-$/g, ''),
    [tenantSlug],
  )
  const normalizedTenantNameSlug = useMemo(
    () => tenantName.trim().toLowerCase().normalize('NFD')
      .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]+/g, '-')
      .replace(/-{2,}/g, '-').replace(/^-|-$/g, ''),
    [tenantName],
  )
  const normalizedAdminEmail = adminEmail.trim().toLowerCase()

  const tenantNameError = useMemo(() => {
    if (!fieldTouched.tenantName) return null
    if (!tenantName.trim()) return 'Informe o nome da companhia.'
    if (tenantName.trim().length < 2) return 'Use pelo menos 2 caracteres.'
    return null
  }, [fieldTouched.tenantName, tenantName])
  const tenantSlugError = useMemo(() => {
    if (!fieldTouched.tenantSlug) return null
    if (!normalizedTenantSlug || normalizedTenantSlug.length < 3) return 'Use pelo menos 3 caracteres (letras, números e hífen).'
    return null
  }, [fieldTouched.tenantSlug, normalizedTenantSlug])
  const adminNameError = useMemo(() => {
    if (!fieldTouched.adminName) return null
    if (!adminName.trim() || adminName.trim().length < 2) return 'Informe o nome do admin (mín. 2 chars).'
    return null
  }, [adminName, fieldTouched.adminName])
  const adminEmailError = useMemo(() => {
    if (!fieldTouched.adminEmail) return null
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedAdminEmail)) return 'Informe um email válido.'
    return null
  }, [fieldTouched.adminEmail, normalizedAdminEmail])
  const passwordError = useMemo(() => {
    if (!fieldTouched.password) return null
    if (password.trim().length < 10) return 'A senha precisa ter pelo menos 10 caracteres.'
    return null
  }, [fieldTouched.password, password])

  const formValid = !tenantNameError && !tenantSlugError && !adminNameError
    && !adminEmailError && !passwordError
    && !!tenantName.trim() && !!normalizedTenantSlug && !!adminName.trim()
    && !!normalizedAdminEmail && password.trim().length >= 10

  useEffect(() => {
    if (!tenantSlugTouched) setTenantSlug(normalizedTenantNameSlug)
  }, [normalizedTenantNameSlug, tenantSlugTouched])

  useEffect(() => { setError(null) }, [tenantName, tenantSlug, adminName, adminEmail, password])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFieldTouched({ tenantName: true, tenantSlug: true, adminName: true, adminEmail: true, password: true })
    if (!formValid) return
    setSubmitting(true)
    setError(null)
    try {
      const apiKey = await bootstrapSetup({
        tenantName: tenantName.trim(),
        tenantSlug: normalizedTenantSlug,
        adminName: adminName.trim(),
        adminEmail: normalizedAdminEmail,
        password: password.trim(),
      })
      onSuccess(apiKey ?? '')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível criar a conta agora.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <WizardCard>
      <StepDots current={1} />
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-[1.4rem]" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary-strong)' }}>
          <Building2 size={22} />
        </div>
        <div>
          <h2 className="family-neighbor text-xl font-bold tracking-tight" style={{ color: 'var(--color-foreground)' }}>
            Crie sua conta
          </h2>
          <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Etapa 1 de 3 — workspace e admin</p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1.5 block text-sm font-semibold" htmlFor="tenantName">Nome da companhia</label>
          <input id="tenantName" className="input-field" value={tenantName}
            onChange={e => { setFieldTouched(c => ({ ...c, tenantName: true })); setTenantName(e.target.value) }}
            onBlur={() => setFieldTouched(c => ({ ...c, tenantName: true }))}
            placeholder="Jeitto" autoComplete="organization" />
          {tenantNameError && <p className="mt-1.5 text-xs" style={{ color: '#d8341a' }}>{tenantNameError}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold" htmlFor="tenantSlug">Slug do tenant</label>
          <input id="tenantSlug" className="input-field" value={tenantSlug}
            onChange={e => { setFieldTouched(c => ({ ...c, tenantSlug: true })); setTenantSlugTouched(true); setTenantSlug(e.target.value) }}
            onBlur={() => setFieldTouched(c => ({ ...c, tenantSlug: true }))}
            placeholder="jeitto" />
          <p className="mt-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            Valor enviado: <code>{normalizedTenantSlug || 'slug-invalido'}</code>
          </p>
          {tenantSlugError && <p className="mt-1.5 text-xs" style={{ color: '#d8341a' }}>{tenantSlugError}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold" htmlFor="adminName">Nome do admin</label>
          <input id="adminName" className="input-field" value={adminName}
            onChange={e => { setFieldTouched(c => ({ ...c, adminName: true })); setAdminName(e.target.value) }}
            onBlur={() => setFieldTouched(c => ({ ...c, adminName: true }))}
            placeholder="Pessoa administradora" autoComplete="name" />
          {adminNameError && <p className="mt-1.5 text-xs" style={{ color: '#d8341a' }}>{adminNameError}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold" htmlFor="adminEmail">Email do admin</label>
          <input id="adminEmail" className="input-field" value={adminEmail}
            onChange={e => { setFieldTouched(c => ({ ...c, adminEmail: true })); setAdminEmail(e.target.value) }}
            onBlur={() => setFieldTouched(c => ({ ...c, adminEmail: true }))}
            placeholder="admin@empresa.com" autoComplete="email" />
          {adminEmailError && <p className="mt-1.5 text-xs" style={{ color: '#d8341a' }}>{adminEmailError}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold" htmlFor="password">Senha inicial</label>
          <input id="password" className="input-field" type="password" value={password}
            onChange={e => { setFieldTouched(c => ({ ...c, password: true })); setPassword(e.target.value) }}
            onBlur={() => setFieldTouched(c => ({ ...c, password: true }))}
            placeholder="Use pelo menos 10 caracteres" autoComplete="new-password" />
          {passwordError
            ? <p className="mt-1.5 text-xs" style={{ color: '#d8341a' }}>{passwordError}</p>
            : password.trim()
              ? <p className="mt-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{password.trim().length} caracteres.</p>
              : null}
        </div>

        {error && (
          <div className="jc-alert jc-alert-danger">
            {error}
          </div>
        )}

        <button className="button-jeitto w-full" type="submit" disabled={submitting || !formValid}
          style={{ background: 'var(--color-primary)', color: '#fff', opacity: submitting || !formValid ? 0.7 : 1 }}>
          {submitting
            ? <><Loader2 size={16} className="inline animate-spin mr-2" />Criando conta...</>
            : <><span>Criar conta</span><ChevronRight size={16} className="inline ml-2" /></>}
        </button>
      </form>

      <p className="mt-5 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
        Já tem conta? <Link to="/login" className="font-semibold" style={{ color: 'var(--color-primary-strong)' }}>Entrar</Link>
      </p>
    </WizardCard>
  )
}

// ── Step 2: chave de API (MCP) ───────────────────────────────────────────────────

interface Step2Props {
  apiKey: string
  onNext: () => void
}

function Step2ApiKey({ apiKey, onNext }: Step2Props) {
  const [copied, setCopied] = useState(false)

  return (
    <WizardCard>
      <StepDots current={2} />
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-[1.4rem]" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary-strong)' }}>
          <KeyRound size={22} />
        </div>
        <div>
          <h2 className="family-neighbor text-xl font-bold tracking-tight" style={{ color: 'var(--color-foreground)' }}>
            Chave de API
          </h2>
          <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Etapa 2 de 3 — exibida apenas uma vez</p>
        </div>
      </div>

      <p className="mb-4 text-sm leading-6" style={{ color: 'var(--color-muted-foreground)' }}>
        Guarde a chave de API abaixo. Ela é a credencial de leitura do <strong style={{ color: 'var(--color-foreground)' }}>MCP do Titlis</strong> —
        autentica agentes de IA e clientes MCP (como o Claude) que consultam hub, scorecards, cobertura,
        SLOs e custos a partir de fora. Não é possível recuperá-la depois.
      </p>

      <div className="rounded-[var(--radius-nb)] border p-4 mb-4" style={{ borderColor: 'var(--color-hairline)', background: 'var(--app-background)', boxShadow: 'var(--shadow-brutal-sm)' }}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
          Chave de API (MCP)
        </p>
        <div className="flex items-center gap-3">
          <code className="flex-1 break-all text-sm font-mono" style={{ color: 'var(--color-primary-strong)' }}>
            {apiKey}
          </code>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(apiKey)
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border transition-colors"
            style={{ borderColor: 'var(--color-hairline)', color: copied ? 'var(--color-primary-strong)' : 'var(--color-muted-foreground)' }}
            title="Copiar chave"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      <div className="jc-alert jc-alert-warning mb-6">
        Use <code>Authorization: Bearer &lt;chave&gt;</code> ao configurar um cliente MCP
        apontando para o <code>titlis-mcp</code>. Você pode gerar novas chaves depois em Configurações → Chaves de API.
      </div>

      <button
        type="button"
        className="button-jeitto w-full flex items-center justify-center gap-2"
        style={{ background: 'var(--color-primary)', color: '#fff' }}
        onClick={onNext}
      >
        Já copiei, continuar <ChevronRight size={16} />
      </button>
    </WizardCard>
  )
}

// ── Step 4: Datadog ────────────────────────────────────────────────────────────

interface Step4Props {
  onFinish: () => void
}

const DD_SITE_OPTIONS = [
  { value: 'datadoghq.com', label: 'US1 — datadoghq.com' },
  { value: 'us3.datadoghq.com', label: 'US3 — us3.datadoghq.com' },
  { value: 'us5.datadoghq.com', label: 'US5 — us5.datadoghq.com' },
  { value: 'datadoghq.eu', label: 'EU — datadoghq.eu' },
  { value: 'ap1.datadoghq.com', label: 'AP1 — ap1.datadoghq.com' },
] as const

function Step4Datadog({ onFinish }: Step4Props) {
  const [ddApiKey, setDdApiKey] = useState('')
  const [ddAppKey, setDdAppKey] = useState('')
  const [site, setSite] = useState('datadoghq.com')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [probeResult, setProbeResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!ddApiKey.trim()) {
      setError('Informe a DD API Key.')
      return
    }
    setSaving(true)
    setError(null)
    setProbeResult(null)
    try {
      await api.datadogConfig.save({
        ddApiKey: ddApiKey.trim(),
        ddAppKey: ddAppKey.trim() || undefined,
        site,
      })
      // /settings/datadog/status nunca faz probe de verdade (só diz se há credencial salva) —
      // o único jeito de confirmar que a credencial funciona é datadogSettings.test(), que chama
      // a API do Datadog de fato.
      setTesting(true)
      try {
        const result = await api.datadogSettings.test()
        setProbeResult(result)
      } finally {
        setTesting(false)
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar as credenciais.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <WizardCard>
      <StepDots current={3} />
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-[1.4rem]" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary-strong)' }}>
          <Database size={22} />
        </div>
        <div>
          <h2 className="family-neighbor text-xl font-bold tracking-tight" style={{ color: 'var(--color-foreground)' }}>
            Conecte o Datadog
          </h2>
          <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Etapa 3 de 3 — métricas para recomendações de HPA</p>
        </div>
      </div>

      <p className="mb-5 text-sm leading-6" style={{ color: 'var(--color-muted-foreground)' }}>
        As credenciais são usadas pela coleta de métricas (via API Datadog) para consultar CPU e
        réplicas e gerar recomendações de HPA. Nunca são exibidas após salvas.
      </p>

      <form className="space-y-4" onSubmit={handleSave}>
        <div>
          <label className="mb-1.5 block text-sm font-semibold" htmlFor="ddApiKey">
            DD API Key <span className="text-xs font-normal" style={{ color: 'var(--color-muted-foreground)' }}>(obrigatória)</span>
          </label>
          <input
            id="ddApiKey"
            className="input-field font-mono"
            type="password"
            value={ddApiKey}
            onChange={e => { setDdApiKey(e.target.value); setProbeResult(null) }}
            placeholder="••••••••••••••••••••"
            autoComplete="new-password"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold" htmlFor="ddAppKey">
            DD Application Key <span className="text-xs font-normal" style={{ color: 'var(--color-muted-foreground)' }}>(recomendada)</span>
          </label>
          <input
            id="ddAppKey"
            className="input-field font-mono"
            type="password"
            value={ddAppKey}
            onChange={e => { setDdAppKey(e.target.value); setProbeResult(null) }}
            placeholder="••••••••••••••••••••"
            autoComplete="new-password"
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            Necessária para consultar métricas de workloads individuais.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold" htmlFor="ddSite">
            Site do Datadog <span className="text-xs font-normal" style={{ color: 'var(--color-muted-foreground)' }}>(obrigatório)</span>
          </label>
          <select
            id="ddSite"
            className="jc-select w-full px-4 py-3 text-sm"
            value={site}
            onChange={e => { setSite(e.target.value); setProbeResult(null) }}
          >
            {DD_SITE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            A região da sua conta Datadog — em Organization Settings no Datadog.
          </p>
        </div>

        {error && (
          <div className="jc-alert jc-alert-danger">
            {error}
          </div>
        )}

        {probeResult && (
          <div className={`jc-alert flex items-center gap-2 ${probeResult.ok ? 'jc-alert-success' : 'jc-alert-danger'}`}>
            {probeResult.ok ? <Check size={14} /> : <Zap size={14} />}
            <span>{probeResult.ok ? 'Conexão com Datadog verificada com sucesso!' : probeResult.message}</span>
          </div>
        )}

        <button
          className="button-jeitto w-full flex items-center justify-center gap-2"
          type="submit"
          disabled={saving || testing || !ddApiKey.trim()}
          style={{ background: 'var(--color-primary)', color: '#fff', opacity: saving || testing || !ddApiKey.trim() ? 0.7 : 1 }}
        >
          {saving || testing
            ? <><Loader2 size={16} className="animate-spin" />{saving ? 'Salvando...' : 'Testando conexão...'}</>
            : probeResult?.ok
              ? <><Check size={16} /><span>Salvo com sucesso</span></>
              : <><ShieldCheck size={16} /><span>Salvar e testar conexão</span></>}
        </button>
      </form>

      <button
        type="button"
        className="mt-3 w-full text-sm text-center transition-opacity hover:opacity-70"
        style={{ color: 'var(--color-muted-foreground)' }}
        onClick={onFinish}
      >
        {probeResult?.ok ? 'Entrar no painel →' : 'Pular por agora — configurar depois em Configurações'}
      </button>
    </WizardCard>
  )
}

// ── Main Onboarding component ──────────────────────────────────────────────────

export function Onboarding() {
  const navigate = useNavigate()
  const { status, bootstrapStatus } = useAuth()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [mcpApiKey, setMcpApiKey] = useState('')

  if (status === 'loading') return null

  if (status === 'authenticated' && bootstrapStatus && !bootstrapStatus.bootstrapRequired && step === 1) {
    return <Navigate to="/" replace />
  }

  function handleAccountCreated(apiKey: string) {
    setMcpApiKey(apiKey)
    setStep(2)
  }

  function goToDashboard() {
    localStorage.removeItem('titlis.onboarding.dismissed')
    navigate('/getting-started', { replace: true })
  }

  if (step === 1) return <Step1Account onSuccess={handleAccountCreated} />
  if (step === 2) return <Step2ApiKey apiKey={mcpApiKey} onNext={() => setStep(3)} />
  return <Step4Datadog onFinish={goToDashboard} />
}
