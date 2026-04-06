import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Circle, Loader2, Server, ShieldCheck, Zap } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

const DISMISSED_KEY = 'titlis.onboarding.dismissed'

export function GettingStarted() {
  const navigate = useNavigate()

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) {
      navigate('/', { replace: true })
    }
  }, [navigate])

  const { data: connectionStatus } = useQuery({
    queryKey: ['getting-started-connection'],
    queryFn: () => api.apiKeys.connectionStatus(),
    refetchInterval: 10_000,
    staleTime: 0,
  })

  const { data: workloads, isLoading } = useQuery({
    queryKey: ['getting-started-poll'],
    queryFn: () => api.dashboard.list(),
    refetchInterval: 10_000,
    staleTime: 0,
  })

  const isConnected = connectionStatus?.connected ?? false
  const hasData = (workloads?.length ?? 0) > 0

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    navigate('/', { replace: true })
  }

  const steps: { icon: typeof ShieldCheck; done: boolean; title: string; body: React.ReactNode }[] = [
    {
      icon: ShieldCheck,
      done: true,
      title: 'Conta criada',
      body: (
        <p className="text-sm leading-6" style={{ color: 'var(--color-muted-foreground)' }}>
          Tenant e usuário administrador configurados com sucesso.
        </p>
      ),
    },
    {
      icon: Server,
      done: isConnected,
      title: 'Instalar e configurar o operator',
      body: (
        <div className="space-y-3">
          <p className="text-sm leading-6" style={{ color: 'var(--color-muted-foreground)' }}>
            No cluster Kubernetes de destino, configure as variáveis de ambiente abaixo e aplique o Helm chart.
          </p>
          <div className="rounded-xl border px-4 py-3 font-mono text-xs leading-6" style={{ borderColor: 'var(--color-border)', background: 'var(--app-background)', color: 'var(--color-foreground)' }}>
            <p>TITLIS_API_ENABLED=<span style={{ color: 'var(--color-primary-strong)' }}>true</span></p>
            <p>TITLIS_API_HOST=<span style={{ color: 'var(--color-primary-strong)' }}>titlis-api.titlis-system.svc.cluster.local</span></p>
            <p>TITLIS_API_API_KEY=<span style={{ color: 'var(--color-primary-strong)' }}>&lt;chave copiada na etapa anterior&gt;</span></p>
          </div>
          <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            Consulte as instruções completas em <code>titlis-operator/charts/titlis-operator/README.md</code>.
          </p>
        </div>
      ),
    },
    {
      icon: Zap,
      done: hasData,
      title: 'Aguardando primeiros dados',
      body: hasData ? (
        <p className="text-sm leading-6" style={{ color: 'var(--color-muted-foreground)' }}>
          {workloads!.length} workload{workloads!.length !== 1 ? 's' : ''} encontrado{workloads!.length !== 1 ? 's' : ''}. O painel já tem dados para exibir.
        </p>
      ) : (
        <div className="flex items-center gap-3">
          {isLoading ? null : (
            <Loader2 size={14} className="animate-spin shrink-0" style={{ color: 'var(--color-muted-foreground)' }} />
          )}
          <p className="text-sm leading-6" style={{ color: 'var(--color-muted-foreground)' }}>
            Verificando a cada 10 segundos. Assim que o operator enviar o primeiro scorecard, esta etapa será marcada como concluída.
          </p>
        </div>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-sm font-extrabold uppercase tracking-[0.18em]" style={{ color: 'var(--color-primary-strong)' }}>
        Primeiros passos
      </p>
      <h1 className="family-neighbor mt-3 text-3xl font-black tracking-tight" style={{ color: 'var(--color-foreground)' }}>
        Configure o Titlis no seu cluster
      </h1>
      <p className="mt-3 text-sm leading-6" style={{ color: 'var(--color-muted-foreground)' }}>
        Siga as etapas abaixo para conectar o operator ao painel. Você pode navegar pelo produto normalmente enquanto isso.
      </p>

      <ol className="mt-10 space-y-4">
        {steps.map((step, index) => {
          const Icon = step.icon
          return (
            <li
              key={step.title}
              className="flex gap-4 rounded-[1.6rem] border p-5"
              style={{
                borderColor: step.done ? 'var(--color-primary-soft)' : 'var(--color-border)',
                background: 'var(--color-card)',
              }}
            >
              <div className="flex flex-col items-center gap-2 pt-0.5">
                {step.done ? (
                  <CheckCircle2 size={22} style={{ color: 'var(--color-primary-strong)' }} />
                ) : (
                  <Circle size={22} style={{ color: 'var(--color-muted-foreground)', opacity: 0.4 }} />
                )}
                {index < steps.length - 1 && (
                  <div className="w-px flex-1" style={{ background: 'var(--color-border)', minHeight: '1.5rem' }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={16} style={{ color: step.done ? 'var(--color-primary-strong)' : 'var(--color-muted-foreground)' }} />
                  <p
                    className="text-sm font-semibold"
                    style={{ color: step.done ? 'var(--color-foreground)' : 'var(--color-muted-foreground)' }}
                  >
                    {step.title}
                  </p>
                </div>
                {step.body}
              </div>
            </li>
          )
        })}
      </ol>

      <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          className="button-jeitto"
          style={{
            background: hasData ? 'var(--color-primary)' : undefined,
            color: hasData ? '#fff' : undefined,
          }}
          onClick={dismiss}
        >
          {hasData ? 'Ir para o painel' : 'Pular e ir para o painel'}
        </button>
        {!hasData && (
          <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            Esta tela não aparecerá novamente após sair dela.
          </p>
        )}
      </div>
    </div>
  )
}
