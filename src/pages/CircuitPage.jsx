import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { getCircuitResults } from '../api/jolpica'
import { getCircuitSessions } from '../api/openf1'
import { getTeamColor } from '../utils/teamColors'
import { getCircuitImage } from '../utils/images'
import { DRIVER_NAT_CODE, CIRCUIT_COUNTRY, CIRCUIT_OPENF1_NAME } from '../utils/flags'
import { Skeleton } from '../components/ui/Skeleton'
import { Flag } from '../components/ui/Flag'
import { PageShell } from '../components/ui/PageShell'
import { Panel } from '../components/ui/Panel'
import { ArrowLeft, MapPin, Clock, Trophy, Calendar } from 'lucide-react'

// Session name → PT-BR label
const SESSION_PT = {
  'Practice 1': 'Treino Livre 1',
  'Practice 2': 'Treino Livre 2',
  'Practice 3': 'Treino Livre 3',
  'Sprint Qualifying': 'Classif. Sprint',
  'Sprint Shootout': 'Classif. Sprint',
  'Sprint': 'Sprint',
  'Qualifying': 'Classificação',
  'Race': 'Corrida',
}

// session_type → accent color
const SESSION_COLOR = {
  Practice: 'var(--color-text-mute)',
  Qualifying: '#818cf8',
  Sprint: '#f59e0b',
  Race: 'var(--color-f1)',
}

function formatBRT(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const opts = { timeZone: 'America/Sao_Paulo' }
  return {
    weekday: d.toLocaleString('pt-BR', { ...opts, weekday: 'short' }).replace('.', ''),
    date:    d.toLocaleString('pt-BR', { ...opts, day: '2-digit', month: '2-digit' }),
    time:    d.toLocaleString('pt-BR', { ...opts, hour: '2-digit', minute: '2-digit' }).replace(':', 'h'),
  }
}

