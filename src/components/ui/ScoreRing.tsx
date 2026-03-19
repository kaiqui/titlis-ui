import { motion } from 'framer-motion'
import { scoreRingColor, scoreLabel } from '@/lib/utils'

interface ScoreRingProps {
  score: number
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
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clampedScore = Math.max(0, Math.min(100, score))
  const offset = circumference - (clampedScore / 100) * circumference
  const color = scoreRingColor(score)
  const fontSize = size < 60 ? 'text-sm' : size < 90 ? 'text-xl' : 'text-2xl'

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-800"
        />
        {/* Progress */}
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
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
        />
      </svg>
      {showScore && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={`font-bold leading-none ${fontSize}`}
            style={{ color }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            {Math.round(clampedScore)}
          </motion.span>
          {showLabel && (
            <span className="text-[10px] text-gray-400 leading-none mt-0.5">
              {scoreLabel(score)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
