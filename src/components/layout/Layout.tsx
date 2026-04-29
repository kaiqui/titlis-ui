import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/useAuth'
import { Sidebar } from './Sidebar'

export function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const { authMode, user } = useAuth()

  return (
    <div className="app-shell min-h-screen" style={{ background: 'var(--app-background)' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(current => !current)} />
      <main className={`min-h-screen pb-24 transition-[margin] duration-300 lg:pb-0 ${collapsed ? 'lg:ml-28' : 'lg:ml-[19rem]'}`}>
        {authMode === 'mock' && (
          <div
            className="jc-dev-banner mx-4 mt-4 rounded-[1.4rem] border px-4 py-3 text-sm lg:mx-8"
          >
            Modo de desenvolvimento ativo. A UI esta usando bypass local com {user?.email ?? 'dev@titlis.local'}.
          </div>
        )}
        <Outlet />
      </main>
    </div>
  )
}
