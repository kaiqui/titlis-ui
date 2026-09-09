import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Header } from '@/components/layout/Header'
import { AdminOverview } from './AdminOverview'
import { EvolutionHistory } from './EvolutionHistory'
import { AiUsage } from './AiUsage'
import { useAuth } from '@/contexts/useAuth'
import { isFeatureEnabled } from '@/lib/featureFlags'
import { fadeInUp } from '@/lib/motion/tokens'

type GovernanceTab = 'evolution' | 'ai-costs' | 'overview'

export function Governance() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const aiEnabled = isFeatureEnabled('ai')

  const [activeTab, setActiveTab] = useState<GovernanceTab>('evolution')

  const tabs: { id: GovernanceTab; label: string }[] = [
    { id: 'evolution', label: 'Evolução' },
    ...(aiEnabled ? [{ id: 'ai-costs' as GovernanceTab, label: 'Custos de IA' }] : []),
    ...(isAdmin ? [{ id: 'overview' as GovernanceTab, label: 'Visão Executiva' }] : []),
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <Header timeRange
        title="Histórico & Governança"
        subtitle="Evolução da postura de confiabilidade e panorama executivo — do hub ao serviço."
      />

      <div className="px-4 pt-2 pb-0 lg:px-8">
        <div className="flex flex-wrap gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="rounded-[8px] border px-4 py-1.5 text-sm font-semibold transition-all"
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

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} {...fadeInUp}>
          {activeTab === 'evolution' && <EvolutionHistory standalone={false} />}
          {activeTab === 'ai-costs' && aiEnabled && <AiUsage />}
          {activeTab === 'overview' && isAdmin && <AdminOverview standalone={false} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
