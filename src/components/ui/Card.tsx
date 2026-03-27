import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  hover?: boolean
}

export function Card({ children, className, onClick, hover }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-[28px] border p-5 transition-all duration-200',
        hover && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-2xl',
        onClick && 'cursor-pointer',
        className,
      )}
      style={{
        backgroundColor: 'var(--color-card)',
        borderColor: 'var(--color-border)',
        boxShadow: '0 18px 48px rgba(15, 23, 42, 0.06)',
      }}
    >
      {children}
    </div>
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
    <h3 className={cn('text-base font-black tracking-tight', className)} style={{ color: 'var(--color-foreground)' }}>
      {children}
    </h3>
  )
}
