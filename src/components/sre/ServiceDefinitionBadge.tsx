import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ServiceDefinitionBadgeProps {
  configured: boolean
  repoUrl?: string
  className?: string
}

export function ServiceDefinitionBadge({ configured, repoUrl, className }: ServiceDefinitionBadgeProps) {
  if (configured) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium',
          'bg-green-500/10 text-green-600 dark:text-green-400',
          className,
        )}
        title={repoUrl ? `Repositório: ${repoUrl}` : 'ServiceDefinition encontrada'}
      >
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        GitOps configurado
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium',
        'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        className,
      )}
      title="Crie o arquivo .titlis/service.yaml no repositório para habilitar remediação automática e o assistente IA."
    >
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      ServiceDefinition ausente
    </span>
  )
}
