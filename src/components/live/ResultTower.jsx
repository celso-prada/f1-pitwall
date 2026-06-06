import { motion } from 'framer-motion'
import { getTeamColor } from '../../utils/teamColors'
import { fmtLap, QUALI_PART } from '../../utils/live'
import { Skeleton } from '../ui/Skeleton'

function StatusTag({ row }) {
  const label = row.dsq ? 'DSQ' : row.dnf ? 'DNF' : row.dns ? 'DNS' : null
  if (!label) return null
  const color = label === 'DSQ' ? '#ef4444' : '#f59e0b'
  return (
    <span className="text-[8px] font-black uppercase px-1 rounded"
      style={{ background: color + '22', color, border: `1px solid ${color}55` }}>{label}</span>
  )
}

function PositionBadge({ pos }) {
  const isTop3 = pos <= 3
  const podiumColor = pos === 1 ? 'var(--color-gold)' : pos === 2 ? 'var(--color-silver)' : 'var(--color-bronze)'
  return (
    <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 num text-xs font-black"
      style={{
        background: isTop3 ? podiumColor + '22' : 'var(--color-surface-2)',
        color:      isTop3 ? podiumColor : 'var(--color-text-mute)',
        border:     `1px solid ${isTop3 ? podiumColor + '44' : 'var(--color-border)'}`,
      }}>
      {pos ?? '—'}
    </div>
  )
}

function ResultRow({ row, driver, isQuali, onSelect, isSelected }) {
  const color = getTeamColor(driver.team_name, driver.team_colour)
  const noTime = row.timeSec == null
  const gap = row.gapSec

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onClick={() => onSelect(driver)}
      className="relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors duration-150 group"
      style={{
        background: isSelected ? `${color}18` : 'transparent',
        border: `1px solid ${isSelected ? color + '45' : 'transparent'}`,
      }}
      whileHover={{ backgroundColor: `${color}10` }}
      role="listitem"
      tabIndex={0}
      aria-label={`${driver.full_name}, posição ${row.position}`}
      onKeyDown={e => e.key === 'Enter' && onSelect(driver)}
    >
      <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full" style={{ background: color, opacity: 0.7 }} />

      <PositionBadge pos={row.position} />

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
          <StatusTag row={row} />
        </div>
        <div className="text-[8px] truncate" style={{ color: color + 'bb' }}>{driver.team_name}</div>
      </div>

      {/* Quali part that set the time (Q1/Q2/Q3) */}
      {isQuali && (
        <span className="w-5 text-center text-[8px] font-black uppercase tracking-wider flex-shrink-0"
          style={{ color: row.partIndex === 2 ? '#b14be8' : row.partIndex === 1 ? '#22c55e' : 'var(--color-text-mute)' }}
          title="Fase que definiu o tempo">
          {row.partIndex != null ? QUALI_PART[row.partIndex] : ''}
        </span>
      )}

      {/* Determining time */}
      <div className="num text-[11px] font-bold text-right w-[58px] flex-shrink-0"
        style={{ color: row.position === 1 ? 'var(--color-gold)' : 'var(--color-text)' }} title="Tempo">
        {noTime ? '—' : fmtLap(row.timeSec)}
      </div>

      {/* Gap to leader */}
      <div className="num text-[10px] text-right w-12 flex-shrink-0 text-text-mute" title="Diferença para o líder">
        {row.position === 1 ? (isQuali ? 'POLE' : 'P1')
          : gap != null ? `+${gap.toFixed(3)}` : '—'}
      </div>
    </motion.div>
  )
}

// Classificação final oficial (OpenF1 /session_result). Mostra posição + tempo
// que definiu a posição + gap de cada piloto. Usado fora do ao vivo, quando há
// um último evento concluído. Scroll lateral no mobile (mesmo padrão da torre).
export function ResultTower({ rows, drivers, loading, isQuali, onSelectDriver, selectedDriver }) {
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
            <Skeleton height={12} width={56} />
          </div>
        ))}
      </div>
    )
  }

  if (!rows?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-mute">
        <div className="text-4xl mb-3" aria-hidden>🏁</div>
        <div className="text-sm font-semibold">Sem classificação disponível</div>
      </div>
    )
  }

  const driversMap = Object.fromEntries((drivers ?? []).map(d => [d.driver_number, d]))

  return (
    <div className="overflow-x-auto overscroll-x-contain">
      <div className="min-w-[300px]">
        {/* column header */}
        <div className="flex items-center gap-1.5 px-2 pb-1.5 mb-1 text-[8px] uppercase tracking-widest text-text-mute font-bold"
          style={{ borderBottom: '1px solid var(--color-border)' }}>
          <span className="w-6 text-center">Pos</span>
          <span className="w-6" />
          <span className="flex-1">Piloto</span>
          {isQuali && <span className="w-5 text-center">Fase</span>}
          <span className="w-[58px] text-right">Tempo</span>
          <span className="w-12 text-right">Gap</span>
        </div>

        <div className="space-y-0.5" role="list" aria-label="Classificação final">
          {rows.map((row) => {
            const driver = driversMap[row.num]
            if (!driver) return null
            return (
              <ResultRow
                key={row.num}
                row={row}
                driver={driver}
                isQuali={isQuali}
                onSelect={onSelectDriver}
                isSelected={selectedDriver?.driver_number === row.num}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