function WeekendSchedule({ sessions, season }) {
  if (!sessions?.length) return null
  const now = new Date()

  return (
    <Panel title={`Fim de Semana · ${season}`} icon={<Calendar size={13} aria-hidden />}>
      <div className="mt-2 space-y-1">
        {sessions.map((session, i) => {
          const isPast  = new Date(session.date_start) < now
          const brt     = formatBRT(session.date_start)
          const label   = SESSION_PT[session.session_name] ?? session.session_name
          const color   = SESSION_COLOR[session.session_type] ?? 'var(--color-text)'
          const isSprint = session.session_type === 'Sprint'
          const isRace   = session.session_type === 'Race'

          return (
            <div
              key={i}
              className="flex items-center gap-3 py-2 px-3 rounded-lg"
              style={{
                opacity: isPast ? 0.55 : 1,
                borderLeft: `2px solid ${isPast ? 'var(--color-border)' : color}`,
                background: (!isPast && (isRace || isSprint)) ? `${color}08` : 'transparent',
              }}
            >
              {/* Session label */}
              <div className="flex-1 min-w-0">
                <span
                  className="text-xs font-semibold"
                  style={{ color: isPast ? 'var(--color-text-mute)' : (isRace || isSprint ? color : 'var(--color-text)') }}
                >
                  {label}
                </span>
              </div>

              {/* Date + time */}
              {brt && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[10px] text-text-mute capitalize num">
                    {brt.weekday} {brt.date}
                  </span>
                  <span
                    className="num text-xs font-bold"
                    style={{ color: isPast ? 'var(--color-text-mute)' : color }}
                  >
                    {brt.time}
                  </span>
                  <span className="text-[9px] text-text-mute">BRT</span>
                </div>
              )}

              {isPast
                ? <span className="text-[10px] text-text-mute flex-shrink-0">✓</span>
                : <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0"
                    style={{ background: `${color}20`, color }}>
                    ao vivo
                  </span>
              }
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

export function CircuitPage() {
  const { circuitId } = useParams()
  const navigate = useNavigate()

  const { data: races, isLoading } = useQuery({
    queryKey: ['circuitResults', circuitId],
    queryFn: () => getCircuitResults(circuitId),
    enabled: !!circuitId,
    staleTime: 3_600_000,
  })

  const sorted          = [...(races ?? [])].sort((a, b) => parseInt(b.season) - parseInt(a.season))
  const lastRace        = sorted[0]
  const circuit         = lastRace?.Circuit
  const location        = circuit?.Location
  const circuitImageUrl = getCircuitImage(circuitId)
  const countryCode     = CIRCUIT_COUNTRY[circuitId]
  const openf1Name      = CIRCUIT_OPENF1_NAME[circuitId]
  const lastSeason      = lastRace?.season ? parseInt(lastRace.season) : null

  // OpenF1 sessions — only fetch for circuits that appear in recent seasons (2023+)
  const { data: sessions = [] } = useQuery({
    queryKey: ['circuitSessions', circuitId, lastSeason],
    queryFn: () => getCircuitSessions(lastSeason, openf1Name),
    enabled: !!openf1Name && !!lastSeason && lastSeason >= 2023,
    staleTime: 3_600_000,
  })

  if (isLoading) {
    return (
      <PageShell>
        <Skeleton height={200} rounded={16} />
        <Skeleton height={300} rounded={16} />
      </PageShell>
    )
  }

  if (!circuit) {
    return (
      <PageShell>
        <div className="text-center text-text-mute py-20">Circuito não encontrado</div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <button
        onClick={() => navigate(-1)}
        aria-label="Voltar"
        className="flex items-center gap-1.5 text-text-mute hover:text-text text-sm transition-colors"
      >
        <ArrowLeft size={16} aria-hidden /> Voltar
      </button>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden p-8"
        style={{ background: 'linear-gradient(135deg, var(--color-surface) 0%, #180800 100%)', border: '1px solid rgba(225,6,0,0.15)' }}
      >
        <div className="absolute inset-0 opacity-10"
          style={{ background: 'radial-gradient(ellipse at right, var(--color-f1), transparent 60%)' }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            {countryCode && <Flag code={countryCode} size={20} />}
            <div className="flex items-center gap-1.5">
              <MapPin size={13} className="text-red-500" aria-hidden />
              <span className="text-[11px] text-text-mute uppercase tracking-wider">
                {location?.locality}, {location?.country}
              </span>
            </div>
          </div>
          <h1 className="font-display font-bold text-3xl text-text uppercase">{circuit?.circuitName}</h1>
          {races?.length && (
            <p className="num text-xs text-text-mute mt-2">{races.length} vencedores históricos</p>
          )}
        </div>
      </motion.div>

      {/* Layout: left col (image + schedule) + right col (winners) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Left: circuit image + weekend schedule */}
        <div className="space-y-4">
          <div
            className="relative rounded-2xl overflow-hidden flex items-center justify-center"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', minHeight: circuitImageUrl ? 200 : 100 }}
          >
            {circuitImageUrl ? (
              <img
                src={circuitImageUrl}
                alt={`${circuit?.circuitName} layout`}
                className="max-h-72 w-full object-contain p-6"
                onError={e => { e.target.parentElement.style.minHeight = '80px'; e.target.style.display = 'none' }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-text-mute">
                <span className="text-4xl" aria-hidden>🏁</span>
                <span className="text-xs font-semibold">{circuit?.circuitName}</span>
                <span className="text-[10px] text-text-mute">Layout em breve</span>
              </div>
            )}
          </div>

          {/* Weekend schedule — only shown when OpenF1 has session data */}
          <WeekendSchedule sessions={sessions} season={lastSeason} />
        </div>

        {/* Right: all-time winners */}
        <Panel
          title={`Todos os Vencedores${sorted.length ? ` · ${sorted.length}` : ''}`}
          icon={<Trophy size={13} aria-hidden />}
        >
          <div className="overflow-y-auto mt-2" style={{ maxHeight: 480 }}>
            {sorted.map((race, i) => {
              const winner = race.Results?.[0]
              if (!winner) return null
              const color   = getTeamColor(winner.Constructor.name)
              const natCode = DRIVER_NAT_CODE[winner.Driver.nationality]
              return (
                <motion.div
                  key={race.season}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.4) }}
                  className="flex items-center gap-3 py-1.5 px-3 rounded-lg cursor-pointer transition-colors hover:bg-[var(--color-surface-2)]"
                  style={{ borderBottom: '1px solid var(--color-border-mute)' }}
                  onClick={() => navigate(`/driver/${winner.Driver.driverId}`)}
                >
                  <div className="num font-black text-sm w-10 flex-shrink-0" style={{ color: i === 0 ? 'var(--color-gold)' : 'var(--color-text-mute)' }}>
                    {race.season}
                  </div>
                  <Flag code={natCode} size={13} />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-text">
                      {winner.Driver.givenName} {winner.Driver.familyName}
                    </span>
                  </div>
                  <div className="text-[10px] text-right flex-shrink-0 hidden sm:block" style={{ color }}>
                    {winner.Constructor.name}
                  </div>
                  {winner.Time?.time && (
                    <div className="flex items-center gap-1 num text-[9px] text-text-mute min-w-max">
                      <Clock size={9} aria-hidden />
                      {winner.Time.time}
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </Panel>
      </div>
    </PageShell>
  )
}
