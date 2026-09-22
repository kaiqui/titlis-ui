import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import {
  ChevronDown,
  ChevronLeft,
  Gauge,
  Inbox,
  Sparkles,
  Key,
  LayoutDashboard,
  Plug2,
  ShieldCheck,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/useAuth'
import { FeatureGuard } from '@/components/atoms/FeatureGuard'
import { isFeatureEnabled, type Feature } from '@/lib/featureFlags'

const appName = import.meta.env.VITE_APP_NAME?.trim() || 'Confia'
const displayAppName = appName.replace(/([a-z0-9])([A-Z])/g, '$1 $2')

interface NavChild {
  to: string
  label: string
  featureId?: string
}

interface NavItemDef {
  to: string
  icon: React.ElementType
  label: string
  exact?: boolean
  featureId?: string
  feature?: Feature
  children?: NavChild[]
}

const confiaChildren: NavChild[] = [
  { to: '/confia?tab=mural', label: 'Mural' },
  { to: '/confia?tab=playbooks', label: 'Playbooks' },
  { to: '/confia?tab=chat', label: 'Chat' },
  { to: '/confia?tab=skills', label: 'Skills' },
  { to: '/confia?tab=pendencias', label: 'Pendências' },
]

const primaryNavItems: NavItemDef[] = [
  { to: '/', icon: LayoutDashboard, label: 'Hub', exact: true },
  { to: '/reliability', icon: Gauge, label: 'Confiabilidade', featureId: 'nav_reliability' },
  { to: '/confia', icon: Sparkles, label: 'ConfAI', featureId: 'nav_confia', feature: 'ai' as Feature, children: confiaChildren },
  { to: '/queues', icon: Inbox, label: 'Filas', featureId: 'nav_queues', feature: 'queues' as Feature },
]

const secondaryNavItems: NavItemDef[] = [
  { to: '/coverage', icon: ShieldCheck, label: 'Postura', featureId: 'nav_coverage' },
  { to: '/slos', icon: Target, label: 'SLOs', featureId: 'nav_slos', feature: 'slos' as Feature },
  { to: '/costs', icon: Wallet, label: 'Custos', featureId: 'nav_costs' },
]

function governanceChildren(aiEnabled: boolean): NavChild[] {
  return [
    { to: '/governance?tab=evolution', label: 'Evolução' },
    ...(aiEnabled ? [{ to: '/governance?tab=ai-costs', label: 'Custos de IA' }] : []),
    { to: '/governance?tab=overview', label: 'Visão Executiva' },
  ]
}

function governanceNavItem(aiEnabled: boolean): NavItemDef {
  return { to: '/governance', icon: TrendingUp, label: 'Governança', featureId: 'nav_governance', children: governanceChildren(aiEnabled) }
}

const settingsNavItems = {
  base: [
    { to: '/settings/api-keys', icon: Key, label: 'Chaves de API', featureId: 'nav_settings_api_keys' },
  ],
  admin: [
    { to: '/settings/integrations', icon: Plug2, label: 'Integrações', featureId: 'nav_settings_integrations' },
  ],
}

function NavItems({
  items,
  mobile = false,
  collapsed = false,
}: {
  items: NavItemDef[]
  mobile?: boolean
  collapsed?: boolean
}) {
  const reduceMotion = useReducedMotion()

  return items.map(({ to, icon: Icon, label, exact, featureId, feature, children }) => (
    feature && !isFeatureEnabled(feature) ? (
      <div
        key={to}
        aria-disabled="true"
        title="Em breve"
        className={cn(
          'group flex cursor-not-allowed items-center gap-3 rounded-xl text-sm font-medium opacity-45',
          mobile ? 'flex-1 justify-center px-3 py-3 text-[11px]' : collapsed ? 'justify-center px-3 py-2.5' : 'px-3 py-2.5',
        )}
        style={{ color: 'rgba(255,255,255,0.62)' }}
      >
        <span className="flex shrink-0"><Icon size={mobile ? 16 : 17} strokeWidth={1.75} /></span>
        {!mobile && !collapsed && (
          <span className="relative flex flex-1 items-center gap-2 truncate">
            {label}
            <span className="rounded-[6px] border border-white/25 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-white/70">
              em breve
            </span>
          </span>
        )}
      </div>
    ) : !mobile && !collapsed && children && children.length > 0 ? (
      // Item com subitens, sidebar expandida — recolhível (mesmo padrão do NavParentItem do
      // titlis-ui-saas): o chevron é um botão irmão do NavLink, não aninhado dentro dele, pra
      // clicar nele não disparar navegação.
      <NavItemWithChildren key={to} to={to} icon={Icon} label={label} exact={exact} featureId={featureId} children_={children} />
    ) : (
    <div key={to}>
      <FeatureGuard id={featureId ?? ''}>
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
            color: isActive ? '#17161a' : 'rgba(255,255,255,0.62)',
          })}
          title={collapsed && !mobile ? label : undefined}
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId={mobile ? 'sidebar-nav-active-mobile' : 'sidebar-nav-active'}
                  className="absolute inset-0 rounded-xl"
                  style={{ backgroundColor: 'var(--color-primary)', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <motion.span
                className="relative flex shrink-0"
                whileHover={reduceMotion ? undefined : { scale: 1.05 }}
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
    </div>
    )
  ))
}

