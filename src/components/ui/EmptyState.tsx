import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
        style={{ backgroundColor: 'var(--color-muted)' }}>
        <Icon size={20} style={{ color: 'var(--color-muted-foreground)' }} />
      </div>
      <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>{title}</p>
      {description && (
        <p className="text-xs max-w-xs" style={{ color: 'var(--color-muted-foreground)' }}>{description}</p>
      )}
    </div>
  )
}
