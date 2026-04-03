import { cn } from '@/lib/utils'

interface SelectionListItem {
  id: string
  title: string
  subtitle?: string
  badges?: React.ReactNode
  meta?: React.ReactNode
}

interface SelectionListProps {
  items: SelectionListItem[]
  activeId: string | null
  onSelect: (id: string) => void
}

export function SelectionList({ items, activeId, onSelect }: SelectionListProps) {
  return (
    <div className="space-y-2">
      {items.map(item => {
        const isActive = item.id === activeId

        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={cn('w-full rounded-[1.4rem] border px-4 py-4 text-left transition-colors')}
            style={{
              borderColor: isActive ? 'var(--color-primary)' : 'var(--color-border)',
              backgroundColor: isActive ? 'var(--color-primary-soft)' : 'var(--color-card)',
            }}
            type="button"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black" style={{ color: 'var(--color-foreground)' }}>
                  {item.title}
                </p>
                {item.subtitle && (
                  <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                    {item.subtitle}
                  </p>
                )}
                {item.badges && <div className="mt-2 flex flex-wrap gap-2">{item.badges}</div>}
              </div>
              {item.meta}
            </div>
          </button>
        )
      })}
    </div>
  )
}
