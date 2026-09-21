import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
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

  // Abas viram subitens na sidebar (ver Sidebar.tsx) — a URL é a fonte da verdade.
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const activeTab: GovernanceTab =
    tabParam === 'ai-costs' && aiEnabled ? 'ai-costs' : tabParam === 'overview' && isAdmin ? 'overview' : 'evolution'

  useEffect(() => {
    if (tabParam === null) setSearchParams({ tab: 'evolution' }, { replace: true })
  }, [tabParam, setSearchParams])

  return (
    <div className="flex min-h-screen flex-col">
      <Header timeRange
        title="Histórico & Governança"
        subtitle="Evolução da postura de confiabilidade e panorama executivo — do hub ao serviço."
      />

      <div className="flex-1 px-4 pt-4 pb-6 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} {...fadeInUp}>
            {activeTab === 'evolution' && <EvolutionHistory standalone={false} />}
            {activeTab === 'ai-costs' && aiEnabled && <AiUsage />}
            {activeTab === 'overview' && isAdmin && <AdminOverview standalone={false} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
