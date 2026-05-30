import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Header } from './components/ui/Header'
import { ChatPanel } from './components/ai/ChatPanel'
import { HomePage } from './pages/HomePage'
import { LivePage } from './pages/LivePage'
import { StandingsPage } from './pages/StandingsPage'
import { CalendarPage } from './pages/CalendarPage'
import { DriverPage } from './pages/DriverPage'
import { TeamPage } from './pages/TeamPage'
import { CircuitPage } from './pages/CircuitPage'
import { RacePage } from './pages/RacePage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen" style={{ background: '#0a0a0a' }}>
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/live" element={<LivePage />} />
              <Route path="/standings" element={<StandingsPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/driver/:driverId" element={<DriverPage />} />
              <Route path="/team/:constructorId" element={<TeamPage />} />
              <Route path="/circuit/:circuitId" element={<CircuitPage />} />
              <Route path="/race/:season/:round" element={<RacePage />} />
            </Routes>
          </main>
          <ChatPanel />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
