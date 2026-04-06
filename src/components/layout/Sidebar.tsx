import { NavLink } from 'react-router-dom'
import {
  AppWindow,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  GitPullRequest,
  Key,
  KeyRound,
  LayoutDashboard,
  Network,
  Shield,
  Siren,
  Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/useAuth'

const primaryNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Panorama', exact: true },
  { to: '/incidents', icon: Siren, label: 'Incidentes' },
  { to: '/applications', icon: AppWindow, label: 'Workloads' },
  { to: '/scorecards', icon: ClipboardCheck, label: 'Scorecards' },
]

const secondaryNavItems = [
  { to: '/slos', icon: Target, label: 'SLOs' },
  { to: '/topology', icon: Network, label: 'Topologia' },
]

function NavItems({
  items,
  mobile = false,
  collapsed = false,
}: {
  items: typeof primaryNavItems
  mobile?: boolean
  collapsed?: boolean
}) {
  return items.map(({ to, icon: Icon, label, exact }) => (
    <NavLink
      key={to}
      to={to}
      end={exact}
      className={({ isActive }) => cn(
        'family-neighbor group flex items-center gap-3 rounded-[22px] font-extrabold transition-all duration-200',
        mobile ? 'flex-1 justify-center px-3 py-3 text-[11px]' : collapsed ? 'justify-center px-3 py-3 text-sm' : 'px-4 py-3 text-sm',
        isActive
          ? 'shadow-sm'
          : '',
      )}
      style={({ isActive }) => ({
        backgroundColor: isActive ? 'var(--color-card)' : 'transparent',
        color: isActive ? 'var(--color-primary-strong)' : 'rgba(255,255,255,0.84)',
      })}
      title={collapsed && !mobile ? label : undefined}
    >
      {({ isActive }) => (
        <>
          <Icon size={mobile ? 16 : 18} className={isActive ? '' : 'opacity-90'} />
          {!mobile && !collapsed && <span className="font-medium">{label}</span>}
        </>
      )}
    </NavLink>
  ))
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user } = useAuth()
  const navItems = user?.canRemediate
    ? [...primaryNavItems, { to: '/recommendations', icon: GitPullRequest, label: 'Remediação' }]
    : primaryNavItems
  const contextualItems = user?.canRemediate
    ? [
        ...secondaryNavItems,
        { to: '/settings/auth', icon: KeyRound, label: 'Acesso' },
        { to: '/settings/api-keys', icon: Key, label: 'Chaves de API' },
      ]
    : secondaryNavItems

  return (
    <>
      <aside
        className={`fixed left-4 top-4 hidden h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[2rem] transition-[width] duration-300 lg:flex ${collapsed ? 'w-24' : 'w-[17rem]'}`}
        style={{
          background: 'var(--sidebar-background)',
        }}
      >
        <div className="jeitto-shell-panel jeitto-grid-lines absolute inset-0 rounded-[2rem]" />
        <div className={`${collapsed ? 'px-3' : 'px-5'} relative z-[1] pb-4 pt-5`}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="flex h-12 w-12 items-center justify-center rounded-[1.4rem] border shadow-sm" style={{ borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(255,255,255,0.08)' }}>
              <Shield size={22} className="text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="family-neighbor truncate text-lg font-black uppercase tracking-[0.18em] text-white">Titlis</p>
              </div>
            )}
          </div>

          <div className={`mt-5 flex ${collapsed ? 'justify-center' : 'justify-end'} gap-2`}>
            <button
              onClick={onToggle}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border text-white/80 transition-colors hover:text-white"
              style={{ borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.06)' }}
              type="button"
              title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            >
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>
        </div>

        <div className="relative z-[1] flex-1 overflow-y-auto pb-4">
          <nav className={`space-y-2 ${collapsed ? 'px-3' : 'px-4'}`}>
            {!collapsed && (
              <p className="px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">Principal</p>
            )}
            <div className="space-y-2">
              <NavItems items={navItems} collapsed={collapsed} />
            </div>

            {!collapsed && (
              <p className="px-4 pt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35">Contexto</p>
            )}
            <div className="space-y-2">
              <NavItems items={contextualItems} collapsed={collapsed} />
            </div>
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
        <NavItems items={[...navItems, ...contextualItems]} mobile />
      </nav>
    </>
  )
}
