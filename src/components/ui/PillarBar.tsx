import { motion } from 'framer-motion'
import { scoreRingColor, pillarLabel, pillarWeight } from '@/lib/utils'
import type { PillarScore } from '@/types'

interface PillarBarProps {
  pillar: string
  data: PillarScore
  delay?: number
}

export function PillarBar({ pillar, data, delay = 0 }: PillarBarProps) {
  const color = scoreRingColor(data.score)
  const weight = pillarWeight(pillar)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-medium" style={{ color: 'var(--color-foreground)' }}>
            {pillarLabel(pillar)}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded"
            style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
            {weight}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--color-muted-foreground)' }}>
            {data.passedChecks}/{data.totalChecks}
          </span>
          <span className="font-semibold w-8 text-right" style={{ color }}>
            {Math.round(data.score)}
          </span>
        </div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-muted)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${data.score}%` }}
          transition={{ duration: 0.8, delay, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}
