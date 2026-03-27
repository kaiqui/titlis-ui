import { Bell, Moon, ShieldCheck, Sun } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from '@/contexts/useTheme'
import { ApiStatus } from './ApiStatus'

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  const { theme, toggleTheme } = useTheme()

  return (
    <header
      className="sticky top-0 z-20 border-b px-4 py-4 backdrop-blur lg:px-8"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'color-mix(in srgb, var(--color-background) 86%, transparent)',
      }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <span
            className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{
              backgroundColor: 'var(--color-primary-soft)',
              color: 'var(--color-primary-strong)',
            }}
          >
            <ShieldCheck size={12} />
            Interface operacional
          </span>
          <div>
            <h1 className="text-2xl font-black tracking-tight lg:text-3xl" style={{ color: 'var(--color-foreground)' }}>
              {title}
            </h1>
            {subtitle && (
              <p className="max-w-2xl text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-auto">
          <div className="hidden lg:block">
            <ApiStatus />
          </div>

          <button
            className="flex h-10 w-10 items-center justify-center rounded-2xl border transition-transform hover:-translate-y-0.5"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-card)',
              color: 'var(--color-muted-foreground)',
            }}
            type="button"
          >
            <Bell size={16} />
          </button>

          <motion.button
            onClick={toggleTheme}
            whileTap={{ scale: 0.94 }}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border transition-transform hover:-translate-y-0.5"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-card)',
              color: 'var(--color-muted-foreground)',
            }}
            type="button"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </motion.button>
        </div>
      </div>

      <div className="mt-3 lg:hidden">
        <ApiStatus />
      </div>
    </header>
  )
}
