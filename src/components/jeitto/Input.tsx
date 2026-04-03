import type { LucideIcon } from 'lucide-react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon
}

export function Input({ icon: Icon = Search, className, ...props }: InputProps) {
  return (
    <div className={cn('jeitto-search', className)}>
      <Icon size={16} className="jeitto-search__icon" />
      <input
        className="jeitto-search__input"
        {...props}
      />
    </div>
  )
}
