import { Wrench, Info } from 'lucide-react'
import { SeverityBadge } from './SeverityBadge'
import type { Finding } from '@/types'

interface FindingRowProps {
  finding: Finding
}

export function FindingRow({ finding }: FindingRowProps) {
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-b-0"
      style={{ borderColor: 'var(--color-border)' }}>
      <div className="flex-shrink-0 mt-0.5">
        <SeverityBadge severity={finding.severity} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-mono font-medium px-1.5 py-0.5 rounded"
            style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
            {finding.ruleId}
          </span>
          <span className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
            {finding.ruleName}
          </span>
        </div>
        <p className="text-xs mb-1" style={{ color: 'var(--color-muted-foreground)' }}>
          {finding.message ?? 'Sem detalhe adicional para esta regra.'}
        </p>
        {(finding.remediationCategory || finding.actualValue) && (
          <div className="flex items-start gap-1.5">
            <Info size={11} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-500 dark:text-blue-400">
              {finding.remediationCategory
                ? `Categoria: ${finding.remediationCategory}`
                : `Valor observado: ${finding.actualValue}`}
            </p>
          </div>
        )}
      </div>
      {finding.remediable && (
        <div className="flex-shrink-0">
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
            <Wrench size={9} />
            Auto-fix
          </span>
        </div>
      )}
    </div>
  )
}