// Subitens de aba (ex.: ConfAI → Mural/Playbooks/..., Governança → Evolução/...) usam querystring
// (`?tab=chat`) no mesmo path — NavLink do React Router só compara pathname (ignora search), então
// o isActive automático marcaria todos como ativos ao mesmo tempo. Comparação manual resolve.
function isChildActive(childTo: string, location: ReturnType<typeof useLocation>): boolean {
  const [childPath, childQuery] = childTo.split('?')
  return location.pathname === childPath && (!childQuery || location.search === `?${childQuery}`)
}

// Item com subitens na sidebar expandida — recolhível, chevron como botão irmão do NavLink
// (mesmo padrão do NavParentItem em titlis-ui-saas). Componente à parte porque precisa de
// useState próprio por item (não dá pra chamar hook dentro do .map() de NavItems).
function NavItemWithChildren({
  to,
  icon: Icon,
  label,
  exact,
  featureId,
  children_: children,
}: {
  to: string
  icon: React.ElementType
  label: string
  exact?: boolean
  featureId?: string
  children_: NavChild[]
}) {
  const [open, setOpen] = useState(true)
  const location = useLocation()
  const reduceMotion = useReducedMotion()

  return (
    <div>
      <div className="flex items-center gap-1">
        <FeatureGuard id={featureId ?? ''}>
          <NavLink
            to={to}
            end={exact}
            className={({ isActive }) => cn(
              'group flex flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150',
              !isActive && 'hover:bg-white/[0.06]',
            )}
            style={({ isActive }) => ({ position: 'relative', color: isActive ? '#17161a' : 'rgba(255,255,255,0.62)' })}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="sidebar-nav-active"
                    className="absolute inset-0 rounded-xl"
                    style={{ backgroundColor: 'var(--color-primary)', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
                <motion.span
                  className="relative flex shrink-0"
                  whileHover={reduceMotion ? undefined : { scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                >
                  <Icon size={17} strokeWidth={isActive ? 2.25 : 1.75} />
                </motion.span>
                <span className="relative truncate transition-transform duration-150 group-hover:translate-x-0.5">{label}</span>
              </>
            )}
          </NavLink>
        </FeatureGuard>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? `Recolher ${label}` : `Expandir ${label}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white/80"
        >
          <ChevronDown size={14} className={cn('transition-transform duration-200', !open && '-rotate-90')} />
        </button>
      </div>
      {open && (
        <div className="ml-[1.15rem] mt-0.5 space-y-0.5 border-l pl-3" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
          {children.map((child) => (
            <FeatureGuard key={child.to} id={child.featureId ?? ''}>
              <Link
                to={child.to}
                className={cn(
                  'block rounded-lg px-2.5 py-1.5 text-[13px] font-medium truncate transition-colors duration-150',
                  isChildActive(child.to, location) ? 'text-white' : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80',
                )}
              >
                {child.label}
              </Link>
            </FeatureGuard>
          ))}
        </div>
      )}
    </div>
  )
}

function NavSection({
  title,
  items,
  collapsed,
}: {
  title: string
  items: NavItemDef[]
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
    ...(user?.role === 'admin' ? [governanceNavItem(isFeatureEnabled('ai'))] : []),
  ]
  const configurationItems = [
    ...(user?.role === 'admin' ? settingsNavItems.admin : []),
    ...settingsNavItems.base,
  ]

  return (
    <>
      <aside
        className={`fixed left-4 top-4 hidden h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[var(--radius-nb-lg)] transition-[width] duration-300 lg:flex ${collapsed ? 'w-24' : 'w-[17rem]'}`}
        style={{
          background: 'var(--sidebar-background)',
        }}
      >
        <div className="absolute inset-0 rounded-[var(--radius-nb-lg)] border border-white/10" style={{ backgroundColor: 'var(--sidebar-background)' }} />
        <div className={`${collapsed ? 'px-3' : 'px-4'} relative z-[1] flex items-center gap-3 border-b py-4`} style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <motion.div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: 'var(--color-primary)' }}
            whileHover={reduceMotion ? undefined : { scale: 1.04 }}
            transition={{ type: 'spring', stiffness: 350, damping: 14 }}
          >
            <span
              aria-hidden
              className="h-4 w-4"
              style={{
                backgroundColor: '#fff',
                WebkitMaskImage: 'url(/jeitto-icon.svg)',
                maskImage: 'url(/jeitto-icon.svg)',
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                WebkitMaskSize: 'contain',
                maskSize: 'contain',
                WebkitMaskPosition: 'center',
                maskPosition: 'center',
              }}
            />
          </motion.div>
          {!collapsed && (
            <div className="flex min-w-0 flex-1 flex-col gap-1 leading-none">
              <span
                aria-label="Jeitto"
                className="h-4 w-[3.4rem]"
                style={{
                  backgroundColor: '#fff',
                  WebkitMaskImage: 'url(/jeitto-logo.svg)',
                  maskImage: 'url(/jeitto-logo.svg)',
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                  WebkitMaskSize: 'contain',
                  maskSize: 'contain',
                }}
              />
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                {displayAppName}
              </span>
            </div>
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
        className="fixed inset-x-3 bottom-3 z-30 flex gap-2 rounded-[var(--radius-nb)] border px-2 py-2 lg:hidden"
        style={{
          borderColor: 'rgba(255,255,255,0.12)',
          background: 'var(--sidebar-background)',
          boxShadow: 'var(--shadow-brutal)',
        }}
      >
        <NavItems items={[...navItems, ...configurationItems]} mobile />
      </nav>
    </>
  )
}
