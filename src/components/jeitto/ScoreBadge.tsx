import { scoreBgColor, scoreLabel } from '@/lib/utils'

interface ScoreBadgeProps {
  score: number | null
  size?: 'sm' | 'md'
}

export function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  const base = scoreBgColor(score)
  const sizeClass = size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1 text-xs'

  return (
    <span className={`family-neighbor inline-flex items-center rounded-full font-black uppercase tracking-[0.08em] ${base} ${sizeClass}`}>
      {scoreLabel(score)}
    </span>
  )
}
