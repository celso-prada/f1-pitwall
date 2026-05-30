import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getTeamColor } from '../../utils/teamColors'
import { DRIVER_NAT_CODE } from '../../utils/flags'
import { Flag } from '../ui/Flag'
import { DriverRaceDetail } from './DriverRaceDetail'
import { ChevronDown, ChevronUp, Zap } from 'lucide-react'

function GridChange({ grid, final }) {
  const g = parseInt(grid)
  const f = parseInt(final)
  if (!g || !f) return null
  const diff = g - f
  if (diff === 0) return <span className="num text-[10px] text-text-mute">—</span>
  return (
    <span className={`num text-xs font-bold ${diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
      {diff > 0 ? `+${diff}` : diff}
    </span>
  )
}

export function RaceTable({ race, laps }) {
  const [expanded, setExpanded] = useState(null)

  if (!race?.Results?.length) {
    return (
      <div className="text-center text-text-mute py-12 text-sm">
        Resultados não disponíveis
      </div>
    )
  }

  const podiumColor = { 1: 'var(--color-gold)', 2: 'var(--color-silver)', 3: 'var(--color-bronze)' }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
            {['P', 'Piloto', 'Equipe', 'Grid', '±', 'V', 'Tempo/Status', 'Pts', 'FL', ''].map(h => (
              <th key={h} className="text-left py-2 px-2 section-title">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {race.Results.map((r, i) => {
            const pos      = parseInt(r.position)
            const color    = getTeamColor(r.Constructor.name)
            const natCode  = DRIVER_NAT_CODE[r.Driver.nationality]
            const isExpanded = expanded === r.Driver.driverId
            const isFl     = r.FastestLap?.rank === '1'

            return (
              <React.Fragment key={r.Driver.driverId}>
                <motion.tr
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => setExpanded(isExpanded ? null : r.Driver.driverId)}
                  className="group cursor-pointer transition-colors"
                  style={{
                    borderBottom: '1px solid var(--color-border-mute)',
                    borderLeft: `2px solid ${color}`,
                    background: isExpanded ? 'var(--color-surface-2)' : 'transparent',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-2)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = isExpanded ? 'var(--color-surface-2)' : 'transparent' }}
                >
                  <td className="py-2 px-2">
                    <span className="num font-black" style={{ color: podiumColor[pos] ?? 'var(--color-text-mute)' }}>{pos}</span>
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <Flag code={natCode} size={12} />
                      <span className="font-semibold text-text text-xs">
                        {r.Driver.givenName[0]}. <span className="font-black">{r.Driver.familyName}</span>
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <span className="text-xs" style={{ color: color + 'cc' }}>{r.Constructor.name}</span>
                  </td>
                  <td className="py-2 px-2 num text-xs text-text-mute">{r.grid}</td>
                  <td className="py-2 px-2"><GridChange grid={r.grid} final={r.position} /></td>
                  <td className="py-2 px-2 num text-xs text-text-dim">{r.laps}</td>
                  <td className="py-2 px-2 num text-xs text-text-dim">{r.Time?.time ?? r.status}</td>
                  <td className="py-2 px-2 num text-xs font-bold text-text">{r.points}</td>
                  <td className="py-2 px-2">
                    {isFl && <Zap size={12} className="text-purple-400" aria-label="Fastest Lap" />}
                  </td>
                  <td className="py-2 px-2">
                    {isExpanded
                      ? <ChevronUp size={12} className="text-text-mute" aria-hidden />
                      : <ChevronDown size={12} className="text-text-mute opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
                    }
                  </td>
                </motion.tr>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.tr
                      key={`detail-${r.Driver.driverId}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <td colSpan={10} className="py-0">
                        <div
                          className="py-3 px-4"
                          style={{ background: 'var(--color-surface-2)', borderLeft: `2px solid ${color}` }}
                        >
                          <DriverRaceDetail result={r} race={race} laps={laps} color={color} />
                        </div>
                      </td>
                    </motion.tr>
                  )}
                </AnimatePresence>
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
