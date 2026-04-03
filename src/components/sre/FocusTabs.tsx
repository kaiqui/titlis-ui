import { cn } from '@/lib/utils'

interface TabItem {
  id: string
  label: string
  count?: string | number
}

interface FocusTabsProps {
  items: TabItem[]
  active: string
  onChange: (id: string) => void
}

export function FocusTabs({ items, active, onChange }: FocusTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(item => {
        const isActive = item.id === active

        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={cn('rounded-full border px-4 py-2 text-sm font-semibold transition-colors')}
            style={{
              borderColor: isActive ? 'var(--color-primary)' : 'var(--color-border)',
              backgroundColor: isActive ? 'var(--color-primary-soft)' : 'var(--color-card)',
              color: isActive ? 'var(--color-primary-strong)' : 'var(--color-foreground)',
            }}
            type="button"
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className="ml-2 rounded-full px-2 py-0.5 text-xs"
                style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
              >
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
