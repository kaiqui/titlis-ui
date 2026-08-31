import { NavLink } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import {
  Bot,
  ChevronLeft,
  Gauge,
  Inbox,
  Key,
  LayoutDashboard,
  Plug2,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/useAuth'
import { FeatureGuard } from '@/components/atoms/FeatureGuard'

const appLogoUrl = import.meta.env.VITE_APP_LOGO_URL?.trim() || '/logo.png'
const appName = import.meta.env.VITE_APP_NAME?.trim() || 'Titlis'
const displayAppName = appName.replace(/([a-z0-9])([A-Z])/g, '$1 $2')

const primaryNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Hub', exact: true },
  { to: '/reliability', icon: Gauge, label: 'Confiabilidade', featureId: 'nav_reliability' },
  { to: '/queues', icon: Inbox, label: 'Filas', featureId: 'nav_queues' },
]

const secondaryNavItems = [
  { to: '/coverage', icon: ShieldCheck, label: 'Postura', featureId: 'nav_coverage' },
  { to: '/slos', icon: Target, label: 'SLOs', featureId: 'nav_slos' },
  { to: '/costs', icon: Wallet, label: 'Custos', featureId: 'nav_costs' },
]


const governanceNavItem = { to: '/governance', icon: TrendingUp, label: 'Governança', featureId: 'nav_governance' }

const settingsNavItems = {
  base: [
    { to: '/settings/api-keys', icon: Key, label: 'Chaves de API', featureId: 'nav_settings_api_keys' },
  ],
  admin: [
    { to: '/settings/ai', icon: Bot, label: 'Configurar ARIA', featureId: 'nav_settings_ai' },
    { to: '/settings/score-config', icon: SlidersHorizontal, label: 'Score & Regras', featureId: 'nav_settings_score_config' },
    { to: '/settings/integrations', icon: Plug2, label: 'Integrações', featureId: 'nav_settings_integrations' },
    { to: '/settings/tags', icon: Tag, label: 'Tags', featureId: 'nav_settings_tags' },
  ],
}

function NavItems({
  items,
  mobile = false,
  collapsed = false,
}: {
  items: { to: string; icon: React.ElementType; label: string; exact?: boolean; featureId?: string }[]
  mobile?: boolean
  collapsed?: boolean
}) {
  const reduceMotion = useReducedMotion()

  return items.map(({ to, icon: Icon, label, exact, featureId }) => (
    <FeatureGuard key={to} id={featureId ?? ''}>
      <NavLink
        to={to}
        end={exact}
        className={({ isActive }) => cn(
          'group flex items-center gap-3 rounded-xl text-sm font-medium transition-colors duration-150',
          mobile ? 'flex-1 justify-center px-3 py-3 text-[11px]' : collapsed ? 'justify-center px-3 py-2.5' : 'px-3 py-2.5',
          !isActive && 'hover:bg-white/[0.06]',
        )}
        style={({ isActive }) => ({
          position: 'relative',
          color: isActive ? '#fff' : 'rgba(255,255,255,0.62)',
        })}
        title={collapsed && !mobile ? label : undefined}
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <motion.span
                layoutId={mobile ? 'sidebar-nav-active-mobile' : 'sidebar-nav-active'}
                className="absolute inset-0 rounded-xl"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            <motion.span
              className="relative flex shrink-0"
              whileHover={reduceMotion ? undefined : { scale: 1.12, rotate: [0, -8, 0] }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              <Icon size={mobile ? 16 : 17} strokeWidth={isActive ? 2.25 : 1.75} />
            </motion.span>
            {!mobile && !collapsed && (
              <span className="relative truncate transition-transform duration-150 group-hover:translate-x-0.5">{label}</span>
            )}
          </>
        )}
      </NavLink>
    </FeatureGuard>
  ))
}

function NavSection({
  title,
  items,
  collapsed,
}: {
  title: string
  items: typeof primaryNavItems
  collapsed: boolean
  emphasized?: boolean
}) {
  if (!items.length) return null

  return (
    <section>
      {!collapsed && (
        <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">{title}</p>
      )}
      <div className="space-y-0.5">
        <NavItems items={items} collapsed={collapsed} />
      </div>
    </section>
  )
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user } = useAuth()
  const reduceMotion = useReducedMotion()
  const navItems = [
    ...primaryNavItems,
    ...secondaryNavItems,
    ...(user?.role === 'admin' ? [governanceNavItem] : []),
  ]
  const configurationItems = [
    ...(user?.role === 'admin' ? settingsNavItems.admin : []),
    ...settingsNavItems.base,
  ]

  return (
    <>
      <aside
        className={`fixed left-4 top-4 hidden h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[2rem] transition-[width] duration-300 lg:flex ${collapsed ? 'w-24' : 'w-[17rem]'}`}
        style={{
          background: 'var(--sidebar-background)',
        }}
      >
        <div className="absolute inset-0 rounded-[2rem]" style={{ backgroundColor: 'var(--sidebar-background)' }} />
        <div className={`${collapsed ? 'px-3' : 'px-4'} relative z-[1] flex items-center gap-3 border-b py-4`} style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <motion.div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
            whileHover={reduceMotion ? undefined : { scale: 1.06, rotate: -4 }}
            transition={{ type: 'spring', stiffness: 350, damping: 14 }}
          >
            <img src={appLogoUrl} alt="" className="h-5 w-5 object-contain" />
          </motion.div>
          {!collapsed && (
            <p className="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-[0.02em] text-white/92">
              {displayAppName}
            </p>
          )}
          <button
            onClick={onToggle}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/[0.08] hover:text-white/90"
            type="button"
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            <motion.span
              className="flex"
              animate={{ rotate: collapsed ? 180 : 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <ChevronLeft size={15} />
            </motion.span>
          </button>
        </div>

        <div className="relative z-[1] flex-1 overflow-y-auto py-4">
          <nav className={`space-y-5 ${collapsed ? 'px-2' : 'px-3'}`}>
            <NavSection title="Produto" items={navItems} collapsed={collapsed} />
            <NavSection title="Configuração" items={configurationItems} collapsed={collapsed} />
          </nav>
        </div>

      </aside>

      <nav
        className="fixed inset-x-3 bottom-3 z-30 flex gap-2 rounded-[28px] border px-2 py-2 shadow-2xl lg:hidden"
        style={{
          borderColor: 'var(--sidebar-border)',
          background: 'var(--sidebar-background)',
        }}
      >
        <NavItems items={[...navItems, ...configurationItems]} mobile />
      </nav>
    </>
  )
}
