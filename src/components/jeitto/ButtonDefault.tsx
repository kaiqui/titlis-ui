import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ButtonDefaultProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  icon?: LucideIcon
  visual?: 'primary' | 'secondary' | 'ghost'
}

export function ButtonDefault({
  label,
  icon: Icon,
  visual = 'primary',
  className,
  type = 'button',
  ...props
}: ButtonDefaultProps) {
  return (
    <button
      type={type}
      className={cn(
        'button-jeitto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm',
        visual === 'primary' && 'jc-primary-button',
        visual === 'secondary' && 'jc-secondary-button',
        visual === 'ghost' && 'jeitto-ghost-button',
        className,
      )}
      {...props}
    >
      {Icon && <Icon size={15} />}
      {label}
    </button>
  )
}
