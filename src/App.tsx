import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { AuthGate } from '@/components/auth/AuthGate'
import { Layout } from '@/components/layout/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { Incidents } from '@/pages/Incidents'
import { ApplicationDetail } from '@/pages/ApplicationDetail'
import { Scorecards } from '@/pages/Scorecards'
import { ScorecardDetail } from '@/pages/ScorecardDetail'
import { SLOs } from '@/pages/SLOs'
import { Recommendations } from '@/pages/Recommendations'
import { Squads } from '@/pages/Squads'
import { Login } from '@/pages/Login'
import { LoginCallback } from '@/pages/LoginCallback'
import { Onboarding } from '@/pages/Onboarding'
import { SettingsApiKeys } from '@/pages/SettingsApiKeys'
import { SettingsAi } from '@/pages/SettingsAi'
import { SettingsScoreConfig } from '@/pages/SettingsScoreConfig'
import { SettingsTags } from '@/pages/SettingsTags'
import { GettingStarted } from '@/pages/GettingStarted'
import { RemediatePage } from '@/pages/RemediatePage'
import { AriaPage } from '@/pages/AriaPage'
import { SettingsIntegrations } from '@/pages/SettingsIntegrations'
import { AdminOverview } from '@/pages/AdminOverview'
import { Docs } from '@/pages/Docs'

// Redireciona /applications/:id → /scorecards/:id (compat. com links externos / bookmarks)
function RedirectById({ to }: { to: string }) {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`${to}/${id}`} replace />
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const appLogoUrl = import.meta.env.VITE_APP_LOGO_URL?.trim() || '/logo.png'
const faviconUrl = import.meta.env.VITE_FAVICON_URL?.trim() || appLogoUrl

export default function App() {
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]') ?? document.createElement('link')
    link.rel = 'icon'
    link.type = 'image/png'
    link.href = faviconUrl
    if (!link.parentNode) {
      document.head.appendChild(link)
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/login/callback" element={<LoginCallback />} />
              <Route path="/signup" element={<Onboarding />} />
              <Route path="/onboarding" element={<Navigate to="/signup" replace />} />

              {/* Documentação pública — não requer autenticação */}
              <Route path="/docs" element={<Docs />} />
              <Route path="/docs/:slug" element={<Docs />} />

              {/* Redirects de compatibilidade — /applications foi removido em favor de /scorecards */}
              <Route path="/applications" element={<Navigate to="/scorecards" replace />} />
              <Route path="/applications/:id" element={<RedirectById to="/scorecards" />} />
              <Route path="/applications/:id/scorecard" element={<RedirectById to="/scorecards" />} />

              <Route
                element={(
                  <AuthGate>
                    <Layout />
                  </AuthGate>
                )}
              >
                <Route path="/" element={<Dashboard />} />
                <Route path="/getting-started" element={<GettingStarted />} />
                <Route path="/incidents" element={<Incidents />} />
                <Route path="/scorecards" element={<Scorecards />} />
                <Route path="/scorecards/:id" element={<ApplicationDetail backPath="/scorecards" backLabel="Voltar para scorecards" showScorecardButton={false} />} />
                <Route path="/scorecards/:id/scorecard" element={<ScorecardDetail />} />
                <Route path="/slos" element={<SLOs />} />
                <Route
                  path="/recommendations"
                  element={(
                    <AuthGate requireAdmin>
                      <Recommendations />
                    </AuthGate>
                  )}
                />
                <Route path="/aria" element={<AriaPage />} />
                <Route path="/scorecards/:id/remediate" element={<RemediatePage />} />
                <Route
                  path="/settings/hpa-templates"
                  element={<Navigate to="/settings/score-config" replace />}
                />
                <Route
                  path="/settings/auto-remediation"
                  element={<Navigate to="/settings/integrations" replace />}
                />
                <Route
                  path="/settings/integrations"
                  element={(
                    <AuthGate requireAdmin>
                      <SettingsIntegrations />
                    </AuthGate>
                  )}
                />
                <Route path="/topology" element={<Squads />} />
                <Route path="/squads" element={<Navigate to="/topology" replace />} />
                <Route
                  path="/settings/api-keys"
                  element={(
                    <AuthGate requireAdmin>
                      <SettingsApiKeys />
                    </AuthGate>
                  )}
                />
                <Route
                  path="/settings/ai"
                  element={(
                    <AuthGate requireAdmin>
                      <SettingsAi />
                    </AuthGate>
                  )}
                />
                <Route
                  path="/settings/score-config"
                  element={(
                    <AuthGate requireAdmin>
                      <SettingsScoreConfig />
                    </AuthGate>
                  )}
                />
                <Route
                  path="/settings/tags"
                  element={(
                    <AuthGate requireAdmin>
                      <SettingsTags />
                    </AuthGate>
                  )}
                />
                <Route
                  path="/admin/overview"
                  element={(
                    <AuthGate requireAdmin>
                      <AdminOverview />
                    </AuthGate>
                  )}
                />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
