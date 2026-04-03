import { cn } from '@/lib/utils'

interface TextProps {
  children: React.ReactNode
  className?: string
}

export function Eyebrow({ children, className }: TextProps) {
  return (
    <span className={cn('jeitto-kicker family-neighbor inline-flex items-center gap-2', className)}>
      {children}
    </span>
  )
}

export function Title({ children, className }: TextProps) {
  return (
    <h2 className={cn('jeitto-title family-neighbor', className)}>
      {children}
    </h2>
  )
}

export function Subtitle({ children, className }: TextProps) {
  return (
    <p className={cn('jeitto-copy family-montserrat', className)}>
      {children}
    </p>
  )
}
