import { Card } from '@/components/jeitto/Card'
import { InfoTip } from '@/components/jeitto/InfoTip'

interface SummaryItem {
  label: string
  value: string | number
  helper?: string
  info?: string
}

interface SummaryStripProps {
  items: SummaryItem[]
}

export function SummaryStrip({ items }: SummaryStripProps) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map(item => (
        <Card key={item.label}>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
            {item.label}
            {item.info && <InfoTip label={item.label} content={item.info} />}
          </p>
          <p className="mt-2 family-neighbor text-[1.6rem] font-black tracking-tight" style={{ color: 'var(--color-foreground)' }}>
            {item.value}
          </p>
          {item.helper && (
            <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              {item.helper}
            </p>
          )}
        </Card>
      ))}
    </section>
  )
}
