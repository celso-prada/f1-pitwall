import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getDriverStandings } from '../api/jolpica'
import {
  useLatestSession, useSessionDrivers, useLivePositions, useLiveIntervals,
  useLiveWeather, usePitStops, useRaceControl, useTeamRadio, useStints, useLatestLaps,
} from '../hooks/useLiveRace'
import { deriveTrackStatus, buildLapInfo, currentLap } from '../utils/live'
import { LiveTower } from '../components/live/LiveTower'
import { TrackStatusBanner } from '../components/live/TrackStatusBanner'
import { WeatherWidget } from '../components/live/WeatherWidget'
import { RaceControlFeed } from '../components/live/RaceControlFeed'
import { PitStopTracker } from '../components/live/PitStopTracker'
import { StintTracker } from '../components/live/StintTracker'
import { TeamRadio } from '../components/live/TeamRadio'
import { NewsFeed } from '../components/news/NewsFeed'
import { LiveBadge } from '../components/ui/LiveBadge'
import { Panel } from '../components/ui/Panel'
import { Radio, Cloud, AlertCircle, Activity, ChevronRight, Layers, Newspaper } from 'lucide-react'

function DriverQuickInfo({ driver, profileId, onClose, navigate }) {
  if (!driver) return null
  const color = driver.team_colour ? `#${driver.team_colour}` : '#666'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="card p-4 relative"
      style={{ border: `1px solid ${color}40` }}
    >
      <button
        onClick={onClose}
        aria-label="Fechar"
        className="absolute top-3 right-3 text-text-mute hover:text-text text-lg leading-none transition-colors"
      >×</button>

      <div className="flex items-center gap-3 mb-3">
        {driver.headshot_url && (
          <img
            src={driver.headshot_url}
            alt={driver.full_name}
            className="w-12 h-12 rounded-full object-cover"
            style={{ border: `2px solid ${color}60` }}
            onError={e => { e.target.style.display = 'none' }}
          />
        )}
        <div>
          <div className="font-display font-bold text-text uppercase tracking-wide">{driver.full_name}</div>
          <div className="text-sm" style={{ color }}>{driver.team_name}</div>
          <div className="num text-xs text-text-mute">#{driver.driver_number}</div>
        </div>
      </div>

      <button
        onClick={() => profileId && navigate(`/driver/${profileId}`)}
        disabled={!profileId}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: color + '18', color, border: `1px solid ${color}28` }}
      >
        Ver perfil completo <ChevronRight size={12} className="ml-auto" aria-hidden />
      </button>
    </motion.div>
  )
}

// Modo "fora do ao vivo": consulta histórica da última sessão via OpenF1
// (que só responde quando NÃO há sessão ao vivo em andamento).
export function HistoricLive() {
  const navigate = useNavigate()
  const [selectedDriver, setSelectedDriver] = useState(null)

  const { data: session, isLoading: sessionLoading } = useLatestSession()
  const sessionKey = session?.session_key

  const now = new Date()
  const isLive = session &&
    new Date(session.date_start) <= now &&
    new Date(session.date_end) >= now

  const { data: drivers,     isLoading: driversLoading } = useSessionDrivers(sessionKey)
  const { data: positions,   isLoading: posLoading }     = useLivePositions(sessionKey, isLive)
  const { data: intervals }                               = useLiveIntervals(sessionKey, isLive)
  const { data: weather,     isLoading: weatherLoading }  = useLiveWeather(sessionKey, isLive)
  const { data: pits }                                    = usePitStops(sessionKey, isLive)
  const { data: raceControl, isLoading: rcLoading }       = useRaceControl(sessionKey, isLive)
  const { data: teamRadio }                               = useTeamRadio(sessionKey, isLive)
  const { data: stints }                                  = useStints(sessionKey, isLive)
  const { data: laps }                                    = useLatestLaps(sessionKey, isLive)

  const loading = sessionLoading || driversLoading || posLoading
  const trackStatus = deriveTrackStatus(raceControl)
  const lapInfo = buildLapInfo(laps)
  const lapNo = currentLap(laps)

  // O perfil (/driver/:id) usa o driverId da Jolpica (ex.: "norris"), não o TLA
  // do OpenF1 (ex.: "NOR"). Resolvemos via standings — mesmo caminho da home e
  // do modo ao vivo oficial.
  const { data: standings } = useQuery({
    queryKey: ['driverStandings', 'current'],
    queryFn: () => getDriverStandings('current'),
    staleTime: 300_000,
  })
  const idByCode = useMemo(() => {
    const m = {}
    for (const s of standings ?? []) if (s.Driver?.code) m[s.Driver.code] = s.Driver.driverId
    return m
  }, [standings])
  const selectedProfileId = selectedDriver
    ? (idByCode[selectedDriver.name_acronym] || selectedDriver.last_name?.toLowerCase() || null)
    : null

  return (
    <div className="relative">
      <div className="relative z-10 w-full max-w-[1800px] mx-auto px-4 lg:px-6 py-4 space-y-3">
        {session && (
          <TrackStatusBanner
            status={trackStatus}
            sessionName={session.session_name}
            gp={`${session.country_name} · ${session.circuit_short_name}`}
            lap={isLive ? lapNo : null}
            isLive={isLive}
          />
        )}
        {!session && !sessionLoading && (
          <h1 className="font-display font-bold text-2xl text-text uppercase tracking-wide">Sem sessão recente.</h1>
        )}
        {!session && sessionLoading && (
          <h1 className="font-display font-bold text-2xl text-text uppercase tracking-wide">Carregando sessão…</h1>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          <div className="xl:col-span-2 space-y-3">
            <Panel
              title="Cronometragem"
              icon={<Activity size={12} aria-hidden />}
              right={isLive ? <LiveBadge /> : <span className="text-[9px] text-text-mute uppercase tracking-widest">Última sessão</span>}
              padding="p-3"
            >
              <LiveTower
                positions={positions}
                drivers={drivers}
                intervals={intervals}
                stints={stints}
                lapInfo={lapInfo}
                loading={loading}
                onSelectDriver={setSelectedDriver}
                selectedDriver={selectedDriver}
              />
            </Panel>

            {selectedDriver && (
              <DriverQuickInfo
                driver={selectedDriver}
                profileId={selectedProfileId}
                onClose={() => setSelectedDriver(null)}
                navigate={navigate}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Panel title="Estratégia de Pneus" icon={<Layers size={12} aria-hidden />} padding="p-3">
                <StintTracker stints={stints} positions={positions} drivers={drivers} loading={loading} />
              </Panel>
              <Panel title="Pit Stops" icon={<AlertCircle size={12} aria-hidden />} padding="p-3">
                <PitStopTracker pits={pits} drivers={drivers} />
              </Panel>
            </div>
          </div>

          <div className="xl:col-span-1 space-y-3">
            <Panel title="Condições" icon={<Cloud size={12} aria-hidden />} padding="p-3">
              <WeatherWidget weather={weather} loading={weatherLoading} />
            </Panel>
            <Panel title="Race Control" icon={<Radio size={12} aria-hidden />} padding="p-3">
              <RaceControlFeed messages={raceControl} loading={rcLoading} />
            </Panel>
            <Panel title="Team Radio" icon={<Radio size={12} aria-hidden />} padding="p-3">
              <TeamRadio messages={teamRadio} drivers={drivers} loading={false} />
            </Panel>
            <Panel title="Notícias" icon={<Newspaper size={12} aria-hidden />} padding="p-3">
              <NewsFeed limit={4} />
            </Panel>
          </div>
        </div>
      </div>
    </div>
  )
}
