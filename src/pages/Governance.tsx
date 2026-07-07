import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { AdminOverview } from './AdminOverview'
import { EvolutionHistory } from './EvolutionHistory'
import { RemediationHistory } from './RemediationHistory'
import { useAuth } from '@/contexts/useAuth'

type GovernanceTab = 'evolution' | 'history' | 'overview'

export function Governance() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [activeTab, setActiveTab] = useState<GovernanceTab>('evolution')

  const tabs: { id: GovernanceTab; label: string }[] = [
    { id: 'evolution', label: 'Evolução' },
    { id: 'history', label: 'Histórico de Remediações' },
    ...(isAdmin ? [{ id: 'overview' as GovernanceTab, label: 'Visão Executiva' }] : []),
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title="Histórico & Governança"
        subtitle="Evolução da confiabilidade, histórico de remediações e panorama executivo — do hub ao serviço."
      />

      <div className="px-4 pt-2 pb-0 lg:px-8">
        <div className="flex flex-wrap gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="rounded-full border px-4 py-1.5 text-sm font-semibold transition-all"
              style={
                activeTab === tab.id
                  ? { backgroundColor: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }
                  : { backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)', borderColor: 'var(--color-border)' }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'evolution' && <EvolutionHistory standalone={false} />}
      {activeTab === 'history' && <RemediationHistory standalone={false} />}
      {activeTab === 'overview' && isAdmin && <AdminOverview standalone={false} />}
    </div>
  )
}
