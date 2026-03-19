import { severityColor } from '@/lib/utils'
import type { Severity } from '@/types'

const labels: Record<Severity, string> = {
  critical: 'Critico',
  error: 'Erro',
  warning: 'Aviso',
  info: 'Info',
}

interface SeverityBadgeProps {
  severity: Severity
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border ${severityColor(severity)}`}>
      {labels[severity]}
    </span>
  )
}
