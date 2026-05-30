import { motion } from 'framer-motion'
import { getTeamColor } from '../../utils/teamColors'
import { Skeleton } from '../ui/Skeleton'

const COMPOUND_COLORS = {
  SOFT: '#e10600',
  MEDIUM: '#ffd700',
  HARD: '#e8e8e8',
  INTERMEDIATE: '#00d632',
  WET: '#0066ff',
  HYPERSOFT: '#ff69b4',
  SUPERSOFT: '#ff4444',
  ULTRASOFT: '#9400d3',
  SUPERHARD: '#ff8c00',
}

const COMPOUND_LABEL = {
  SOFT: 'S',
  MEDIUM: 'M',
  HARD: 'H',
  INTERMEDIATE: 'I',
  WET: 'W',
}

function CompoundBadge({ compound, laps }) {
  const color = COMPOUND_COLORS[compound?.toUpperCase()] ?? '#666'
  const label = COMPOUND_LABEL[compound?.toUpperCase()] ?? compound?.[0] ?? '?'

  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0"
        style={{ background: color, color: compound === 'HARD' ? '#0a0a0a' : 'white', border: '1px solid rgba(255,255,255,0.2)' }}
        title={compound}
      >
        {label}
      </div>
      {laps !== undefined && (
        <span className="text-[10px] text-neutral-500 tabular-nums">{laps}v</span>
      )}
    </div>
  )
}

export function StintTracker({ stints, positions, drivers, loading }) {
  if (loading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 py-1">
            <Skeleton height={12} width={24} />
            <Skeleton height={20} width={20} rounded={10} />
            <Skeleton height={10} width={40} />
          </div>
        ))}
      </div>
    )
  }

  if (!positions?.length || !stints) {
    return (
      <div className="text-center text-neutral-600 py-6 text-sm">
        Dados de pneus indisponíveis
      </div>
    )
  }

  const driversMap = Object.fromEntries((drivers ?? []).map(d => [d.driver_number, d]))

  return (
    <div className="space-y-0.5">
      {positions.slice(0, 15).map((pos, i) => {
        const driver = driversMap[pos.driver_number]
        const stint = stints?.[pos.driver_number]
        if (!driver) return null

        const color = getTeamColor(driver.team_name, driver.team_colour)
        return (
          <motion.div
            key={pos.driver_number}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
            style={{ background: 'transparent' }}
          >
            <span className="text-neutral-600 text-xs font-bold w-4 text-right flex-shrink-0">
              {pos.position ?? i + 1}
            </span>
            <span className="text-xs font-bold w-8 flex-shrink-0" style={{ color }}>
              {driver.name_acronym}
            </span>
            {stint ? (
              <CompoundBadge
                compound={stint.compound}
                laps={stint.lap_end ? stint.lap_end - stint.lap_start : undefined}
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-neutral-800 flex-shrink-0" />
            )}
            {stint?.stint_number > 1 && (
              <span className="text-[9px] text-neutral-600">S{stint.stint_number}</span>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
