import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface TrendIconProps {
  trend: 'up' | 'down' | 'stable'
  size?: number
}

export function TrendIcon({ trend, size = 14 }: TrendIconProps) {
  if (trend === 'up') return <TrendingUp size={size} className="text-emerald-500" />
  if (trend === 'down') return <TrendingDown size={size} className="text-red-500" />
  return <Minus size={size} className="text-gray-400" />
}
