import { cn } from '@/lib/utils'
import { Eyebrow, Subtitle, Title } from './Typography'

interface SectionIntroProps {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function SectionIntro({ eyebrow, title, description, action, className }: SectionIntroProps) {
  return (
    <div className={cn('flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between', className)}>
      <div className="space-y-3">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <div className="space-y-2">
          <Title className="text-2xl lg:text-3xl">{title}</Title>
          {description && <Subtitle className="max-w-3xl text-sm lg:text-base">{description}</Subtitle>}
        </div>
      </div>
      {action}
    </div>
  )
}
