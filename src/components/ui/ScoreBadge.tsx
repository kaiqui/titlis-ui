import { scoreBgColor, scoreLabel } from '@/lib/utils'

interface ScoreBadgeProps {
  score: number
  size?: 'sm' | 'md'
}

export function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  const base = scoreBgColor(score)
  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${base} ${sizeClass}`}>
      {scoreLabel(score)}
    </span>
  )
}
