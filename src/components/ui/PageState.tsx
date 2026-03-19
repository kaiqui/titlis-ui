import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export function PageLoading() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
          />
        </div>
        <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
          Carregando...
        </p>
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
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <motion.div
        className="flex flex-col items-center gap-4 max-w-sm text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
          <AlertTriangle size={20} className="text-red-500" />
        </div>
        <div>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>
            Erro ao carregar dados
          </p>
          <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            {message ?? 'Nao foi possivel conectar com a API. Verifique se o servidor esta rodando.'}
          </p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
          >
            <RefreshCw size={12} />
            Tentar novamente
          </button>
        )}
      </motion.div>
    </div>
  )
}
