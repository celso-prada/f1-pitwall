import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getDriverSeasonStats, getDriverResults, getDriverCareerStats,
  getDriverSeasonHistory, getDriverInfo, getDriverAllResults,
} from '../api/jolpica'
import { getWikipediaDriverData, getWikipediaDriverStats } from '../api/wikipedia'
import { getTeamColor } from '../utils/teamColors'
import { DRIVER_NAT_CODE, CIRCUIT_COUNTRY } from '../utils/flags'
import { useDriverPhotos } from '../hooks/useDriverPhotos'
import { formatDate } from '../utils/format'
import { Skeleton } from '../components/ui/Skeleton'
import { Flag } from '../components/ui/Flag'
import { PageShell } from '../components/ui/PageShell'
import { Panel } from '../components/ui/Panel'
import { Stat } from '../components/ui/Stat'
import { ArrowLeft, Trophy, Star, Flag as FlagIcon, Activity, Calendar, ExternalLink, BookOpen, Clock, ZoomIn } from 'lucide-react'
import {
  BarChart, Bar, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

function SeasonChart({ history }) {
  if (!history?.length) return null
  const data = history
    .filter(s => s.DriverStandings?.[0])
    .map(s => ({
      year: s.season,
      pts: parseFloat(s.DriverStandings[0].points),
      pos: parseInt(s.DriverStandings[0].position),
      wins: parseInt(s.DriverStandings[0].wins),
      team: s.DriverStandings[0].Constructors?.[0]?.name,
    }))
    .sort((a, b) => a.year - b.year)

  if (data.length < 2) return null

  return (
    <Panel title="Pontos por Temporada" icon={<Activity size={13} aria-hidden />}>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: 'var(--color-text-mute)', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
          <YAxis tick={{ fill: 'var(--color-text-mute)', fontSize: 9 }} />
          <Tooltip
            contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-strong)', borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: 'var(--color-text-dim)' }}
            formatter={(v, name, props) => [`${v} pts — P${props.payload.pos}`, props.payload.team]}
          />
          <Bar dataKey="pts" radius={[3, 3, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.pos === 1 ? 'var(--color-gold)' : entry.pos <= 3 ? 'var(--color-f1)' : 'var(--color-border-strong)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  )
}

function SeasonHistoryTable({ history, navigate }) {
  if (!history?.length) return null
  const rows = history
    .filter(s => s.DriverStandings?.[0])
    .map(s => {
      const ds = s.DriverStandings[0]
      return {
        year: s.season,
        team: ds.Constructors?.[0]?.name,
        teamId: ds.Constructors?.[0]?.constructorId,
        pos: parseInt(ds.position),
        pts: ds.points,
        wins: ds.wins,
      }
    })
    .sort((a, b) => b.year - a.year)

  return (
    <Panel title="Histórico de Temporadas" icon={<Calendar size={13} aria-hidden />}>
      <div className="overflow-y-auto mt-2" style={{ maxHeight: 320 }}>
        <table className="w-full text-xs">
          <thead className="sticky top-0" style={{ background: 'var(--color-surface)' }}>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              {['Ano', 'Equipe', 'Pos', 'Pontos', 'V'].map(h => (
                <th key={h} className="text-left py-1.5 px-2 section-title">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const color = getTeamColor(row.team)
              return (
                <motion.tr
                  key={row.year}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.02, 0.4) }}
                  onClick={() => row.teamId && navigate(`/team/${row.teamId}`)}
                  className="cursor-pointer transition-colors hover:bg-[var(--color-surface-2)]"
                  style={{ borderBottom: '1px solid var(--color-border-mute)' }}
                >
                  <td className="py-1.5 px-2 num font-bold text-text">{row.year}</td>
                  <td className="py-1.5 px-2 truncate max-w-[100px]" style={{ color: color + 'cc' }}>{row.team}</td>
                  <td className="py-1.5 px-2">
                    <span className="num font-black" style={{ color: row.pos === 1 ? 'var(--color-gold)' : 'var(--color-text)' }}>
                      P{row.pos}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 num font-semibold text-text">{row.pts}</td>
                  <td className="py-1.5 px-2 num font-bold" style={{ color: 'var(--color-gold)' }}>{row.wins > 0 ? row.wins : '—'}</td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

function PositionChart({ results, color, season }) {
  if (!results?.length) return null
  const data = results.map(r => ({
    race: r.raceName?.replace(' Grand Prix', '').replace(' Prix', '').slice(0, 8),
    pos: parseInt(r.Results?.[0]?.position ?? 0),
  })).filter(d => d.pos > 0)

  if (data.length < 2) return null
  const label = season && season !== 'current' ? `Temporada ${season}` : 'Temporada Atual'

  return (
    <Panel title={`Posições — ${label}`} icon={<Activity size={13} aria-hidden />}>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="race" tick={{ fill: 'var(--color-text-mute)', fontSize: 8, fontFamily: 'JetBrains Mono' }} />
          <YAxis reversed domain={[1, 20]} tick={{ fill: 'var(--color-text-mute)', fontSize: 9 }} />
          <Tooltip
            contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-strong)', borderRadius: 8 }}
            labelStyle={{ color: 'var(--color-text-dim)', fontSize: 11 }}
            itemStyle={{ color: 'var(--color-text)', fontSize: 12 }}
          />
          <Line type="monotone" dataKey="pos" stroke={color} strokeWidth={2}
            dot={{ fill: color, r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </Panel>
  )
}

function RecentResults({ results, season }) {
  if (!results?.length) return null
  const recent = [...results].reverse().slice(0, 8)
  const label = season && season !== 'current' ? `Resultados ${season}` : 'Resultados Recentes'

  return (
    <Panel title={label} icon={<Trophy size={13} aria-hidden />}>
      <div className="space-y-1 mt-2">
        {recent.map((race, i) => {
          const r = race.Results?.[0]
          if (!r) return null
          const pos = parseInt(r.position)
          const isWin = pos === 1
          const isPodium = pos <= 3
          return (
            <div key={i} className="flex items-center gap-3 py-1.5 px-2 rounded-lg transition-colors hover:bg-[var(--color-surface-2)]">
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center num text-xs font-black flex-shrink-0"
                style={{
                  background: isWin ? 'rgba(255,215,0,0.15)' : isPodium ? 'rgba(225,6,0,0.1)' : 'var(--color-surface-2)',
                  color: isWin ? 'var(--color-gold)' : isPodium ? 'var(--color-f1)' : 'var(--color-text-mute)',
                }}
              >
                {isWin ? '🏆' : pos}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-text truncate">
                  {race.raceName?.replace(' Grand Prix', ' GP')}
                </div>
                <div className="num text-[9px] text-text-mute">{formatDate(race.date)}</div>
              </div>
              <div className="text-right">
                <div className="num text-xs font-bold text-text">{r.points}pts</div>
                <div className="text-[9px] text-text-mute">
                  {r.FastestLap?.rank === '1' ? '⚡ FL' : `Grid ${r.grid}`}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

function RaceHistory({ races, navigate }) {
  if (!races?.length) return null
  const sorted = [...races].sort((a, b) => {
    const dy = parseInt(b.season) - parseInt(a.season)
    return dy !== 0 ? dy : parseInt(b.round) - parseInt(a.round)
  })

  return (
    <Panel title={`Histórico · ${races.length}`} icon={<Activity size={13} aria-hidden />}>
      <div className="overflow-y-auto mt-2" style={{ maxHeight: 480 }}>
        {sorted.map((race, i) => {
          const result      = race.Results?.[0]
          if (!result) return null
          const pos         = parseInt(result.position ?? 99)
          const status      = result.status ?? ''
          const isDNF       = status !== 'Finished' && !status.startsWith('+')
          const isWin       = pos === 1
          const isPodium    = !isDNF && pos <= 3
          const circuitCode = CIRCUIT_COUNTRY[race.Circuit?.circuitId]
          const teamColor   = getTeamColor(result.Constructor?.name)

          const posColor = isWin    ? 'var(--color-gold)'
            : isPodium              ? 'var(--color-f1)'
            : isDNF                 ? 'rgba(255,255,255,0.2)'
            :                         'var(--color-text-mute)'

          return (
            <motion.div
              key={`${race.season}-${race.round}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.006, 0.4) }}
              className="flex items-center gap-3 py-1.5 px-3 rounded-lg cursor-pointer transition-colors hover:bg-[var(--color-surface-2)]"
              style={{ borderBottom: '1px solid var(--color-border-mute)' }}
              onClick={() => navigate(`/circuit/${race.Circuit?.circuitId}`)}
            >
              <div className="num text-xs w-10 flex-shrink-0 text-text-mute">
                {race.season}
              </div>
              {circuitCode
                ? <Flag code={circuitCode} size={13} />
                : <span className="w-[18px]" />
              }
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-text truncate block">
                  {race.raceName?.replace(' Grand Prix', ' GP')}
                </span>
              </div>
              <div className="text-[10px] text-right flex-shrink-0 hidden sm:block truncate max-w-[90px]"
                style={{ color: teamColor + 'cc' }}>
                {result.Constructor?.name}
              </div>
              <div className="num font-black text-xs w-9 text-right flex-shrink-0"
                style={{ color: posColor }}>
                {isDNF ? 'DNF' : `P${pos}`}
              </div>
            </motion.div>
          )
        })}
      </div>
    </Panel>
  )
}

function PhotoLightbox({ src, name, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.94)' }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 left-4 flex items-center gap-2 text-sm transition-colors"
        style={{ color: 'rgba(255,255,255,0.6)' }}
        onMouseEnter={e => e.currentTarget.style.color = '#fff'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
      >
        <ArrowLeft size={16} /> Voltar ao perfil
      </button>
      <motion.img
        src={src}
        alt={name}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="rounded-2xl shadow-2xl"
        style={{ maxHeight: '85vh', maxWidth: '90vw', objectFit: 'contain' }}
        onClick={e => e.stopPropagation()}
      />
      {name && (
        <p className="mt-4 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{name}</p>
      )}
    </motion.div>
  )
}

export function DriverPage() {
  const { driverId } = useParams()
  const navigate = useNavigate()
  const photos = useDriverPhotos()
  const [photoOpen, setPhotoOpen] = useState(false)

  const { data: currentStanding, isLoading: standLoading } = useQuery({
    queryKey: ['driverSeason', driverId],
    queryFn: () => getDriverSeasonStats(driverId),
    enabled: !!driverId,
    retry: false,
  })

  const { data: career } = useQuery({
    queryKey: ['driverCareer', driverId],
    queryFn: () => getDriverCareerStats(driverId),
    enabled: !!driverId,
    staleTime: 3_600_000,
  })

  const { data: history, isLoading: histLoading } = useQuery({
    queryKey: ['driverHistory', driverId],
    queryFn: () => getDriverSeasonHistory(driverId),
    enabled: !!driverId,
    staleTime: 3_600_000,
  })

  const { data: driverInfo, isLoading: infoLoading } = useQuery({
    queryKey: ['driverInfo', driverId],
    queryFn: () => getDriverInfo(driverId),
    enabled: !!driverId && !standLoading && !currentStanding,
    staleTime: 86_400_000,
    retry: false,
  })

  const sortedHistory  = [...(history ?? [])].sort((a, b) => b.season - a.season)
  const recentEntry    = sortedHistory[0]
  const recentStanding = recentEntry?.DriverStandings?.[0] ?? null
  const displaySeason  = currentStanding ? 'current' : (recentEntry?.season ?? null)
  const isActive       = !!currentStanding

  // Championship seasons (position === '1' in any season standing)
  const championships = sortedHistory
    .filter(s => parseInt(s.DriverStandings?.[0]?.position) === 1)
    .map(s => s.season)
    .sort((a, b) => parseInt(b) - parseInt(a))
  const champCount = championships.length

  const { data: results, isLoading: resLoading } = useQuery({
    queryKey: ['driverResults', driverId, displaySeason],
    queryFn: () => getDriverResults(driverId, displaySeason),
    enabled: !!driverId && !!displaySeason,
    staleTime: 300_000,
  })

  // Full race history — all drivers, all results (position + correct team per race)
  const { data: allRaces } = useQuery({
    queryKey: ['driverAllResults', driverId],
    queryFn: () => getDriverAllResults(driverId),
    enabled: !!driverId && !standLoading,
    staleTime: 86_400_000,
  })

  const standing    = currentStanding ?? recentStanding
  const driver      = standing?.Driver ?? driverInfo
  const constructor = standing?.Constructors?.[0]
  const color       = getTeamColor(constructor?.name)
  const natCode     = DRIVER_NAT_CODE[driver?.nationality]
  const openf1Photo = driver?.code ? photos[driver.code] : null

  const { data: wikiData } = useQuery({
    queryKey: ['wikiDriver', driverId],
    queryFn: () => getWikipediaDriverData(driver?.url),
    enabled: !openf1Photo && !!driver?.url,
    staleTime: 86_400_000,
  })

  // Wikipedia infobox stats — fallback for wins/poles/championships when API is incomplete
  const { data: wikiStats } = useQuery({
    queryKey: ['wikiDriverStats', driverId],
    queryFn: () => getWikipediaDriverStats(driver?.url),
    enabled: !!driver?.url && !standLoading,
    staleTime: 86_400_000,
  })

  const photo       = openf1Photo ?? wikiData?.photo ?? null
  const photoHD     = openf1Photo ?? wikiData?.photoOriginal ?? wikiData?.photo ?? null
  const wikiExtract = wikiData?.extract ?? null

  // Use API value when present (0 is valid for debut drivers); fall back to Wikipedia only when null
  const careerWins   = career?.wins  != null ? career.wins  : null
  const careerPoles  = career?.poles != null ? career.poles : null
  const displayWins  = careerWins  ?? wikiStats?.wins  ?? null
  const displayPoles = careerPoles ?? wikiStats?.poles ?? null

  // Championship count and years: API history first, Wikipedia infobox as fallback
  const displayChampCount = champCount > 0
    ? champCount
    : (wikiStats?.championships ?? 0)
  const displayChampYears = championships.length > 0
    ? championships
    : (wikiStats?.championshipYears ?? [])

  const pageLoading = standLoading || (!currentStanding && (histLoading || infoLoading))

  if (pageLoading) {
    return (
      <PageShell>
        <Skeleton height={180} rounded={16} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={90} rounded={12} />)}
        </div>
      </PageShell>
    )
  }

  if (!driver) {
    return (
      <PageShell>
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-text-mute hover:text-text text-sm">
          <ArrowLeft size={16} aria-hidden /> Voltar
        </button>
        <div className="text-center text-text-mute py-20">Piloto não encontrado</div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <AnimatePresence>
        {photoOpen && photoHD && (
          <PhotoLightbox
            src={photoHD}
            name={`${driver.givenName} ${driver.familyName}`}
            onClose={() => setPhotoOpen(false)}
          />
        )}
      </AnimatePresence>

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
        className="relative rounded-2xl overflow-hidden p-6"
        style={{
          background: `linear-gradient(135deg, var(--color-surface) 0%, ${color}10 100%)`,
          border: `1px solid ${color}28`,
        }}
      >
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ background: `radial-gradient(ellipse at top right, ${color}, transparent 60%)` }} />

        <div className="relative flex items-center gap-5">
          {/* Left: info */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Number badge — only when driver has a permanent number */}
            {driver.permanentNumber && (
              <div
                className="flex-shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center num text-3xl font-bold"
                style={{ background: color + '20', border: `2px solid ${color}50`, color }}
              >
                {driver.permanentNumber}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Flag code={natCode} size={18} />
                <span className="text-[10px] text-text-mute uppercase tracking-wider">{driver.nationality}</span>
                {driver.dateOfBirth && (
                  <span className="text-[10px] text-text-mute">
                    · {new Date(driver.dateOfBirth).toLocaleDateString('pt-BR', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>

              <h1 className="font-display font-bold text-3xl text-text uppercase leading-tight">
                {driver.givenName} <span style={{ color }}>{driver.familyName}</span>
              </h1>

              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {constructor?.name && (
                  <span className="text-sm" style={{ color: color + 'cc' }}>{constructor.name}</span>
                )}
                {career?.seasons?.length > 0 && (
                  <span className="num text-xs text-text-mute">{career.seasons.length} temporadas</span>
                )}
                {driver.url && (
                  <a href={driver.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-text-mute hover:text-text transition-colors">
                    <ExternalLink size={10} aria-hidden /> Wikipedia
                  </a>
                )}
              </div>

              {/* Championship badge */}
              {displayChampCount > 0 && (
                <div className="mt-3">
                  <div className="flex items-center gap-1.5">
                    <Star size={14} fill="var(--color-gold)" style={{ color: 'var(--color-gold)' }} aria-hidden />
                    <span className="font-display font-bold text-base leading-none" style={{ color: 'var(--color-gold)' }}>
                      {displayChampCount}× Campeão Mundial
                    </span>
                  </div>
                  {displayChampYears.length > 0 && (
                    <div className="num text-[10px] mt-1" style={{ color: 'var(--color-text-mute)', opacity: 0.7 }}>
                      {displayChampYears.join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: photo (full, clickable) */}
          {photo && (
            <button
              onClick={() => setPhotoOpen(true)}
              className="flex-shrink-0 relative group rounded-xl overflow-hidden"
              style={{ width: 110, height: 144 }}
              aria-label="Ver foto em tamanho completo"
            >
              <img
                src={photo}
                alt=""
                aria-hidden
                className="w-full h-full object-contain"
                style={{ background: 'transparent' }}
                onError={e => { e.target.parentElement.style.display = 'none' }}
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
                style={{ background: 'rgba(0,0,0,0.45)' }}>
                <ZoomIn size={22} className="text-white" />
              </div>
            </button>
          )}

          {/* Season position (active only) */}
          {isActive && standing && (
            <div className="text-right hidden sm:block flex-shrink-0">
              <div className="font-display font-bold text-5xl uppercase" style={{ color }}>
                P{standing.position}
              </div>
              <div className="text-[9px] text-text-mute mt-1 uppercase tracking-wide">Campeonato</div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Stats */}
      {isActive ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Pontos atual"      value={standing?.points} icon={<Star size={13} />}     color="var(--color-gold)" />
          <Stat label="Vitórias atual"    value={standing?.wins}   icon={<Trophy size={13} />}   color={color} />
          <Stat label="Vitórias carreira" value={displayWins}      icon={<Trophy size={13} />}   color="var(--color-f1)" />
          <Stat label="Poles carreira"    value={displayPoles}     icon={<FlagIcon size={13} />} color="#a78bfa" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Stat label="Vitórias carreira" value={displayWins}              icon={<Trophy size={13} />}   color="var(--color-gold)" />
          <Stat label="Poles carreira"    value={displayPoles}             icon={<FlagIcon size={13} />} color="#a78bfa" />
          <Stat label="Temporadas"        value={career?.seasons?.length}  icon={<Calendar size={13} />} color="var(--color-f1)" />
        </div>
      )}

      {/* Main content */}
      {isActive ? (
        // Active driver: current season charts + win history
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="space-y-4">
              {history && <SeasonChart history={history} />}
              {!resLoading && <PositionChart results={results} color={color} season={displaySeason} />}
            </div>
            <div className="space-y-4">
              {history && <SeasonHistoryTable history={history} navigate={navigate} />}
              {!resLoading && <RecentResults results={results} season={displaySeason} />}
            </div>
          </div>
          {allRaces?.length > 0 && <RaceHistory races={allRaces} navigate={navigate} />}
        </>
      ) : (
        // Retired driver: full race history + season history side by side, then chart
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <RaceHistory races={allRaces} navigate={navigate} />
            <SeasonHistoryTable history={history} navigate={navigate} />
          </div>
          {history && history.length >= 2 && <SeasonChart history={history} />}
        </>
      )}

      {/* Wikipedia bio */}
      {wikiExtract && (
        <Panel title="Biografia" icon={<BookOpen size={13} aria-hidden />}>
          <div className="mt-2 space-y-2">
            {wikiExtract.split('\n').filter(Boolean).map((para, i) => (
              <p key={i} className="text-xs text-text-dim leading-relaxed">{para}</p>
            ))}
            {driver?.url && (
              <a
                href={driver.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] mt-2 hover:underline"
                style={{ color }}
              >
                <ExternalLink size={10} aria-hidden /> Leia mais na Wikipedia
              </a>
            )}
          </div>
        </Panel>
      )}
    </PageShell>
  )
}
