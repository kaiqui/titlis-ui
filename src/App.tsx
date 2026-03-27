import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { Layout } from '@/components/layout/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { Applications } from '@/pages/Applications'
import { ApplicationDetail } from '@/pages/ApplicationDetail'
import { Scorecards } from '@/pages/Scorecards'
import { ScorecardDetail } from '@/pages/ScorecardDetail'
import { SLOs } from '@/pages/SLOs'
import { Recommendations } from '@/pages/Recommendations'
import { Squads } from '@/pages/Squads'

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
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/scorecards" element={<Scorecards />} />
              <Route path="/scorecards/:id" element={<ApplicationDetail backPath="/scorecards" backLabel="Voltar para scorecards" showScorecardButton={false} />} />
              <Route path="/applications" element={<Applications />} />
              <Route path="/applications/:id" element={<ApplicationDetail backPath="/applications" backLabel="Voltar para workloads" showScorecardButton />} />
              <Route path="/applications/:id/scorecard" element={<ScorecardDetail />} />
              <Route path="/slos" element={<SLOs />} />
              <Route path="/recommendations" element={<Recommendations />} />
              <Route path="/topology" element={<Squads />} />
              <Route path="/squads" element={<Navigate to="/topology" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
