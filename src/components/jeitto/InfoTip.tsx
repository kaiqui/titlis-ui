import * as Tooltip from '@radix-ui/react-tooltip'
import { Info } from 'lucide-react'

interface InfoTipProps {
  content: string
  label?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
}

export function InfoTip({ content, label, side = 'top' }: InfoTipProps) {
  return (
    <Tooltip.Provider delayDuration={120} skipDelayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            aria-label={label ?? content}
            className="inline-flex h-4 w-4 items-center justify-center rounded-full border align-middle outline-none transition-colors hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-muted-foreground)',
              backgroundColor: 'var(--color-muted)',
            }}
            onClick={(e) => e.preventDefault()}
          >
            <Info size={10} />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side={side}
            sideOffset={6}
            collisionPadding={12}
            className="infotip-content z-50 max-w-[18rem] rounded-xl border px-3.5 py-2.5 text-left text-[12.5px] leading-relaxed shadow-xl"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-foreground)',
              boxShadow: '0 12px 32px rgba(15, 23, 42, 0.18)',
            }}
          >
            {label && (
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--color-primary)' }}>
                {label}
              </p>
            )}
            <p style={{ color: 'var(--color-muted-foreground)' }}>{content}</p>
            <Tooltip.Arrow width={11} height={6} style={{ fill: 'var(--color-card)' }} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}
