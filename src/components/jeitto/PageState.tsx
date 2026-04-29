import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { ButtonDefault } from './ButtonDefault'

export function PageLoading() {
  return (
    <div className="flex min-h-[60vh] flex-1 items-center justify-center px-6">
      <motion.div
        className="flex flex-col items-center gap-4 rounded-[2rem] border px-10 py-10 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          borderColor: 'var(--color-border)',
          background: 'var(--hero-background)',
        }}
      >
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-2" style={{ borderColor: 'rgba(var(--color-primary-rgb), 0.2)' }} />
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-l-transparent border-r-transparent border-b-transparent"
            style={{ borderTopColor: 'var(--color-primary)' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
          />
        </div>
        <div>
          <p className="family-neighbor text-sm font-black tracking-tight" style={{ color: 'var(--color-foreground)' }}>
            Sincronizando visão operacional
          </p>
          <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            A UI está carregando os dados reais da API.
          </p>
        </div>
      </motion.div>
    </div>
  )
}

interface PageErrorProps {
  message?: string
  onRetry?: () => void
}

export function PageError({ message, onRetry }: PageErrorProps) {
  return (
    <div className="flex min-h-[60vh] flex-1 items-center justify-center px-6">
      <motion.div
        className="flex max-w-md flex-col items-center gap-4 rounded-[2rem] border px-8 py-10 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          borderColor: 'var(--color-border)',
          background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-card) 86%, white), color-mix(in srgb, var(--color-card) 98%, transparent))',
        }}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] bg-red-500/10">
          <AlertTriangle size={24} className="text-red-500" />
        </div>
        <div>
          <p className="family-neighbor text-base font-black tracking-tight" style={{ color: 'var(--color-foreground)' }}>
            Não foi possível carregar esta área
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {message ?? 'A conexão com a API falhou. Verifique se o titlis-api está em execução e tente novamente.'}
          </p>
        </div>
        {onRetry && <ButtonDefault label="Tentar novamente" icon={RefreshCw} onClick={onRetry} />}
      </motion.div>
    </div>
  )
}
