import { NavLink } from 'react-router-dom'
import {
  AppWindow,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  GitPullRequest,
  LayoutDashboard,
  PanelLeftClose,
  Network,
  Shield,
  Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Panorama', exact: true },
  { to: '/scorecards', icon: ClipboardCheck, label: 'Scorecards' },
  { to: '/applications', icon: AppWindow, label: 'Workloads' },
  { to: '/recommendations', icon: GitPullRequest, label: 'Remediação' },
  { to: '/slos', icon: Target, label: 'Consulta SLO' },
  { to: '/topology', icon: Network, label: 'Topologia' },
]

function NavItems({ mobile = false, collapsed = false }: { mobile?: boolean; collapsed?: boolean }) {
  return navItems.map(({ to, icon: Icon, label, exact }) => (
    <NavLink
      key={to}
      to={to}
      end={exact}
      className={({ isActive }) => cn(
        'group flex items-center gap-3 rounded-2xl transition-all duration-200',
        mobile ? 'flex-1 justify-center px-3 py-3 text-[11px]' : collapsed ? 'justify-center px-3 py-3 text-sm' : 'px-4 py-3 text-sm',
        isActive
          ? 'bg-white/10 text-white shadow-lg shadow-slate-950/20'
          : 'text-white/72 hover:bg-white/6 hover:text-white',
      )}
      title={collapsed && !mobile ? label : undefined}
    >
      {({ isActive }) => (
        <>
          <Icon size={mobile ? 16 : 18} className={isActive ? 'text-white' : ''} />
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
  return (
    <>
      <aside
        className={`fixed left-0 top-0 hidden h-screen flex-col border-r transition-[width] duration-200 lg:flex ${collapsed ? 'w-24' : 'w-72'}`}
        style={{
          borderColor: 'var(--sidebar-border)',
          background: 'var(--sidebar-background)',
        }}
      >
        <div className={`${collapsed ? 'px-3' : 'px-6'} pb-4 pt-6`}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 shadow-lg shadow-slate-950/20">
              <Shield size={22} className="text-white" />
            </div>
            {!collapsed && (
              <div>
                <p className="text-lg font-black tracking-tight text-white">Titlis Console</p>
                <p className="text-sm text-white/68">Operação em cima do contrato real da API</p>
              </div>
            )}
          </div>

          <div className={`mt-5 flex ${collapsed ? 'justify-center' : 'justify-between'} gap-2`}>
            <button
              onClick={onToggle}
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              type="button"
              title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            >
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>

            {!collapsed && (
              <div className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/62">
                <PanelLeftClose size={14} />
                Navegação
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-4">
          <nav className={`space-y-2 ${collapsed ? 'px-3' : 'px-4'}`}>
            {!collapsed && (
              <p className="px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">Navegação</p>
            )}
            <div className="space-y-2">
              <NavItems collapsed={collapsed} />
            </div>
          </nav>
        </div>

        {!collapsed && (
          <div className="p-4">
            <div className="rounded-3xl border border-white/10 bg-black/16 p-4 text-white/84">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Status</p>
              <p className="mt-2 text-sm font-semibold">Fluxos alinhados com operator e API</p>
              <p className="mt-1 text-xs text-white/60">
                Scorecards, remediação, logs e lookup de SLO renderizados a partir do contrato persistido.
              </p>
            </div>
          </div>
        )}
      </aside>

      <nav
        className="fixed inset-x-3 bottom-3 z-30 flex gap-2 rounded-[28px] border px-2 py-2 shadow-2xl lg:hidden"
        style={{
          borderColor: 'var(--sidebar-border)',
          background: 'var(--sidebar-background)',
        }}
      >
        <NavItems mobile />
      </nav>
    </>
  )
}
