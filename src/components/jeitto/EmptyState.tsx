import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-[12px]"
        style={{ backgroundColor: 'var(--color-primary-soft)' }}
      >
        <Icon size={20} style={{ color: 'var(--color-primary)' }} />
      </div>
      <p className="family-neighbor mb-1 text-base font-semibold tracking-tight" style={{ color: 'var(--color-foreground)' }}>
        {title}
      </p>
      {description && (
        <p className="max-w-xs text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          {description}
        </p>
      )}
    </div>
  )
}
