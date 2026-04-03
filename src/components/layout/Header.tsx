import { Moon, Sun } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from '@/contexts/useTheme'
import { useAuth } from '@/contexts/useAuth'
import { Subtitle } from '@/components/jeitto/Typography'
import { ApiStatus } from './ApiStatus'

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  const { theme, toggleTheme } = useTheme()
  const { user, signOut } = useAuth()

  return (
    <header className="jeitto-header px-4 py-4 lg:px-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div>
            <h1 className="family-neighbor text-xl font-black tracking-tight lg:text-2xl" style={{ color: 'var(--color-foreground)' }}>
              {title}
            </h1>
            {subtitle && (
              <Subtitle className="max-w-3xl text-sm">
                {subtitle}
              </Subtitle>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start xl:self-auto">
          {user && (
            <div
              className="flex items-center gap-3 rounded-full border px-4 py-2 text-sm"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-card)',
                color: 'var(--color-muted-foreground)',
              }}
            >
              <div>
                <p className="m-0 font-semibold" style={{ color: 'var(--color-foreground)' }}>{user.displayName ?? user.email}</p>
                <p className="m-0 text-xs uppercase tracking-[0.14em]">{user.role} · {user.authProvider}</p>
              </div>
              <button
                type="button"
                onClick={signOut}
                className="rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em]"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}
              >
                Sair
              </button>
            </div>
          )}

          <div>
            <ApiStatus />
          </div>

          <motion.button
            onClick={toggleTheme}
            whileTap={{ scale: 0.94 }}
            className="button-nav inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm transition-transform hover:-translate-y-0.5"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-card)',
              color: 'var(--color-muted-foreground)',
            }}
            type="button"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span>{theme === 'dark' ? 'Claro' : 'Escuro'}</span>
          </motion.button>
        </div>
      </div>
    </header>
  )
}
