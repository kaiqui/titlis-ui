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
        'relative overflow-hidden rounded-[14px] border-2 p-5 transition-transform duration-100',
        hover && 'cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5',
        onClick && 'cursor-pointer',
        className,
      )}
      style={{
        background: 'var(--color-card)',
        borderColor: 'var(--color-foreground)',
        boxShadow: 'var(--shadow-brutal)',
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
