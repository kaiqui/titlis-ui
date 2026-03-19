import { Sun, Moon, Bell, Search } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { motion } from 'framer-motion'

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="h-14 flex items-center justify-between px-6"
      style={{
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-background)',
      }}>
      <div>
        <h1 className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          className="w-8 h-8 rounded-md flex items-center justify-center transition-colors hover:bg-[--color-muted] cursor-pointer"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          <Search size={15} />
        </button>

        <button
          className="w-8 h-8 rounded-md flex items-center justify-center transition-colors hover:bg-[--color-muted] relative cursor-pointer"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          <Bell size={15} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>

        <motion.button
          onClick={toggleTheme}
          whileTap={{ scale: 0.9 }}
          className="w-8 h-8 rounded-md flex items-center justify-center transition-colors hover:bg-[--color-muted] cursor-pointer"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </motion.button>
      </div>
    </header>
  )
}
