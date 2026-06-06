import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getCalendar, getLastRaceResults, getDriverStandings } from '../api/jolpica'
import { useLiveTiming } from '../hooks/useLiveTiming'
import { getNextRace, isToday, countdownUnits } from '../utils/format'
import { getTeamColor } from '../utils/teamColors'
import { HERO_BG } from '../utils/images'
import { DRIVER_NAT_CODE } from '../utils/flags'
import { useCountdown } from '../hooks/useCountdown'
import { DriverStandings } from '../components/standings/DriverStandings'
import { ConstructorStandings } from '../components/standings/ConstructorStandings'
import { RaceCalendar } from '../components/standings/RaceCalendar'
import { NewsFeed } from '../components/news/NewsFeed'
import { PageShell } from '../components/ui/PageShell'
import { Panel } from '../components/ui/Panel'
import { Flag } from '../components/ui/Flag'
import { Radio, Trophy, MapPin, Zap, Newspaper } from 'lucide-react'
import { useDriverPhotos } from '../hooks/useDriverPhotos'
import { Skeleton } from '../components/ui/Skeleton'

function LiveEventBanner({ live }) {
  const navigate = useNavigate()

  // Dois estados: transmitindo agora ("Evento ao vivo agora") ou um evento que
  // terminou há pouco no fim de semana ("Último evento ao vivo"). Em ambos o
  // clique leva ao /live (que mostra os últimos dados disponíveis).
  const isLive = live?.live && live?.data
  const recent = !isLive ? live?.recentEvent : null
  if (!isLive && !recent) return null

  const label = isLive ? 'Evento ao vivo agora' : 'Último evento ao vivo'
  const title = isLive ? `${live.data.session.gp} · ${live.data.session.name}` : `${recent.gp} · ${recent.name}`

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate('/live')}
      className="relative rounded-2xl overflow-hidden p-4 cursor-pointer group glow-live"
      style={{ background: 'rgba(225,6,0,0.08)', border: '2px solid rgba(225,6,0,0.4)' }}
    >
      <div className="absolute inset-0 opacity-10"
        style={{ background: 'radial-gradient(ellipse at center, #e10600, transparent 60%)' }} />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full bg-red-500 ${isLive ? 'live-dot' : ''}`} />
          <div>
            <div className="text-red-400 text-xs font-black uppercase tracking-widest">{label}</div>
            <div className="text-white text-lg font-display font-bold uppercase">
              {title}
            </div>
          </div>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm group-hover:scale-105 transition-transform"
          style={{ background: 'var(--color-f1)', color: 'white' }}
          aria-label="Acompanhar sessão ao vivo"
        >
          <Radio size={14} aria-hidden />
          Acompanhar
        </button>
      </div>
    </motion.div>
  )
}

function HeroCountdown({ countdown, reachedStart, raceName, raceLocation, circuitId, isRaceDay }) {
  const navigate = useNavigate()
  const units = countdownUnits(countdown)

  const handleClick = () => {
    if (isRaceDay || reachedStart) navigate('/live')
    else navigate(`/circuit/${circuitId}`)
  }

  return (
    <div
      onClick={handleClick}
      className="w-full flex flex-col items-center justify-center text-center px-4 py-8 relative z-10 cursor-pointer group"
    >
      <p className={`text-[11px] uppercase tracking-widest mb-1 ${reachedStart ? 'text-red-400 font-bold' : 'text-text-mute'}`}>
        {reachedStart ? 'Corrida ao vivo' : 'Próxima corrida'}
      </p>
      <h2 className="text-2xl font-display font-bold uppercase tracking-wide text-text mb-1 group-hover:text-red-400 transition-colors">{raceName}</h2>
      {raceLocation && (
        <p className="flex items-center justify-center gap-1 text-[11px] text-text-mute mb-6">
          <MapPin size={10} aria-hidden />{raceLocation}
        </p>
      )}

      {reachedStart ? (
        // Horário de largada chegou → o card vira a chamada para o ao vivo.
        <button
          onClick={(e) => { e.stopPropagation(); navigate('/live') }}
          className="inline-flex items-center gap-2.5 px-7 py-3 rounded-full font-bold text-base transition-all hover:scale-105 active:scale-95"
          style={{ background: 'var(--color-f1)', color: 'white' }}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-white live-dot" />
          <Radio size={17} aria-hidden /> Clique aqui para acompanhar
        </button>
      ) : (
        // Contagem regressiva. O link para o circuito é o próprio card (onClick
        // externo) — não há mais botão "Ver Circuito" embaixo (o aviso de ao
        // vivo fica no banner do topo).
        <div className="flex items-center justify-center gap-4">
          {units.map(({ v, label }, i) => (
            <div key={label} className="flex items-center gap-4">
              {i > 0 && <span className="num text-text-mute text-3xl font-bold self-start mt-1">:</span>}
              <div className="flex flex-col items-center">
                <motion.div
                  key={v}
                  initial={{ y: -6, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="num text-5xl font-bold text-text tabular-nums leading-none"
                >
                  {String(v).padStart(2, '0')}
                </motion.div>
                <span className="text-[9px] text-text-mute uppercase tracking-widest mt-1.5">{label}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LastRacePodium({ race }) {
  const navigate = useNavigate()
  if (!race) return null
  const top3 = race.Results?.slice(0, 3) ?? []
  const medals = ['🥇', '🥈', '🥉']
  const order = [1, 0, 2]
  const heights = [68, 90, 52]

  const gpName = race.raceName?.replace(' Grand Prix', ' GP') ?? ''
  const raceDate = race.date
    ? new Date(race.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    : null

  return (
    <Panel
      title="Pódio"
      icon={<Trophy size={13} aria-hidden />}
      right={<span className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--color-text-mute)' }}>Última Corrida</span>}
    >
      {/* GP name + date subtitle */}
      <div className="flex items-baseline justify-between mb-1 -mt-1">
        <span className="text-xs font-bold text-text">{gpName}</span>
        {raceDate && <span className="num text-[10px] text-text-mute">{raceDate}</span>}
      </div>

      <div className="flex items-end justify-center gap-2 pt-3">
        {order.map((idx, displayIdx) => {
          const r = top3[idx]
          if (!r) return null
          const color = getTeamColor(r.Constructor.name)
          const natCode = DRIVER_NAT_CODE[r.Driver.nationality]
          return (
            <div
              key={idx}
              className="flex flex-col items-center gap-1.5 flex-1 cursor-pointer group"
              onClick={() => navigate(`/driver/${r.Driver.driverId}`)}
            >
              <div className="text-xl">{medals[idx]}</div>
              <div
                className="w-full rounded-t-lg flex flex-col items-center justify-center p-2 relative overflow-hidden transition-opacity group-hover:opacity-80"
                style={{
                  height: heights[displayIdx],
                  background: `linear-gradient(to top, ${color}28, ${color}08)`,
                  border: `1px solid ${color}35`,
                }}
              >
                <Flag code={natCode} size={14} />
                <span className="text-xs font-black text-text mt-1">{r.Driver.code}</span>
                <span className="text-[9px] mt-0.5 truncate w-full text-center" style={{ color }}>
                  {r.Constructor.name}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

function LeaderCard({ standing, photos }) {
  const navigate = useNavigate()
  if (!standing) return null
  const color = getTeamColor(standing.Constructors?.[0]?.name)
  const natCode = DRIVER_NAT_CODE[standing.Driver.nationality]
  const photo = photos[standing.Driver.code]

  return (
    <div
      className="card relative overflow-hidden cursor-pointer hover:border-opacity-50 transition-all flex items-center"
      style={{ border: `1px solid ${color}30`, minHeight: 88 }}
      onClick={() => navigate(`/driver/${standing.Driver.driverId}`)}
    >
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ background: `radial-gradient(ellipse at top right, ${color}, transparent)` }} />

      {/* Driver photo on the right */}
      {photo && (
        <div className="absolute right-0 top-0 bottom-0 w-24 overflow-hidden">
          <img
            src={photo}
            alt=""
            aria-hidden
            className="w-full h-full object-cover object-top"
            style={{ maskImage: 'linear-gradient(to left, rgba(0,0,0,0.5), transparent)', WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,0.5), transparent)' }}
            onError={e => { e.target.style.display = 'none' }}
          />
        </div>
      )}

      <div className="relative z-10 flex flex-col gap-1 px-5 py-4">
        <div className="text-[9px] text-text-mute uppercase tracking-wider">Líder do Campeonato</div>
        <div className="flex items-center gap-2 mt-0.5">
          <Flag code={natCode} size={14} />
          <div className="font-display font-bold text-lg text-text uppercase leading-tight">
            {standing.Driver.givenName.slice(0, 1)}. <span style={{ color }}>{standing.Driver.familyName}</span>
          </div>
        </div>
        <div className="text-[10px] text-text-mute">{standing.Constructors?.[0]?.name}</div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="num text-2xl font-bold text-text">{standing.points}</span>
          <span className="text-text-mute text-xs">pts</span>
          <span className="num text-yellow-500 text-sm font-bold">{standing.wins}W</span>
        </div>
      </div>
    </div>
  )
}

export function HomePage() {
  const { data: races } = useQuery({ queryKey: ['calendar', 'current'], queryFn: () => getCalendar('current'), staleTime: 3_600_000 })
  const { data: lastRace, isLoading: lastRaceLoading } = useQuery({ queryKey: ['lastRace'], queryFn: getLastRaceResults, staleTime: 300_000 })
  const { data: standings, isLoading: standingsLoading } = useQuery({ queryKey: ['driverStandings', 'current'], queryFn: () => getDriverStandings('current'), staleTime: 300_000 })
  const { data: live } = useLiveTiming()

  const photos = useDriverPhotos()
  const nextRace = getNextRace(races ?? [])
  const raceDateTime = nextRace ? `${nextRace.date}T${nextRace.time ?? '00:00:00'}` : null
  const raceDay = nextRace ? isToday(nextRace.date) : false
  const leader = standings?.[0]
  const heroBg = HERO_BG

  // Countdown elevado para cá para que o card inteiro do hero saiba quando a
  // corrida começou (pulso ao vivo + chamada). reachedStart = chegou a largada.
  const countdown = useCountdown(raceDateTime)
  const reachedStart = !!raceDateTime && !countdown

  return (
    <PageShell>
      {/* Live Event Banner */}
      <LiveEventBanner live={live} />

      {/* Hero + top info row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hero countdown — takes 2 cols */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`lg:col-span-2 relative rounded-2xl overflow-hidden flex items-center justify-center ${reachedStart ? 'live-pulse' : ''}`}
          style={{ border: '1px solid rgba(225,6,0,0.15)', minHeight: 200 }}
        >
          <div className="absolute inset-0"
            style={{ backgroundImage: `url(${heroBg})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.1 }} />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #130000 60%, #0a0a0a 100%)' }} />
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, var(--color-f1), transparent)' }} />

          {nextRace ? (
            <HeroCountdown
              countdown={countdown}
              reachedStart={reachedStart}
              raceName={nextRace.raceName}
              raceLocation={`${nextRace.Circuit?.Location?.locality}, ${nextRace.Circuit?.Location?.country}`}
              circuitId={nextRace.Circuit?.circuitId}
              isRaceDay={raceDay}
            />
          ) : (
            <div className="py-10 text-center text-text-mute">Temporada encerrada</div>
          )}
        </motion.div>

        {/* Leader + Last race stacked in 1 col */}
        <div className="flex flex-col gap-4">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            {standingsLoading
              ? <Skeleton height={88} rounded={12} />
              : <LeaderCard standing={leader} photos={photos} />
            }
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex-1">
            {lastRaceLoading
              ? <Skeleton height={180} rounded={12} />
              : <LastRacePodium race={lastRace} />
            }
          </motion.div>
        </div>
      </div>

      {/* Bottom data row: standings + calendar + news */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Panel title="Pilotos" icon={<Zap size={13} aria-hidden />}>
          <DriverStandings season="current" />
        </Panel>
        <Panel title="Construtores" icon={<Trophy size={13} aria-hidden />}>
          <ConstructorStandings season="current" />
        </Panel>
        <Panel title="Calendário" icon={<MapPin size={13} aria-hidden />}>
          <RaceCalendar season="current" compact />
        </Panel>
        <Panel title="Notícias" icon={<Newspaper size={13} aria-hidden />}>
          <NewsFeed limit={5} />
        </Panel>
      </div>
    </PageShell>
  )
}
