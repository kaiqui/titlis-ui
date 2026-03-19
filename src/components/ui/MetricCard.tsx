import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card } from './Card'
import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string | number
  sub?: string
  icon: LucideIcon
  iconColor?: string
  trend?: 'up' | 'down' | 'stable'
  trendValue?: string
  delay?: number
}

export function MetricCard({ label, value, sub, icon: Icon, iconColor = 'text-indigo-500', trend, trendValue, delay = 0 }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-muted-foreground)' }}>
              {label}
            </p>
            <p className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-foreground)' }}>
              {value}
            </p>
            {sub && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
                {sub}
              </p>
            )}
            {trend && trendValue && (
              <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${
                trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400'
              }`}>
                {trend === 'up' ? <TrendingUp size={11} /> : trend === 'down' ? <TrendingDown size={11} /> : <Minus size={11} />}
                {trendValue}
              </div>
            )}
          </div>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor} bg-current/10`}>
            <Icon size={16} className={iconColor} style={{ backgroundColor: 'transparent' }} />
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
