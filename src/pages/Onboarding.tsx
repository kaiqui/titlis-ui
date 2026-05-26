import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Navigate, Link, useNavigate } from 'react-router-dom'
import {
  Bot,
  Building2,
  Check,
  ChevronRight,
  Copy,
  Database,
  GitBranch,
  KeyRound,
  Loader2,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/contexts/useAuth'
import { api } from '@/lib/api'

// ── Step indicators ────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Conta',           icon: Building2 },
  { id: 2, label: 'Chave operator',  icon: KeyRound },
  { id: 3, label: 'ARIA + GitHub',   icon: Bot },
  { id: 4, label: 'Datadog',         icon: Database },
] as const

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((step, idx) => {
        const done = current > step.id
        const active = current === step.id
        return (
          <div key={step.id} className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all"
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
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className="h-0.5 w-6 rounded-full"
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
        <div className="rounded-[2.4rem] border p-8" style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
          {children}
        </div>
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
          <h2 className="family-neighbor text-xl font-black tracking-tight" style={{ color: 'var(--color-foreground)' }}>
            Crie sua conta
          </h2>
          <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Etapa 1 de 4 — workspace e admin</p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1.5 block text-sm font-semibold" htmlFor="tenantName">Nome da companhia</label>
          <input id="tenantName" className="input-field" value={tenantName}
            onChange={e => { setFieldTouched(c => ({ ...c, tenantName: true })); setTenantName(e.target.value) }}
            onBlur={() => setFieldTouched(c => ({ ...c, tenantName: true }))}
            placeholder="Jeitto" autoComplete="organization" />
          {tenantNameError && <p className="mt-1.5 text-xs" style={{ color: '#dc2626' }}>{tenantNameError}</p>}
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
          {tenantSlugError && <p className="mt-1.5 text-xs" style={{ color: '#dc2626' }}>{tenantSlugError}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold" htmlFor="adminName">Nome do admin</label>
          <input id="adminName" className="input-field" value={adminName}
            onChange={e => { setFieldTouched(c => ({ ...c, adminName: true })); setAdminName(e.target.value) }}
            onBlur={() => setFieldTouched(c => ({ ...c, adminName: true }))}
            placeholder="Pessoa administradora" autoComplete="name" />
          {adminNameError && <p className="mt-1.5 text-xs" style={{ color: '#dc2626' }}>{adminNameError}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold" htmlFor="adminEmail">Email do admin</label>
          <input id="adminEmail" className="input-field" value={adminEmail}
            onChange={e => { setFieldTouched(c => ({ ...c, adminEmail: true })); setAdminEmail(e.target.value) }}
            onBlur={() => setFieldTouched(c => ({ ...c, adminEmail: true }))}
            placeholder="admin@empresa.com" autoComplete="email" />
          {adminEmailError && <p className="mt-1.5 text-xs" style={{ color: '#dc2626' }}>{adminEmailError}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold" htmlFor="password">Senha inicial</label>
          <input id="password" className="input-field" type="password" value={password}
            onChange={e => { setFieldTouched(c => ({ ...c, password: true })); setPassword(e.target.value) }}
            onBlur={() => setFieldTouched(c => ({ ...c, password: true }))}
            placeholder="Use pelo menos 10 caracteres" autoComplete="new-password" />
          {passwordError
            ? <p className="mt-1.5 text-xs" style={{ color: '#dc2626' }}>{passwordError}</p>
            : password.trim()
              ? <p className="mt-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{password.trim().length} caracteres.</p>
              : null}
        </div>

        {error && (
          <div className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: 'rgba(239,68,68,0.22)', color: '#dc2626', background: 'rgba(254,242,242,0.8)' }}>
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

// ── Step 2: Operator API key ───────────────────────────────────────────────────

interface Step2Props {
  apiKey: string
  onNext: () => void
}

function Step2OperatorKey({ apiKey, onNext }: Step2Props) {
  const [copied, setCopied] = useState(false)

  return (
    <WizardCard>
      <StepDots current={2} />
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-[1.4rem]" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary-strong)' }}>
          <KeyRound size={22} />
        </div>
        <div>
          <h2 className="family-neighbor text-xl font-black tracking-tight" style={{ color: 'var(--color-foreground)' }}>
            Chave do operator
          </h2>
          <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Etapa 2 de 4 — exibida apenas uma vez</p>
        </div>
      </div>

      <p className="mb-4 text-sm leading-6" style={{ color: 'var(--color-muted-foreground)' }}>
        Guarde a chave de API abaixo. Ela será usada pelo <code>titlis-operator-go</code> para
        autenticar eventos enviados à plataforma. Não é possível recuperá-la depois.
      </p>

      <div className="rounded-2xl border p-4 mb-4" style={{ borderColor: 'var(--color-border)', background: 'var(--app-background)' }}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
          TITLIS_API_API_KEY
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
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors"
            style={{ borderColor: 'var(--color-border)', color: copied ? 'var(--color-primary-strong)' : 'var(--color-muted-foreground)' }}
            title="Copiar chave"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border px-4 py-3 text-xs leading-5" style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(255,251,235,0.8)', color: '#92400e' }}>
        <strong>Configure no operator:</strong> <code>TITLIS_API_API_KEY=&lt;chave&gt;</code>
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

// ── Step 3: ARIA + GitHub config ───────────────────────────────────────────────

const AI_PROVIDERS = ['openai', 'anthropic', 'gemini', 'mistral'] as const

interface Step3Props {
  onNext: () => void
  onSkip: () => void
}

function Step3Aria({ onNext, onSkip }: Step3Props) {
  const [provider, setProvider] = useState('openai')
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [githubToken, setGithubToken] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const modelPlaceholder =
    provider === 'openai' ? 'gpt-4o' :
    provider === 'anthropic' ? 'claude-sonnet-4-6' :
    provider === 'gemini' ? 'gemini-2.5-flash' :
    provider === 'mistral' ? 'mistral-large-latest' : 'modelo'

  const canSubmit = !!apiKey.trim() && !!model.trim()

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      await api.aiConfig.upsert({
        provider,
        model: model.trim() || modelPlaceholder,
        apiKey: apiKey.trim(),
        githubToken: githubToken.trim() || undefined,
      })
      onNext()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar a configuração.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <WizardCard>
      <StepDots current={3} />
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-[1.4rem]" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary-strong)' }}>
          <Bot size={22} />
        </div>
        <div>
          <h2 className="family-neighbor text-xl font-black tracking-tight" style={{ color: 'var(--color-foreground)' }}>
            Configure a ARIA
          </h2>
          <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Etapa 3 de 4 — assistente IA e automação de PRs</p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1.5 block text-sm font-semibold" htmlFor="provider">Provedor LLM</label>
          <select
            id="provider"
            className="input-field"
            value={provider}
            onChange={e => setProvider(e.target.value)}
          >
            {AI_PROVIDERS.map(p => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold" htmlFor="model">Modelo</label>
          <input
            id="model"
            className="input-field"
            value={model}
            onChange={e => setModel(e.target.value)}
            placeholder={modelPlaceholder}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold" htmlFor="aiApiKey">
            Chave de API do LLM
          </label>
          <input
            id="aiApiKey"
            className="input-field"
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-..."
            autoComplete="new-password"
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            Nunca exibida após salva.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold" htmlFor="githubToken">
            <span className="flex items-center gap-1.5">
              <GitBranch size={13} />
              GitHub Classic Token <span className="font-normal">(opcional)</span>
            </span>
          </label>
          <input
            id="githubToken"
            className="input-field"
            type="password"
            value={githubToken}
            onChange={e => setGithubToken(e.target.value)}
            placeholder="ghp_..."
            autoComplete="new-password"
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            Necessário para abertura de PRs automáticos. Permissões: <code>repo</code>.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: 'rgba(239,68,68,0.22)', color: '#dc2626', background: 'rgba(254,242,242,0.8)' }}>
            {error}
          </div>
        )}

        <button
          className="button-jeitto w-full flex items-center justify-center gap-2"
          type="submit"
          disabled={submitting || !canSubmit}
          style={{ background: 'var(--color-primary)', color: '#fff', opacity: submitting || !canSubmit ? 0.7 : 1 }}
        >
          {submitting
            ? <><Loader2 size={16} className="animate-spin" />Salvando...</>
            : <><span>Salvar e continuar</span><ChevronRight size={16} /></>}
        </button>
      </form>

      <button
        type="button"
        className="mt-3 w-full text-sm text-center transition-opacity hover:opacity-70"
        style={{ color: 'var(--color-muted-foreground)' }}
        onClick={onSkip}
      >
        Pular por agora — configurar depois em Configurações
      </button>
    </WizardCard>
  )
}

// ── Step 4: Datadog ────────────────────────────────────────────────────────────

interface Step4Props {
  onFinish: () => void
}

function Step4Datadog({ onFinish }: Step4Props) {
  const [ddApiKey, setDdApiKey] = useState('')
  const [ddAppKey, setDdAppKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [probeResult, setProbeResult] = useState<'ok' | 'error' | null>(null)
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
      })
      // After saving, run live probe via the status endpoint
      setTesting(true)
      try {
        const status = await api.datadogConfig.status()
        setProbeResult(status.probeStatus === 'ok' ? 'ok' : 'error')
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
      <StepDots current={4} />
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-[1.4rem]" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary-strong)' }}>
          <Database size={22} />
        </div>
        <div>
          <h2 className="family-neighbor text-xl font-black tracking-tight" style={{ color: 'var(--color-foreground)' }}>
            Conecte o Datadog
          </h2>
          <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Etapa 4 de 4 — métricas para recomendações de HPA</p>
        </div>
      </div>

      <p className="mb-5 text-sm leading-6" style={{ color: 'var(--color-muted-foreground)' }}>
        As credenciais serão usadas pelo <strong>titlis-insights</strong> para consultar métricas
        de CPU e réplicas e gerar recomendações de HPA. Nunca são exibidas após salvas.
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

        {error && (
          <div className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: 'rgba(239,68,68,0.22)', color: '#dc2626', background: 'rgba(254,242,242,0.8)' }}>
            {error}
          </div>
        )}

        {probeResult && (
          <div
            className="rounded-2xl border px-4 py-3 text-sm flex items-center gap-2"
            style={{
              borderColor: probeResult === 'ok' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.22)',
              color: probeResult === 'ok' ? '#16a34a' : '#dc2626',
              background: probeResult === 'ok' ? 'rgba(240,253,244,0.8)' : 'rgba(254,242,242,0.8)',
            }}
          >
            {probeResult === 'ok'
              ? <><Check size={14} /><span>Conexão com Datadog verificada com sucesso!</span></>
              : <><Zap size={14} /><span>Credenciais salvas, mas o probe falhou. Verifique as chaves.</span></>}
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
            : probeResult
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
        {probeResult === 'ok' ? 'Entrar no painel →' : 'Pular por agora — configurar depois em Configurações'}
      </button>
    </WizardCard>
  )
}

// ── Main Onboarding component ──────────────────────────────────────────────────

export function Onboarding() {
  const navigate = useNavigate()
  const { status, bootstrapStatus } = useAuth()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [operatorApiKey, setOperatorApiKey] = useState('')

  if (status === 'loading') return null

  if (status === 'authenticated' && bootstrapStatus && !bootstrapStatus.bootstrapRequired && step === 1) {
    return <Navigate to="/" replace />
  }

  function handleAccountCreated(apiKey: string) {
    setOperatorApiKey(apiKey)
    setStep(2)
  }

  function goToDashboard() {
    localStorage.removeItem('titlis.onboarding.dismissed')
    navigate('/getting-started', { replace: true })
  }

  if (step === 1) return <Step1Account onSuccess={handleAccountCreated} />
  if (step === 2) return <Step2OperatorKey apiKey={operatorApiKey} onNext={() => setStep(3)} />
  if (step === 3) return <Step3Aria onNext={() => setStep(4)} onSkip={() => setStep(4)} />
  return <Step4Datadog onFinish={goToDashboard} />
}
