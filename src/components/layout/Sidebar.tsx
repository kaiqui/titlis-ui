import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  AppWindow,
  Target,
  Lightbulb,
  Users,
  ChevronRight,
  Activity,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Visao Geral', exact: true },
  { to: '/applications', icon: AppWindow, label: 'Aplicacoes' },
  { to: '/slos', icon: Target, label: 'SLOs & Confiabilidade' },
  { to: '/recommendations', icon: Lightbulb, label: 'Recomendacoes' },
  { to: '/squads', icon: Users, label: 'Times & Produtos' },
]

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-full w-60 flex flex-col z-30"
      style={{ backgroundColor: 'var(--color-sidebar)', borderRight: '1px solid var(--color-sidebar-border)' }}>

      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-2.5"
        style={{ borderBottom: '1px solid var(--color-sidebar-border)' }}>
        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center flex-shrink-0">
          <Shield size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-sidebar-foreground)' }}>
            Titlis
          </p>
          <p className="text-xs" style={{ color: 'var(--color-sidebar-muted)' }}>
            Operator Dashboard
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider mb-1"
          style={{ color: 'var(--color-sidebar-muted)' }}>
          Plataforma
        </p>
        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) => cn(
              'group flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150',
              isActive
                ? 'bg-indigo-500/20 text-indigo-300 font-medium'
                : 'text-[--color-sidebar-muted] hover:bg-[--color-sidebar-accent] hover:text-[--color-sidebar-foreground]'
            )}
            style={{
              color: undefined,
            }}
          >
            {({ isActive }) => (
              <>
                <Icon size={15} className={isActive ? 'text-indigo-400' : ''} />
                <span className="flex-1">{label}</span>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="w-1 h-1 rounded-full bg-indigo-400"
                    initial={false}
                  />
                )}
                {!isActive && <ChevronRight size={12} className="opacity-0 group-hover:opacity-40 transition-opacity" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Status indicator */}
      <div className="px-5 py-4" style={{ borderTop: '1px solid var(--color-sidebar-border)' }}>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--color-sidebar-foreground)' }}>
              Operador ativo
            </p>
            <p className="text-[10px]" style={{ color: 'var(--color-sidebar-muted)' }}>
              <Activity size={9} className="inline mr-1" />
              8 workloads monitorados
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
