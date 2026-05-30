import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { getConstructorStandings } from '../../api/jolpica'
import { getTeamColor } from '../../utils/teamColors'
import { CONSTRUCTOR_NAT_CODE } from '../../utils/flags'
import { Flag } from '../ui/Flag'
import { Skeleton } from '../ui/Skeleton'
import { useNavigate } from 'react-router-dom'

export function ConstructorStandings({ season = 'current' }) {
  const navigate = useNavigate()
  const { data: standings, isLoading } = useQuery({
    queryKey: ['constructorStandings', season],
    queryFn: () => getConstructorStandings(season),
    staleTime: 300_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={64} rounded={12} />)}
      </div>
    )
  }

  const maxPoints = parseFloat(standings?.[0]?.points ?? 1)

  return (
    <div className="space-y-2">
      {(standings ?? []).map((s, i) => {
        const color = getTeamColor(s.Constructor.name)
        const pct = (parseFloat(s.points) / maxPoints) * 100
        const natCode = CONSTRUCTOR_NAT_CODE[s.Constructor.nationality]

        return (
          <motion.div
            key={s.Constructor.constructorId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => navigate(`/team/${s.Constructor.constructorId}`)}
            className="card card-hover p-3 relative overflow-hidden"
          >
            <div className="team-stripe" style={{ background: color }} />
            <div className="flex items-center gap-3 mb-2">
              <span className="num text-text-mute text-sm font-bold w-5 text-center">{s.position}</span>
              <Flag code={natCode} size={13} />
              <span className="flex-1 font-bold text-sm text-text">{s.Constructor.name}</span>
              <span className="num font-black text-text">{s.points}</span>
              <span className="text-[9px] text-text-mute">PTS</span>
            </div>
            {/* Points bar */}
            <div className="ml-8 rounded-full h-1 overflow-hidden" style={{ background: 'var(--color-surface-3)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: color }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, delay: i * 0.05 + 0.3 }}
              />
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
