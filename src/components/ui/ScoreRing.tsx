import { motion } from 'framer-motion'
import { scoreLabel, scoreRingColor } from '@/lib/utils'

interface ScoreRingProps {
  score: number | null
  size?: number
  strokeWidth?: number
  showLabel?: boolean
  showScore?: boolean
  className?: string
}

export function ScoreRing({
  score,
  size = 80,
  strokeWidth = 6,
  showLabel = false,
  showScore = true,
  className = '',
}: ScoreRingProps) {
  const safeScore = score ?? 0
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clampedScore = Math.max(0, Math.min(100, safeScore))
  const offset = circumference - (clampedScore / 100) * circumference
  const color = scoreRingColor(score)
  const fontSize = size < 60 ? 'text-sm' : size < 90 ? 'text-xl' : 'text-2xl'

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-200 dark:text-slate-800"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.2 }}
        />
      </svg>
      {showScore && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={`font-black leading-none ${fontSize}`}
            style={{ color }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.45 }}
          >
            {score === null ? 'N/D' : Math.round(clampedScore)}
          </motion.span>
          {showLabel && (
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              {scoreLabel(score)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
