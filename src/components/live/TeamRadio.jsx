import { motion, AnimatePresence } from 'framer-motion'
import { getTeamColor } from '../../utils/teamColors'
import { Radio } from 'lucide-react'
import { Skeleton } from '../ui/Skeleton'

function formatTime(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function TeamRadio({ messages, drivers, loading }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-2 px-2 py-1.5">
            <Skeleton height={24} width={24} rounded={12} />
            <div className="flex-1 space-y-1">
              <Skeleton height={10} width="60%" />
              <Skeleton height={28} width="100%" rounded={8} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!messages?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-neutral-600 gap-1">
        <Radio size={16} />
        <span className="text-xs">Nenhum rádio disponível</span>
      </div>
    )
  }

  const driversMap = Object.fromEntries((drivers ?? []).map(d => [d.driver_number, d]))
  const recent = [...messages].reverse().slice(0, 8)

  return (
    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
      <AnimatePresence initial={false}>
        {recent.map((msg) => {
          const driver = driversMap[msg.driver_number]
          const color = driver ? getTeamColor(driver.team_name, driver.team_colour) : '#666'

          return (
            <motion.div
              key={`${msg.date}-${msg.driver_number}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-2 px-2 py-1.5 rounded-lg"
              style={{ background: '#141414' }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0 mt-0.5"
                style={{ background: color + '20', color, border: `1px solid ${color}40` }}
              >
                {driver?.name_acronym?.slice(0, 2) ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold" style={{ color }}>
                    {driver?.name_acronym ?? `#${msg.driver_number}`}
                  </span>
                  <span className="text-[9px] text-neutral-700 ml-auto">{formatTime(msg.date)}</span>
                </div>
                <a
                  href={msg.recording_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] text-neutral-400 hover:text-white transition-colors"
                  style={{ background: '#1e1e1e' }}
                >
                  <Radio size={9} className="text-red-500 flex-shrink-0" />
                  <span className="truncate">Ouvir rádio</span>
                </a>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
