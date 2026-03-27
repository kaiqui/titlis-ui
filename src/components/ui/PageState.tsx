import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export function PageLoading() {
  return (
    <div className="flex min-h-[60vh] flex-1 items-center justify-center px-6">
      <motion.div
        className="flex flex-col items-center gap-4 rounded-[32px] border px-10 py-10 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-card)',
        }}
      >
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-2 border-orange-500/20" />
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-l-transparent border-r-transparent border-t-orange-500 border-b-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
          />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
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
        className="flex max-w-md flex-col items-center gap-4 rounded-[32px] border px-8 py-10 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-card)',
        }}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
          <AlertTriangle size={24} className="text-red-500" />
        </div>
        <div>
          <p className="text-base font-black" style={{ color: 'var(--color-foreground)' }}>
            Não foi possível carregar esta área
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {message ?? 'A conexão com a API falhou. Verifique se o titlis-api está em execução e tente novamente.'}
          </p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
            type="button"
          >
            <RefreshCw size={14} />
            Tentar novamente
          </button>
        )}
      </motion.div>
    </div>
  )
}
