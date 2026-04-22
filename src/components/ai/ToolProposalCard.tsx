import { useState } from 'react'
import { Check, ChevronDown, ChevronUp, Edit2, ShieldAlert, X } from 'lucide-react'

export interface ToolProposal {
  proposal_id: string
  tool_name: string
  description: string
  args: Record<string, unknown>
  is_write: boolean
}

export type Decision = 'pending' | 'approved' | 'rejected'

interface Props {
  proposal: ToolProposal
  decision: Decision
  onApprove: (proposalId: string, args: Record<string, unknown>) => void
  onReject: (proposalId: string) => void
  disabled?: boolean
}

export function ToolProposalCard({ proposal, decision, onApprove, onReject, disabled }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [argsText, setArgsText] = useState(JSON.stringify(proposal.args, null, 2))
  const [argsError, setArgsError] = useState<string | null>(null)

  const handleApprove = () => {
    if (editing) {
      try {
        const parsed = JSON.parse(argsText) as Record<string, unknown>
        setArgsError(null)
        onApprove(proposal.proposal_id, parsed)
      } catch {
        setArgsError('JSON inválido')
        return
      }
    } else {
      onApprove(proposal.proposal_id, proposal.args)
    }
  }

  const accentColor = proposal.is_write ? '#f59e0b' : 'var(--color-primary)'
  const accentBg = proposal.is_write ? 'rgba(245,158,11,0.08)' : 'rgba(var(--color-primary-rgb,99,102,241),0.06)'

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: proposal.is_write ? 'rgba(245,158,11,0.35)' : 'var(--color-border)', backgroundColor: accentBg }}>
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: accentColor + '22' }}>
          {proposal.is_write
            ? <ShieldAlert size={14} style={{ color: accentColor }} />
            : <div className="h-2 w-2 rounded-full" style={{ backgroundColor: accentColor }} />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
              {proposal.description}
            </p>
            {proposal.is_write && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest" style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                escrita
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="shrink-0 opacity-60 hover:opacity-100 transition-opacity mt-0.5"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="border-t px-4 pb-3 pt-2" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
              Parâmetros
            </p>
            {decision === 'pending' && !disabled && (
              <button
                type="button"
                onClick={() => setEditing(v => !v)}
                className="flex items-center gap-1 text-[10px] opacity-70 hover:opacity-100"
                style={{ color: accentColor }}
              >
                <Edit2 size={10} />
                {editing ? 'Cancelar edição' : 'Editar'}
              </button>
            )}
          </div>

          {editing ? (
            <>
              <textarea
                value={argsText}
                onChange={e => setArgsText(e.target.value)}
                rows={5}
                className="w-full rounded-xl px-3 py-2 font-mono text-xs outline-none resize-none"
                style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
              />
              {argsError && <p className="mt-1 text-xs" style={{ color: '#dc2626' }}>{argsError}</p>}
            </>
          ) : (
            <pre className="overflow-auto rounded-xl px-3 py-2 font-mono text-xs" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)', maxHeight: '140px' }}>
              {JSON.stringify(proposal.args, null, 2)}
            </pre>
          )}
        </div>
      )}

      {decision === 'pending' && !disabled && (
        <div className="flex gap-2 border-t px-4 py-3" style={{ borderColor: 'var(--color-border)' }}>
          <button
            type="button"
            onClick={handleApprove}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition-colors"
            style={{ backgroundColor: accentColor, color: '#fff' }}
          >
            <Check size={12} />
            Aprovar
          </button>
          <button
            type="button"
            onClick={() => onReject(proposal.proposal_id)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition-colors"
            style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)', border: '1px solid var(--color-border)' }}
          >
            <X size={12} />
            Rejeitar
          </button>
        </div>
      )}

      {decision !== 'pending' && (
        <div className="flex items-center gap-2 border-t px-4 py-2.5" style={{ borderColor: 'var(--color-border)' }}>
          {decision === 'approved'
            ? <><Check size={12} style={{ color: '#10b981' }} /><span className="text-xs" style={{ color: '#10b981' }}>Aprovada</span></>
            : <><X size={12} style={{ color: '#ef4444' }} /><span className="text-xs" style={{ color: '#ef4444' }}>Rejeitada</span></>}
        </div>
      )}
    </div>
  )
}
