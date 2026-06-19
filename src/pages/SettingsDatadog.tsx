import { useEffect, useState } from 'react'
import { Activity, CheckCircle, Database, XCircle } from 'lucide-react'
import { Card } from '@/components/jeitto/Card'
import { PageError, PageLoading } from '@/components/jeitto/PageState'
import { Header } from '@/components/layout/Header'
import { useDatadogQueueSettings, useSaveDatadogSettings, useTestDatadogConnection } from '@/hooks/useApi'
import { formatDate } from '@/lib/utils'

export function SettingsDatadog() {
  const { data: settings, isLoading, error } = useDatadogQueueSettings()
  const saveMutation = useSaveDatadogSettings()
  const testMutation = useTestDatadogConnection()

  const [ddApiKey, setDdApiKey] = useState('')
  const [ddAppKey, setDdAppKey] = useState('')
  const [site, setSite] = useState('datadoghq.com')
  const [queueEnabled, setQueueEnabled] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    if (settings) {
      setQueueEnabled(settings.queueMonitoringEnabled)
    }
  }, [settings])

  async function handleSave() {
    setSaveStatus('saving')
    setTestResult(null)
    try {
      await saveMutation.mutateAsync({
        ...(ddApiKey.trim() ? { ddApiKey: ddApiKey.trim() } : {}),
        ...(ddAppKey.trim() ? { ddAppKey: ddAppKey.trim() } : {}),
        ...(site.trim() ? { site: site.trim() } : {}),
        queueMonitoringEnabled: queueEnabled,
      })
      setDdApiKey('')
      setDdAppKey('')
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 4000)
    }
  }

  async function handleTest() {
    setTestResult(null)
    try {
      const result = await testMutation.mutateAsync()
      setTestResult(result)
    } catch {
      setTestResult({ ok: false, message: 'Erro ao testar conexão.' })
    }
  }

  if (isLoading) return <><Header title="Configuração Datadog" /><PageLoading /></>
  if (error) {
    return (
      <>
        <Header title="Configuração Datadog" />
        <PageError message={error instanceof Error ? error.message : undefined} />
      </>
    )
  }

  const probeColor = settings?.probeStatus === 'ok'
    ? 'text-emerald-500'
    : settings?.probeStatus === 'error'
      ? 'text-red-500'
      : 'text-amber-500'

  const probeLabel = settings?.probeStatus === 'ok'
    ? 'Conectado'
    : settings?.probeStatus === 'error'
      ? 'Erro de conexão'
      : 'Não configurado'

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title="Configuração Datadog"
        subtitle="Credenciais e monitoramento de filas via Datadog."
      />

      <div className="flex-1 space-y-6 px-4 py-6 lg:px-8 max-w-3xl">

        {/* Status atual */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} style={{ color: 'var(--color-primary)' }} />
            <p className="text-[13px] font-semibold" style={{ color: 'var(--color-foreground)' }}>
              Status atual
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-muted)' }}>
              <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Conexão</p>
              <p className={`mt-1 text-sm font-black ${probeColor}`}>{probeLabel}</p>
            </div>
            <div className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-muted)' }}>
              <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Última coleta</p>
              <p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>
                {settings?.lastCollectedAt ? formatDate(settings.lastCollectedAt) : 'Nunca'}
              </p>
            </div>
            <div className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-muted)' }}>
              <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Monitores ativos</p>
              <p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>
                {settings?.activeMonitorCount ?? 0}
              </p>
            </div>
          </div>

          {settings && settings.queuesByState && (
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {[
                ['Descoberta', settings.queuesByState.discovering],
                ['Aprendendo', settings.queuesByState.learning],
                ['Monitorando', settings.queuesByState.monitoring],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-muted)' }}>
                  <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{label}</p>
                  <p className="mt-1 text-sm font-black" style={{ color: 'var(--color-foreground)' }}>{value} filas</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Credenciais */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Database size={16} style={{ color: 'var(--color-primary)' }} />
            <p className="text-[13px] font-semibold" style={{ color: 'var(--color-foreground)' }}>
              Credenciais
            </p>
          </div>

          <p className="mb-4 text-[13px]" style={{ color: 'var(--color-muted-foreground)' }}>
            As chaves são armazenadas de forma criptografada. Deixe em branco para manter as chaves atuais.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>
                API Key
              </label>
              <input
                type="password"
                value={ddApiKey}
                onChange={e => setDdApiKey(e.target.value)}
                placeholder={settings?.configured ? '••••••••' : 'dd-api-...'}
                autoComplete="off"
                className="h-10 w-full rounded-xl border bg-transparent px-4 text-sm outline-none focus:ring-1"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>
                Application Key
              </label>
              <input
                type="password"
                value={ddAppKey}
                onChange={e => setDdAppKey(e.target.value)}
                placeholder={settings?.configured ? '••••••••' : 'dd-app-key-...'}
                autoComplete="off"
                className="h-10 w-full rounded-xl border bg-transparent px-4 text-sm outline-none focus:ring-1"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>
                Site Datadog
              </label>
              <select
                value={site}
                onChange={e => setSite(e.target.value)}
                className="h-10 w-full rounded-xl border bg-transparent px-4 text-sm outline-none focus:ring-1"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
              >
                <option value="datadoghq.com">datadoghq.com (US)</option>
                <option value="datadoghq.eu">datadoghq.eu (EU)</option>
                <option value="us3.datadoghq.com">us3.datadoghq.com (US3)</option>
                <option value="us5.datadoghq.com">us5.datadoghq.com (US5)</option>
              </select>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-muted)' }}>
              <input
                id="queue-enabled"
                type="checkbox"
                checked={queueEnabled}
                onChange={e => setQueueEnabled(e.target.checked)}
                className="h-4 w-4 rounded accent-[var(--color-primary)]"
              />
              <label htmlFor="queue-enabled" className="text-[13px] font-medium cursor-pointer" style={{ color: 'var(--color-foreground)' }}>
                Habilitar monitoramento de filas
              </label>
            </div>

            {testResult && (
              <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${testResult.ok ? 'bg-emerald-900/20 text-emerald-400' : 'bg-red-900/20 text-red-400'}`}>
                {testResult.ok
                  ? <CheckCircle size={16} />
                  : <XCircle size={16} />}
                {testResult.message}
              </div>
            )}

            {saveStatus === 'error' && (
              <p className="text-sm text-red-500">Erro ao salvar. Tente novamente.</p>
            )}
            {saveStatus === 'saved' && (
              <p className="text-sm text-emerald-500">Configurações salvas com sucesso.</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
                className="inline-flex h-10 items-center gap-2 rounded-xl px-5 text-sm font-semibold transition-opacity disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
              >
                {saveStatus === 'saving' ? 'Salvando…' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={handleTest}
                disabled={testMutation.isPending}
                className="inline-flex h-10 items-center gap-2 rounded-xl border px-5 text-sm font-semibold transition-opacity disabled:opacity-50"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
              >
                {testMutation.isPending ? 'Testando…' : 'Testar Conexão'}
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
