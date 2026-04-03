import { Card } from '@/components/jeitto/Card'

interface DetailPanelProps {
  title: string
  subtitle?: string
  headerMeta?: React.ReactNode
  children: React.ReactNode
}

export function DetailPanel({ title, subtitle, headerMeta, children }: DetailPanelProps) {
  return (
    <Card className="h-full">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="family-neighbor text-lg font-black tracking-tight" style={{ color: 'var(--color-foreground)' }}>
            {title}
          </h3>
          {subtitle && (
            <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              {subtitle}
            </p>
          )}
        </div>
        {headerMeta}
      </div>

      <div className="mt-5 space-y-4">
        {children}
      </div>
    </Card>
  )
}
