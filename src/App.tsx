import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { AuthGate } from '@/components/auth/AuthGate'
import { Layout } from '@/components/layout/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { Incidents } from '@/pages/Incidents'
import { Applications } from '@/pages/Applications'
import { ApplicationDetail } from '@/pages/ApplicationDetail'
import { Scorecards } from '@/pages/Scorecards'
import { ScorecardDetail } from '@/pages/ScorecardDetail'
import { SLOs } from '@/pages/SLOs'
import { Recommendations } from '@/pages/Recommendations'
import { Squads } from '@/pages/Squads'
import { Login } from '@/pages/Login'
import { LoginCallback } from '@/pages/LoginCallback'
import { Onboarding } from '@/pages/Onboarding'
import { SettingsAuth } from '@/pages/SettingsAuth'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
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
              <Route
                element={(
                  <AuthGate>
                    <Layout />
                  </AuthGate>
                )}
              >
                <Route path="/" element={<Dashboard />} />
                <Route path="/incidents" element={<Incidents />} />
                <Route path="/scorecards" element={<Scorecards />} />
                <Route path="/scorecards/:id" element={<ApplicationDetail backPath="/scorecards" backLabel="Voltar para scorecards" showScorecardButton={false} />} />
                <Route path="/applications" element={<Applications />} />
                <Route path="/applications/:id" element={<ApplicationDetail backPath="/applications" backLabel="Voltar para workloads" showScorecardButton />} />
                <Route path="/applications/:id/scorecard" element={<ScorecardDetail />} />
                <Route path="/slos" element={<SLOs />} />
                <Route
                  path="/recommendations"
                  element={(
                    <AuthGate requireAdmin>
                      <Recommendations />
                    </AuthGate>
                  )}
                />
                <Route path="/topology" element={<Squads />} />
                <Route path="/squads" element={<Navigate to="/topology" replace />} />
                <Route
                  path="/settings/auth"
                  element={(
                    <AuthGate requireAdmin>
                      <SettingsAuth />
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
