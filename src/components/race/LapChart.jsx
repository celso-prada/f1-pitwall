import { motion } from 'framer-motion'
import { getTeamColor } from '../../utils/teamColors'

export function PositionChangeChart({ results }) {
  if (!results?.length) return null

  const sorted = [...results].sort((a, b) => parseInt(a.position) - parseInt(b.position))

  return (
    <div className="space-y-1">
      <div className="text-[10px] text-neutral-600 uppercase tracking-wider mb-3">
        Mudança de posição (Grid → Chegada)
      </div>
      {sorted.map((r, i) => {
        const grid = parseInt(r.grid) || parseInt(r.position)
        const final = parseInt(r.position)
        const diff = grid - final
        const color = getTeamColor(r.Constructor.name)
        const maxGain = 15

        return (
          <motion.div
            key={r.Driver.driverId}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.02 }}
            className="flex items-center gap-2"
          >
            <span className="text-xs font-black w-5 text-right" style={{ color }}>
              {final}
            </span>
            <span className="text-xs text-neutral-500 w-16 truncate">{r.Driver.code}</span>

            {/* Bar visualization */}
            <div className="flex-1 flex items-center h-4 relative">
              {/* Center line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-neutral-800" />

              {diff > 0 ? (
                // Gained positions — bar to the left (green)
                <div
                  className="absolute right-1/2 top-1 bottom-1 rounded-l-sm"
                  style={{
                    background: '#00d63240',
                    border: '1px solid #00d63260',
                    width: `${(diff / maxGain) * 48}%`,
                  }}
                />
              ) : diff < 0 ? (
                // Lost positions — bar to the right (red)
                <div
                  className="absolute left-1/2 top-1 bottom-1 rounded-r-sm"
                  style={{
                    background: '#e1060030',
                    border: '1px solid #e1060050',
                    width: `${(Math.abs(diff) / maxGain) * 48}%`,
                  }}
                />
              ) : (
                <div className="absolute left-1/2 top-1.5 bottom-1.5 w-1.5 -translate-x-0.5 rounded-sm bg-neutral-700" />
              )}
            </div>

            <span
              className="text-xs font-bold w-8 text-right"
              style={{ color: diff > 0 ? '#00d632' : diff < 0 ? '#e10600' : '#666' }}
            >
              {diff > 0 ? `+${diff}` : diff === 0 ? '—' : diff}
            </span>
            <span className="text-xs text-neutral-700 w-5 text-right">{grid}</span>
          </motion.div>
        )
      })}

      <div className="flex items-center justify-between mt-2 px-24">
        <span className="text-[9px] text-green-600">← Ganhou posições</span>
        <span className="text-[9px] text-red-600">Perdeu posições →</span>
      </div>
    </div>
  )
}
