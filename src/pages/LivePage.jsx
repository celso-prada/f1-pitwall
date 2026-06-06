import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PITWALL_BG } from '../utils/images'
import { getDriverStandings } from '../api/jolpica'
import { AI_ENABLED } from '../config'
import { useLiveTiming } from '../hooks/useLiveTiming'
import { useFollowedDrivers } from '../hooks/useFollowedDrivers'
import { LiveSessionBar } from '../components/live/LiveSessionBar'
import { SessionSummary } from '../components/live/SessionSummary'
import { OfficialTower } from '../components/live/OfficialTower'
import { LiveConditions } from '../components/live/LiveConditions'
import { LiveRaceControl } from '../components/live/LiveRaceControl'
import { StewardDecisions } from '../components/live/StewardDecisions'
import { LiveRadio } from '../components/live/LiveRadio'
import { BestSectorsPanel } from '../components/live/BestSectorsPanel'
import { StrategyPanel } from '../components/live/StrategyPanel'
import { PositionChart } from '../components/live/PositionChart'
import { ChampionshipPanel } from '../components/live/ChampionshipPanel'
import { HistoricLive } from './HistoricLive'
import { NewsFeed } from '../components/news/NewsFeed'
import { Panel } from '../components/ui/Panel'
import { Activity, Cloud, Radio, Newspaper, ChevronRight, Timer, TrendingUp, Trophy, Gavel, Star, Sparkles, Swords } from 'lucide-react'

function DriverQuickInfo({ d, profileId, onClose, navigate, isFollowed, onToggleFollow }) {
  if (!d) return null
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
      className="card p-4 relative" style={{ border: `1px solid ${d.color}40` }}
    >
      <button onClick={onClose} aria-label="Fechar" className="absolute top-3 right-3 text-text-mute hover:text-text text-lg leading-none">×</button>
      <div className="flex items-center gap-3 mb-3">
        {d.headshot && <img src={d.headshot} alt={d.name} className="w-12 h-12 rounded-full object-cover" style={{ border: `2px solid ${d.color}60` }} onError={e => { e.target.style.display = 'none' }} />}
        <div>
          <div className="font-display font-bold text-text uppercase tracking-wide">{d.name}</div>
          <div className="text-sm" style={{ color: d.color }}>{d.team}</div>
          <div className="num text-xs text-text-mute">#{d.num}</div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => profileId && navigate(`/driver/${profileId}`)}
          disabled={!profileId}
          className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: d.color + '18', color: d.color, border: `1px solid ${d.color}28` }}
        >
          Ver perfil completo <ChevronRight size={12} className="ml-auto" aria-hidden />
        </button>
        <button
          onClick={() => onToggleFollow?.(d.num)}
          aria-pressed={isFollowed}
          title={isFollowed ? 'Deixar de seguir' : 'Fixar no topo da torre'}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold shrink-0 transition-colors"
          style={{
            background: isFollowed ? 'rgba(225,6,0,0.12)' : 'var(--color-surface-2)',
            color: isFollowed ? 'var(--color-f1)' : 'var(--color-text-dim)',
            border: `1px solid ${isFollowed ? 'rgba(225,6,0,0.35)' : 'var(--color-border-strong)'}`,
          }}
        >
          <Star size={13} className={isFollowed ? 'fill-current' : ''} aria-hidden />
          {isFollowed ? 'Seguindo' : 'Seguir'}
        </button>
      </div>
    </motion.div>
  )
}

