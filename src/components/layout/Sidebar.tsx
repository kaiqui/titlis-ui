import { NavLink } from 'react-router-dom'
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  GitPullRequest,
  Key,
  LayoutDashboard,
  LineChart,
  Network,
  Plug2,
  Siren,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/useAuth'
import { FeatureGuard } from '@/components/atoms/FeatureGuard'

const appLogoUrl = import.meta.env.VITE_APP_LOGO_URL?.trim() || '/logo.png'
const appName = import.meta.env.VITE_APP_NAME?.trim() || 'Titlis'
const displayAppName = appName.replace(/([a-z0-9])([A-Z])/g, '$1 $2')

const primaryNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home', exact: true },
  { to: '/incidents', icon: Siren, label: 'Degradações', featureId: 'nav_incidents' },
  { to: '/scorecards', icon: ClipboardCheck, label: 'Termômetro de Confiabilidade', featureId: 'nav_scorecards' },
]

const secondaryNavItems = [
  { to: '/slos', icon: Target, label: 'SLOs', featureId: 'nav_slos' },
  { to: '/topology', icon: Network, label: 'Topologia', featureId: 'nav_topology' },
]

const remediationNavItems = [
  { to: '/aria', icon: Sparkles, label: 'ARIA', featureId: 'nav_aria' },
  { to: '/recommendations', icon: GitPullRequest, label: 'Fila de PRs', featureId: 'nav_recommendations' },
]

const settingsNavItems = {
  base: [
    { to: '/settings/api-keys', icon: Key, label: 'Chaves de API', featureId: 'nav_settings_api_keys' },
  ],
  admin: [
    { to: '/admin/overview', icon: LineChart, label: 'Visão Executiva', featureId: 'nav_admin_overview' },
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
  return items.map(({ to, icon: Icon, label, exact, featureId }) => (
    <FeatureGuard key={to} id={featureId ?? ''}>
      <NavLink
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
    </FeatureGuard>
  ))
}

function NavSection({
  title,
  items,
  collapsed,
  emphasized = false,
}: {
  title: string
  items: typeof primaryNavItems
  collapsed: boolean
  emphasized?: boolean
}) {
  if (!items.length) return null

  return (
    <section
      className={cn(
        'rounded-[1.6rem] border transition-colors',
        collapsed ? 'p-2' : 'p-3',
        emphasized ? 'bg-white/[0.05]' : 'bg-white/[0.03]',
      )}
      style={{ borderColor: emphasized ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.1)' }}
    >
      {!collapsed && (
        <div className="mb-2 px-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/48">{title}</p>
        </div>
      )}
      <div className="space-y-2">
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
  const navItems = [
    ...primaryNavItems,
    ...secondaryNavItems,
    ...(user?.canRemediate ? remediationNavItems : []),
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
        <div className="jeitto-shell-panel jeitto-grid-lines absolute inset-0 rounded-[2rem]" />
        <div className={`${collapsed ? 'px-3' : 'px-5'} relative z-[1] pb-4 pt-5`}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="flex h-12 w-12 items-center justify-center rounded-[1.4rem] border shadow-sm" style={{ borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(255,255,255,0.08)' }}>
              <img src={appLogoUrl} alt="" className="h-7 w-7 object-contain" />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="family-neighbor text-sm font-black leading-[1.05] tracking-[0.08em] text-white sm:text-[15px]">
                  {displayAppName}
                </p>
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
          <nav className={`space-y-3 ${collapsed ? 'px-3' : 'px-4'}`}>
            <NavSection title="Produto" items={navItems} collapsed={collapsed} />
            <NavSection title="Configuração" items={configurationItems} collapsed={collapsed} emphasized />
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
