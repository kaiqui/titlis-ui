import { motion } from 'framer-motion'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card } from './Card'

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

export function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  iconColor = 'text-indigo-500',
  trend,
  trendValue,
  delay = 0,
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="overflow-hidden">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
              {label}
            </p>
            <p className="mt-3 text-3xl font-black tracking-tight" style={{ color: 'var(--color-foreground)' }}>
              {value}
            </p>
            {sub && (
              <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                {sub}
              </p>
            )}
            {trend && trendValue && (
              <div className={`mt-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                trend === 'up' ? 'bg-emerald-500/10 text-emerald-500' : trend === 'down' ? 'bg-red-500/10 text-red-500' : 'bg-slate-500/10 text-slate-500'
              }`}>
                {trend === 'up' ? <TrendingUp size={12} /> : trend === 'down' ? <TrendingDown size={12} /> : <Minus size={12} />}
                {trendValue}
              </div>
            )}
          </div>

          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconColor} bg-current/10`}>
            <Icon size={20} className={iconColor} />
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
