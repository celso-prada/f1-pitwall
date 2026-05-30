import { motion } from 'framer-motion'
import { getTeamColor } from '../../utils/teamColors'
import { formatPitDuration } from '../../utils/format'

function PitBar({ stop, driver, maxDuration, index }) {
  const color    = getTeamColor(driver?.team_name, driver?.team_colour)
  const width    = Math.min((stop.pit_duration / maxDuration) * 100, 100)
  const barColor = stop.pit_duration < 25 ? '#00d632'
    : stop.pit_duration < 30 ? 'var(--color-gold)'
    : 'var(--color-f1)'

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-center gap-2"
    >
      <div className="w-8 text-right num text-xs font-bold flex-shrink-0" style={{ color }}>
        {driver?.name_acronym ?? `#${stop.driver_number}`}
      </div>
      <div className="flex-1 rounded-full h-2 overflow-hidden" style={{ background: 'var(--color-surface-3)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: barColor }}
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.6, delay: index * 0.03 + 0.2 }}
        />
      </div>
      <div className="w-12 num text-xs text-text-dim flex-shrink-0">
        {formatPitDuration(stop.pit_duration)}
      </div>
      <div className="w-8 num text-xs text-text-mute flex-shrink-0">V{stop.lap_number}</div>
    </motion.div>
  )
}

export function PitStopTracker({ pits, drivers }) {
  if (!pits?.length) {
    return (
      <div className="text-center text-text-mute py-6 text-sm">
        Nenhuma parada registrada
      </div>
    )
  }

  const driversMap = Object.fromEntries((drivers ?? []).map(d => [d.driver_number, d]))
  const validPits  = pits.filter(p => p.pit_duration > 0)
  const sorted     = [...validPits].sort((a, b) => b.lap_number - a.lap_number).slice(0, 12)
  const maxDuration = Math.max(...sorted.map(p => p.pit_duration), 1)

  return (
    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
      {sorted.map((stop, i) => (
        <PitBar
          key={`${stop.driver_number}-${stop.lap_number}`}
          stop={stop}
          driver={driversMap[stop.driver_number]}
          maxDuration={maxDuration}
          index={i}
        />
      ))}
    </div>
  )
}
