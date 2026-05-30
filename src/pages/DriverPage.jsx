import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  getDriverSeasonStats, getDriverResults, getDriverCareerStats, getDriverSeasonHistory
} from '../api/jolpica'
import { getTeamColor } from '../utils/teamColors'
import { DRIVER_NAT_CODE } from '../utils/flags'
import { useDriverPhotos } from '../hooks/useDriverPhotos'
import { formatDate } from '../utils/format'
import { Skeleton } from '../components/ui/Skeleton'
import { Flag } from '../components/ui/Flag'
import { PageShell } from '../components/ui/PageShell'
import { Panel } from '../components/ui/Panel'
import { Stat } from '../components/ui/Stat'
import { ArrowLeft, Trophy, Star, Flag as FlagIcon, Activity, Calendar } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell
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
    .slice(0, 12)

  return (
    <Panel title="Histórico de Temporadas" icon={<Calendar size={13} aria-hidden />}>
      <div className="overflow-x-auto mt-2">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              {['Ano', 'Equipe', 'Posição', 'Pontos', 'Vitórias'].map(h => (
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
                  transition={{ delay: i * 0.03 }}
                  onClick={() => row.teamId && navigate(`/team/${row.teamId}`)}
                  className="cursor-pointer transition-colors hover:bg-[var(--color-surface-2)]"
                  style={{ borderBottom: '1px solid var(--color-border-mute)' }}
                >
                  <td className="py-1.5 px-2 num font-bold text-text">{row.year}</td>
                  <td className="py-1.5 px-2" style={{ color: color + 'cc' }}>{row.team}</td>
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

function PositionChart({ results, color }) {
  if (!results?.length) return null
  const data = results.map(r => ({
    race: r.raceName?.replace(' Grand Prix', '').replace(' Prix', '').slice(0, 8),
    pos: parseInt(r.Results?.[0]?.position ?? 0),
  })).filter(d => d.pos > 0)

  if (data.length < 2) return null

  return (
    <Panel title="Posições na Temporada Atual" icon={<Activity size={13} aria-hidden />}>
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

function RecentResults({ results }) {
  if (!results?.length) return null
  const recent = [...results].reverse().slice(0, 8)

  return (
    <Panel title="Resultados Recentes" icon={<Trophy size={13} aria-hidden />}>
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

export function DriverPage() {
  const { driverId } = useParams()
  const navigate = useNavigate()

  const { data: standing, isLoading: standLoading } = useQuery({
    queryKey: ['driverSeason', driverId],
    queryFn: () => getDriverSeasonStats(driverId),
    enabled: !!driverId,
  })
  const { data: results, isLoading: resLoading } = useQuery({
    queryKey: ['driverResults', driverId],
    queryFn: () => getDriverResults(driverId),
    enabled: !!driverId,
  })
  const { data: career } = useQuery({
    queryKey: ['driverCareer', driverId],
    queryFn: () => getDriverCareerStats(driverId),
    enabled: !!driverId,
  })
  const { data: history } = useQuery({
    queryKey: ['driverHistory', driverId],
    queryFn: () => getDriverSeasonHistory(driverId),
    enabled: !!driverId,
    staleTime: 3_600_000,
  })

  const photos      = useDriverPhotos()
  const driver      = standing?.Driver
  const constructor = standing?.Constructors?.[0]
  const color       = getTeamColor(constructor?.name)
  const natCode     = DRIVER_NAT_CODE[driver?.nationality]
  const photo       = driver?.code ? photos[driver.code] : null

  if (standLoading) {
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
        <div className="text-center text-text-mute py-20">Piloto não encontrado</div>
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

      {/* Hero card */}
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

        {/* Driver photo — fades out to the left */}
        {photo && (
          <div className="absolute right-0 top-0 bottom-0 w-56 overflow-hidden">
            <img
              src={photo}
              alt=""
              aria-hidden
              className="w-full h-full object-cover object-top"
              style={{ maskImage: 'linear-gradient(to left, rgba(0,0,0,0.55) 40%, transparent)', WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,0.55) 40%, transparent)' }}
              onError={e => { e.target.style.display = 'none' }}
            />
          </div>
        )}

        <div className="relative flex items-center gap-6">
          {/* Number badge */}
          <div
            className="flex-shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center num text-3xl font-bold overflow-hidden"
            style={{ background: color + '20', border: `2px solid ${color}50`, color }}
          >
            {driver.permanentNumber ?? '?'}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Flag code={natCode} size={18} />
              <span className="text-[10px] text-text-mute uppercase tracking-wider">{driver.nationality}</span>
            </div>
            <h1 className="font-display font-bold text-3xl text-text uppercase leading-tight">
              {driver.givenName} <span style={{ color }}>{driver.familyName}</span>
            </h1>
            <div className="text-sm mt-1.5" style={{ color: color + 'cc' }}>{constructor?.name}</div>
            <div className="flex items-center gap-3 mt-2">
              <span className="num text-xs text-text-mute">#{driver.permanentNumber}</span>
              {career?.seasons?.length > 0 && (
                <span className="num text-xs text-text-mute">{career.seasons.length} temporadas</span>
              )}
            </div>
          </div>

          <div className="text-right hidden sm:block">
            <div className="font-display font-bold text-5xl uppercase" style={{ color }}>
              P{standing?.position}
            </div>
            <div className="text-[9px] text-text-mute mt-1 uppercase tracking-wide">Campeonato</div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Pontos" value={standing?.points} icon={<Star size={13} />} color="var(--color-gold)" />
        <Stat label="Vitórias temporada" value={standing?.wins} icon={<Trophy size={13} />} color={color} />
        <Stat label="Vitórias carreira" value={career?.wins} icon={<Trophy size={13} />} color="var(--color-f1)" />
        <Stat label="Poles carreira" value={career?.poles} icon={<FlagIcon size={13} />} color="#a78bfa" />
      </div>

      {/* Charts + history in 2 cols on large screens */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="space-y-4">
          {history && <SeasonChart history={history} />}
          {!resLoading && <PositionChart results={results} color={color} />}
        </div>
        <div className="space-y-4">
          {history && <SeasonHistoryTable history={history} navigate={navigate} />}
          {!resLoading && <RecentResults results={results} />}
        </div>
      </div>
    </PageShell>
  )
}
