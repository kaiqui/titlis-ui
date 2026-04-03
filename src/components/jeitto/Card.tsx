import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  hover?: boolean
}

export function Card({ children, className, onClick, hover }: CardProps) {
  return (
    <section
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-[2rem] border p-5 transition-all duration-200',
        hover && 'cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:saturate-[1.02]',
        onClick && 'cursor-pointer',
        className,
      )}
      style={{
        background: 'var(--color-card)',
        borderColor: 'var(--color-border)',
        boxShadow: '0 10px 24px rgba(15, 23, 42, 0.06)',
      }}
    >
      <div className="relative z-[1]">{children}</div>
    </section>
  )
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mb-4 flex items-center justify-between gap-3', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn('family-neighbor text-[0.95rem] font-black tracking-tight', className)} style={{ color: 'var(--color-foreground)' }}>
      {children}
    </h3>
  )
}
