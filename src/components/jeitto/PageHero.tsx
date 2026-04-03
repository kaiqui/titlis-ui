import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { InfoTip } from './InfoTip'
import { Eyebrow, Subtitle, Title } from './Typography'

interface HeroMetric {
  label: string
  value: string | number
  helper?: string
}

interface PageHeroProps {
  eyebrow: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  metrics?: HeroMetric[]
  actions?: React.ReactNode
  aside?: React.ReactNode
  className?: string
}

export function PageHero({
  eyebrow,
  title,
  description,
  metrics = [],
  actions,
  aside,
  className,
}: PageHeroProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('jeitto-hero', className)}
    >
      <div className="jeitto-hero__mesh" />
      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
        <div className="relative z-[1] space-y-5">
          <Eyebrow>{eyebrow}</Eyebrow>
          <div className="space-y-3">
            <Title>{title}</Title>
            {description && <Subtitle className="max-w-3xl">{description}</Subtitle>}
          </div>
          {actions && (
            <div className="flex flex-wrap gap-3">
              {actions}
            </div>
          )}
          {metrics.length > 0 && (
            <div className="grid gap-3 md:grid-cols-3">
              {metrics.map(metric => (
                <div key={metric.label} className="jeitto-hero__metric">
                  <div className="flex items-center gap-1.5">
                    <p className="jeitto-hero__metric-label">{metric.label}</p>
                    {metric.helper && <InfoTip content={String(metric.helper)} />}
                  </div>
                  <p className="jeitto-hero__metric-value">{metric.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative z-[1]">
          {aside}
        </div>
      </div>
    </motion.section>
  )
}
