import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { getCalendar } from '../../api/jolpica'
import { formatDate } from '../../utils/format'
import { CIRCUIT_COUNTRY } from '../../utils/flags'
import { Flag } from '../ui/Flag'
import { useNavigate } from 'react-router-dom'
import { MapPin, Clock, ChevronRight } from 'lucide-react'
import { Skeleton } from '../ui/Skeleton'

export function RaceCalendar({ season = 'current', compact = false }) {
  const navigate = useNavigate()
  const { data: races, isLoading } = useQuery({
    queryKey: ['calendar', season],
    queryFn: () => getCalendar(season),
    staleTime: 3_600_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={72} rounded={12} />)}
      </div>
    )
  }

  const now = new Date()
  const list = compact
    ? (races ?? []).filter(r => new Date(r.date) >= now).slice(0, 6)
    : races ?? []

  return (
    <div className={compact ? 'space-y-1.5' : 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5'}>
      {list.map((race, i) => {
        const raceDate = new Date(race.date)
        const isPast = raceDate < now
        const isNext = !compact
          ? (!isPast && (races ?? []).slice(0, parseInt(race.round) - 1).every(r => new Date(r.date) < now))
          : (!isPast && list.slice(0, i).every(r => new Date(r.date) < now))
        const countryCode = CIRCUIT_COUNTRY[race.Circuit.circuitId] ?? null

        const handleClick = () => {
          if (isPast) navigate(`/race/${race.season ?? season}/${race.round}`)
          else navigate(`/circuit/${race.Circuit.circuitId}`)
        }

        return (
          <motion.div
            key={race.round}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.4) }}
            onClick={handleClick}
            className="card card-hover relative group overflow-hidden"
            style={{
              opacity: isPast && !compact ? 0.55 : isPast ? 0.6 : 1,
              border: isNext ? '1px solid rgba(225,6,0,0.35)' : '1px solid var(--color-border)',
              background: isNext ? 'rgba(225,6,0,0.05)' : 'var(--color-surface)',
            }}
          >
            {/* Top accent for next race */}
            {isNext && (
              <div className="absolute top-0 left-0 right-0 h-0.5"
                style={{ background: 'linear-gradient(90deg, transparent, var(--color-f1), transparent)' }} />
            )}

            <div className="p-3 flex items-center gap-3">
              {/* Flag */}
              <div className="flex-shrink-0 w-8 flex items-center justify-center">
                {countryCode
                  ? <Flag code={countryCode} size={22} />
                  : <span className="text-text-mute text-xs font-bold">{race.round}</span>
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-text-mute text-[9px] font-bold num">R{race.round}</span>
                  {isNext && (
                    <span className="text-[8px] font-black tracking-widest px-1 py-0.5 rounded"
                      style={{ background: 'rgba(225,6,0,0.2)', color: 'var(--color-f1)' }}>
                      PRÓXIMA
                    </span>
                  )}
                  {isPast && (
                    <span className="text-[8px] text-text-mute opacity-0 group-hover:opacity-100 transition-opacity">
                      ver resultado →
                    </span>
                  )}
                </div>
                <div className="text-sm font-bold text-text truncate">
                  {race.raceName.replace(' Grand Prix', ' GP')}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <div className="flex items-center gap-1 text-[9px] text-text-mute">
                    <MapPin size={9} aria-hidden />
                    {race.Circuit.Location.locality}
                  </div>
                  <div className="flex items-center gap-1 text-[9px] text-text-mute">
                    <Clock size={9} aria-hidden />
                    {formatDate(race.date)}
                  </div>
                </div>
              </div>

              <ChevronRight size={12} className="flex-shrink-0 text-text-mute group-hover:text-text transition-colors" aria-hidden />
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
