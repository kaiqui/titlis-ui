import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function Layout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen" style={{ background: 'var(--app-background)' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(current => !current)} />
      <main className={`min-h-screen pb-24 transition-[margin] duration-200 lg:pb-0 ${collapsed ? 'lg:ml-24' : 'lg:ml-72'}`}>
        <Outlet />
      </main>
    </div>
  )
}
