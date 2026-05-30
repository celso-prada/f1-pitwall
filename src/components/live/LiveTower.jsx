import { motion, AnimatePresence } from 'framer-motion'
import { getTeamColor } from '../../utils/teamColors'
import { formatGap, formatInterval } from '../../utils/format'
import { Skeleton } from '../ui/Skeleton'

function PositionBadge({ pos }) {
  const isTop3 = pos <= 3
  const podiumColor = pos === 1 ? 'var(--color-gold)' : pos === 2 ? 'var(--color-silver)' : 'var(--color-bronze)'
  return (
    <div
      className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 num text-xs font-black"
      style={{
        background: isTop3 ? podiumColor + '22' : 'var(--color-surface-2)',
        color:      isTop3 ? podiumColor : 'var(--color-text-mute)',
        border:     `1px solid ${isTop3 ? podiumColor + '44' : 'var(--color-border)'}`,
      }}
    >
      {pos}
    </div>
  )
}

function DriverRow({ driver, intervals, position, onSelect, isSelected }) {
  const color = getTeamColor(driver.team_name, driver.team_colour)
  const interval = intervals?.[driver.driver_number]
  const isLeader = position === 1

  return (
    <motion.div
      layout
      layoutId={`driver-${driver.driver_number}`}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onClick={() => onSelect(driver)}
      className="relative flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors duration-150 group"
      style={{
        background: isSelected ? `${color}18` : 'transparent',
        border: `1px solid ${isSelected ? color + '45' : 'transparent'}`,
      }}
      whileHover={{ backgroundColor: `${color}10` }}
      role="button"
      tabIndex={0}
      aria-label={`${driver.full_name}, posição ${position}`}
      onKeyDown={e => e.key === 'Enter' && onSelect(driver)}
    >
      {/* Team stripe */}
      <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full" style={{ background: color, opacity: 0.7 }} />

      <PositionBadge pos={position} />

      {/* Driver photo */}
      {driver.headshot_url ? (
        <img
          src={driver.headshot_url}
          alt=""
          aria-hidden
          className="w-7 h-7 rounded-full object-cover flex-shrink-0 grayscale group-hover:grayscale-0 transition-all"
          style={{ border: `1px solid ${color}40` }}
          onError={e => { e.target.style.display = 'none' }}
        />
      ) : (
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 num"
          style={{ background: color + '22', color, border: `1px solid ${color}40` }}>
          {driver.name_acronym?.slice(0, 2)}
        </div>
      )}

      {/* Name + team */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-text tracking-wide">{driver.name_acronym}</span>
          <span className="num text-[9px] text-text-mute">#{driver.driver_number}</span>
        </div>
        <div className="text-[9px] truncate" style={{ color: color + 'bb' }}>{driver.team_name}</div>
      </div>

      {/* Gap / Interval */}
      <div className="text-right flex-shrink-0">
        <div className="num text-xs font-bold" style={{ color: isLeader ? 'var(--color-gold)' : 'var(--color-text)' }}>
          {isLeader ? 'LÍDER' : formatGap(interval?.gap_to_leader)}
        </div>
        {position > 1 && (
          <div className="num text-[9px] text-text-mute">
            {formatInterval(interval?.interval)}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export function LiveTower({ positions, drivers, intervals, loading, onSelectDriver, selectedDriver }) {
  if (loading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2">
            <Skeleton height={28} width={28} rounded={6} />
            <Skeleton height={28} width={28} rounded={28} />
            <div className="flex-1 space-y-1">
              <Skeleton height={13} width="50%" />
              <Skeleton height={9} width="70%" />
            </div>
            <Skeleton height={13} width={56} />
          </div>
        ))}
      </div>
    )
  }

  if (!positions?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-mute">
        <div className="text-4xl mb-3" aria-hidden>🏁</div>
        <div className="text-sm font-semibold">Nenhuma sessão ao vivo</div>
        <div className="text-xs mt-1 text-text-mute">Os dados aparecerão quando uma sessão começar</div>
      </div>
    )
  }

  const driversMap = Object.fromEntries((drivers ?? []).map(d => [d.driver_number, d]))

  return (
    <div className="space-y-0.5" role="list" aria-label="Torre de posições ao vivo">
      <AnimatePresence>
        {positions.map((pos, i) => {
          const driver = driversMap[pos.driver_number]
          if (!driver) return null
          return (
            <DriverRow
              key={pos.driver_number}
              driver={driver}
              intervals={intervals}
              position={pos.position ?? i + 1}
              onSelect={onSelectDriver}
              isSelected={selectedDriver?.driver_number === pos.driver_number}
            />
          )
        })}
      </AnimatePresence>
    </div>
  )
}
