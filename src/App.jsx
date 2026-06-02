import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { hydrateQueryClient, persistQueryClient } from './utils/queryPersist'
import { Header } from './components/ui/Header'
import { HomePage } from './pages/HomePage'
import { LivePage } from './pages/LivePage'
import { StandingsPage } from './pages/StandingsPage'
import { CalendarPage } from './pages/CalendarPage'
import { DriverPage } from './pages/DriverPage'
import { TeamPage } from './pages/TeamPage'
import { CircuitPage } from './pages/CircuitPage'
import { RacePage } from './pages/RacePage'
import { RadioPage } from './pages/RadioPage'
import { TelemetriaPage } from './pages/TelemetriaPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
    },
  },
})

// Paint instantly from the last good data, then revalidate in the background.
hydrateQueryClient(queryClient)
persistQueryClient(queryClient)

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen" style={{ background: '#0a0a0a' }}>
          <Header />
          {/* On mobile the fixed bottom nav (64px) sits over the page, so we
              reserve its height + a small gap + the device safe-area inset.
              That way the last line of every page stops just above the bar. */}
          <main className="pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/live" element={<LivePage />} />
              <Route path="/standings" element={<StandingsPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/driver/:driverId" element={<DriverPage />} />
              <Route path="/team/:constructorId" element={<TeamPage />} />
              <Route path="/circuit/:circuitId" element={<CircuitPage />} />
              <Route path="/race/:season/:round" element={<RacePage />} />
              <Route path="/radio" element={<RadioPage />} />
              <Route path="/telemetria" element={<TelemetriaPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
