import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { getDriverStandings } from '../../api/jolpica'
import { getTeamColor } from '../../utils/teamColors'
import { DRIVER_NAT_CODE } from '../../utils/flags'
import { Flag } from '../ui/Flag'
import { Skeleton } from '../ui/Skeleton'
import { useNavigate } from 'react-router-dom'

function StandingRow({ standing, index }) {
  const navigate = useNavigate()
  const pos = parseInt(standing.position)
  const points = parseFloat(standing.points)
  const color = getTeamColor(standing.Constructors?.[0]?.name)
  const natCode = DRIVER_NAT_CODE[standing.Driver.nationality]
  const isLeader = pos === 1

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={() => navigate(`/driver/${standing.Driver.driverId}`)}
      className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl card-hover group overflow-hidden"
      style={{
        background: isLeader ? `${color}08` : 'var(--color-surface)',
        border: `1px solid ${isLeader ? color + '25' : 'var(--color-border)'}`,
      }}
    >
      <div className="team-stripe" style={{ background: color }} />

      {/* Position */}
      <div className="w-6 text-center flex-shrink-0">
        <span
          className="num text-sm font-black"
          style={{ color: pos <= 3 ? 'var(--color-gold)' : 'var(--color-text-mute)' }}
        >
          {pos}
        </span>
      </div>

      {/* Flag + Name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Flag code={natCode} size={13} />
          <span className="text-sm font-semibold text-text">
            {standing.Driver.givenName}{' '}
            <span className="font-black">{standing.Driver.familyName}</span>
          </span>
        </div>
        <div className="text-[10px] mt-0.5 truncate" style={{ color: color + 'cc' }}>
          {standing.Constructors?.[0]?.name}
        </div>
      </div>

      {/* Wins */}
      {parseInt(standing.wins) > 0 && (
        <div className="num text-xs font-bold" style={{ color: 'var(--color-gold)' }}>
          {standing.wins}W
        </div>
      )}

      {/* Points */}
      <div className="text-right min-w-[52px] flex-shrink-0">
        <div className="num text-sm font-black text-text">{points}</div>
        <div className="text-[9px] text-text-mute">PTS</div>
      </div>
    </motion.div>
  )
}

export function DriverStandings({ season = 'current' }) {
  const { data: standings, isLoading } = useQuery({
    queryKey: ['driverStandings', season],
    queryFn: () => getDriverStandings(season),
    staleTime: 300_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} height={54} rounded={12} />)}
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {(standings ?? []).map((s, i) => (
        <StandingRow key={s.Driver.driverId} standing={s} index={i} />
      ))}
    </div>
  )
}
