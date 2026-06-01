import { motion, AnimatePresence } from 'framer-motion'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { getTeamColor } from '../../utils/teamColors'
import { formatGap, formatInterval } from '../../utils/format'
import { tyreOf, lapTone, LAP_TONE_COLOR, fmtLap } from '../../utils/live'
import { Skeleton } from '../ui/Skeleton'

function PositionBadge({ pos }) {
  const isTop3 = pos <= 3
  const podiumColor = pos === 1 ? 'var(--color-gold)' : pos === 2 ? 'var(--color-silver)' : 'var(--color-bronze)'
  return (
    <div
      className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 num text-xs font-black"
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

function PositionDelta({ delta }) {
  if (!delta) return <span className="w-3 flex-shrink-0" aria-hidden />
  const up = delta > 0
  const Icon = up ? ChevronUp : ChevronDown
  const color = up ? '#22c55e' : '#ef4444'
  return (
    <span className="flex items-center num text-[9px] font-bold w-3 flex-shrink-0" style={{ color }}
      title={`${up ? 'Ganhou' : 'Perdeu'} ${Math.abs(delta)} ${Math.abs(delta) === 1 ? 'posição' : 'posições'}`}>
      <Icon size={10} aria-hidden />
    </span>
  )
}

function Tyre({ stint }) {
  if (!stint) return <span className="w-9 flex-shrink-0" aria-hidden />
  const t = tyreOf(stint.compound)
  const age = stint.lap_end && stint.lap_start ? stint.lap_end - stint.lap_start : null
  return (
    <span className="flex items-center gap-1 flex-shrink-0 w-9" title={`${t.name}${age != null ? ` · ${age} voltas` : ''}`}>
      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black"
        style={{ background: t.color, color: t.dark ? '#0a0a0a' : '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>
        {t.label}
      </span>
      {age != null && <span className="num text-[9px] text-text-mute">{age}</span>}
    </span>
  )
}

function DriverRow({ driver, position, delta, interval, stint, lap, lapInfo, onSelect, isSelected }) {
  const color = getTeamColor(driver.team_name, driver.team_colour)
  const isLeader = position === 1
  const inPit = lap?.is_pit_out_lap
  const tone = lapTone(lap?.lap_duration, driver.driver_number, lapInfo)

  return (
    <motion.div
      layout
      layoutId={`driver-${driver.driver_number}`}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onClick={() => onSelect(driver)}
      className="relative flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors duration-150 group"
      style={{
        background: isSelected ? `${color}18` : 'transparent',
        border: `1px solid ${isSelected ? color + '45' : 'transparent'}`,
      }}
      whileHover={{ backgroundColor: `${color}10` }}
      role="listitem"
      tabIndex={0}
      aria-label={`${driver.full_name}, posição ${position}`}
      onKeyDown={e => e.key === 'Enter' && onSelect(driver)}
    >
      <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full" style={{ background: color, opacity: 0.7 }} />

      <PositionBadge pos={position} />
      <PositionDelta delta={delta} />

      {/* Photo */}
      {driver.headshot_url ? (
        <img src={driver.headshot_url} alt="" aria-hidden
          className="w-6 h-6 rounded-full object-cover flex-shrink-0 grayscale group-hover:grayscale-0 transition-all"
          style={{ border: `1px solid ${color}40` }}
          onError={e => { e.target.style.display = 'none' }} />
      ) : (
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 num"
          style={{ background: color + '22', color, border: `1px solid ${color}40` }}>
          {driver.name_acronym?.slice(0, 2)}
        </div>
      )}

      {/* Name + team */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-text tracking-wide">{driver.name_acronym}</span>
          {inPit && (
            <span className="text-[8px] font-black uppercase px-1 rounded"
              style={{ background: '#3b82f622', color: '#60a5fa', border: '1px solid #3b82f655' }}>Box</span>
          )}
        </div>
        <div className="text-[8px] truncate" style={{ color: color + 'bb' }}>{driver.team_name}</div>
      </div>

      <Tyre stint={stint} />

      {/* Last lap (coloured by tone) */}
      <div className="num text-[10px] font-semibold text-right w-14 flex-shrink-0 hidden sm:block"
        style={{ color: LAP_TONE_COLOR[tone] }} title="Última volta">
        {fmtLap(lap?.lap_duration)}
      </div>

      {/* Gap to leader + interval to car ahead */}
      <div className="text-right flex-shrink-0 w-16">
        <div className="num text-xs font-bold" style={{ color: isLeader ? 'var(--color-gold)' : 'var(--color-text)' }}>
          {isLeader ? 'LÍDER' : formatGap(interval?.gap_to_leader)}
        </div>
        {position > 1 && (
          <div className="num text-[9px] text-text-mute">{formatInterval(interval?.interval)}</div>
        )}
      </div>
    </motion.div>
  )
}

export function LiveTower({ positions, drivers, intervals, stints, lapInfo, loading, onSelectDriver, selectedDriver }) {
  if (loading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5">
            <Skeleton height={24} width={24} rounded={6} />
            <Skeleton height={24} width={24} rounded={24} />
            <div className="flex-1 space-y-1">
              <Skeleton height={11} width="45%" />
              <Skeleton height={8} width="65%" />
            </div>
            <Skeleton height={12} width={50} />
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
        <div className="text-xs mt-1 text-text-mute">A torre é preenchida quando uma sessão começa</div>
      </div>
    )
  }

  const driversMap = Object.fromEntries((drivers ?? []).map(d => [d.driver_number, d]))
  const info = lapInfo ?? { byDriver: {}, sessionBest: null, personalBest: {} }

  return (
    <div>
      {/* column header — broadcast style */}
      <div className="flex items-center gap-2 px-2 pb-1.5 mb-1 text-[8px] uppercase tracking-widest text-text-mute font-bold"
        style={{ borderBottom: '1px solid var(--color-border)' }}>
        <span className="w-6 text-center">Pos</span>
        <span className="w-3" />
        <span className="w-6" />
        <span className="flex-1">Piloto</span>
        <span className="w-9">Pneu</span>
        <span className="w-14 text-right hidden sm:block">Volta</span>
        <span className="w-16 text-right">Gap / Int</span>
      </div>

      <div className="space-y-0.5" role="list" aria-label="Torre de posições ao vivo">
        <AnimatePresence>
          {positions.map((pos, i) => {
            const driver = driversMap[pos.driver_number]
            if (!driver) return null
            return (
              <DriverRow
                key={pos.driver_number}
                driver={driver}
                position={pos.position ?? i + 1}
                delta={pos.delta}
                interval={intervals?.[pos.driver_number]}
                stint={stints?.[pos.driver_number]}
                lap={info.byDriver[pos.driver_number]}
                lapInfo={info}
                onSelect={onSelectDriver}
                isSelected={selectedDriver?.driver_number === pos.driver_number}
              />
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