// Tela AO VIVO sobre o feed oficial da F1 (timing tower com minisetores, gaps,
// pneus, bandeiras, relógio, race control e rádio em tempo real).
function LiveOfficial({ data }) {
  const navigate = useNavigate()
  const [selected, setSelected] = useState(null)
  const { followed, toggle: toggleFollow, isFollowed } = useFollowedDrivers()
  const isRace = data.session.lap != null || data.session.type === 'Race'

  // O perfil (/driver/:id) usa o driverId da Jolpica (ex.: "norris"), não o TLA.
  // Resolvemos via standings — o mesmo caminho que a home usa para navegar.
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
  const selectedProfileId = selected
    ? (idByCode[selected.tla] || selected.lastName?.toLowerCase() || null)
    : null

  return (
    <div className="relative">
      <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: `url(${PITWALL_BG})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.05, zIndex: 0 }} aria-hidden />

      <div className="relative z-10 w-full max-w-[1800px] mx-auto px-4 lg:px-6 py-4 space-y-3">
        <LiveSessionBar session={data.session} />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          <div className="xl:col-span-2 space-y-3">
            <Panel title="Cronometragem" icon={<Activity size={12} aria-hidden />} padding="p-2">
              <OfficialTower drivers={data.drivers} part={data.session.part} partLabel={data.session.partLabel} onSelect={setSelected} followed={followed} />
            </Panel>
            <AnimatePresence>
              {selected && (
                <DriverQuickInfo
                  d={selected}
                  profileId={selectedProfileId}
                  onClose={() => setSelected(null)}
                  navigate={navigate}
                  isFollowed={isFollowed(selected.num)}
                  onToggleFollow={toggleFollow}
                />
              )}
            </AnimatePresence>

            <Panel title="Melhores Setores · Volta Ideal" icon={<Timer size={12} aria-hidden />} padding="p-3">
              <BestSectorsPanel drivers={data.drivers} />
            </Panel>

            {isRace && (
              <Panel title="Estratégia · Undercut & Pit" icon={<Swords size={12} aria-hidden />} padding="p-3">
                <StrategyPanel drivers={data.drivers} />
              </Panel>
            )}

            {isRace && Object.keys(data.lapSeries || {}).length > 0 && (
              <Panel title="Evolução de Posições" icon={<TrendingUp size={12} aria-hidden />} padding="p-3">
                <PositionChart lapSeries={data.lapSeries} drivers={data.drivers} />
              </Panel>
            )}
          </div>

          <div className="xl:col-span-1 space-y-3">
            {AI_ENABLED && (
              <Panel title="Resumo da Sessão · IA" icon={<Sparkles size={12} aria-hidden />} padding="p-3">
                <SessionSummary live={data} />
              </Panel>
            )}
            <Panel title="Condições" icon={<Cloud size={12} aria-hidden />} padding="p-3">
              <LiveConditions weather={data.weather} />
            </Panel>
            {isRace && data.championship && (
              <Panel title="Previsão do Campeonato" icon={<Trophy size={12} aria-hidden />} padding="p-3">
                <ChampionshipPanel championship={data.championship} drivers={data.drivers} />
              </Panel>
            )}
            <Panel title="Race Control" icon={<Radio size={12} aria-hidden />} padding="p-3">
              <LiveRaceControl messages={data.raceControl} />
            </Panel>
            <Panel title="Comissários · Punições" icon={<Gavel size={12} aria-hidden />} padding="p-3">
              <StewardDecisions messages={data.raceControl} drivers={data.drivers} />
            </Panel>
            <Panel title="Team Radio" icon={<Radio size={12} aria-hidden />} padding="p-3">
              <LiveRadio captures={data.teamRadio} />
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

export function LivePage() {
  const { data: live } = useLiveTiming()

  // Enquanto o 1º poll do /api/live não resolve (live === undefined), mostramos
  // um placeholder leve em vez de cair no HistoricLive — assim o OpenF1
  // (bloqueado durante o ao vivo) só é chamado quando sabemos que NÃO há sessão
  // ao vivo, evitando erros de CORS e um flash de tela.
  if (!live) {
    return (
      <div className="w-full max-w-[1800px] mx-auto px-4 lg:px-6 py-10">
        <div className="card p-6 animate-pulse text-text-mute font-display uppercase tracking-widest text-sm">
          Conectando ao feed ao vivo…
        </div>
      </div>
    )
  }

  // Há sessão transmitindo agora → feed oficial. Senão, consulta histórica
  // (OpenF1), que volta a responder quando não há sessão ao vivo.
  if (live?.live && live.data?.drivers?.length) return <LiveOfficial data={live.data} />
  return <HistoricLive />
}
