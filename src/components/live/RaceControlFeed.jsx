import { motion, AnimatePresence } from 'framer-motion'
import { getFlagColor } from '../../utils/teamColors'
import { AlertTriangle, Flag, Car, Info } from 'lucide-react'
import { Skeleton } from '../ui/Skeleton'

function getCategoryIcon(category) {
  if (!category) return <Info size={12} />
  const c = category.toUpperCase()
  if (c === 'FLAG') return <Flag size={12} />
  if (c === 'SAFETYCAR') return <Car size={12} />
  return <AlertTriangle size={12} />
}

function getCategoryColor(category, flag) {
  if (category === 'SafetyCar') return '#ff8c00'
  if (category === 'Flag') return getFlagColor(flag)
  return '#999'
}

function formatTime(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function FeedItem({ item }) {
  const color = getCategoryColor(item.category, item.flag)
  const isImportant = item.category === 'SafetyCar' || (item.flag && item.flag !== 'GREEN')

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, height: 0 }}
      animate={{ opacity: 1, x: 0, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="flex gap-2 px-3 py-2 rounded-lg transition-colors"
      style={{
        background: isImportant ? `${color}10` : 'transparent',
        borderLeft: `2px solid ${color}`,
      }}
    >
      <div className="flex-shrink-0 mt-0.5" style={{ color }}>
        {getCategoryIcon(item.category)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
            {item.category}
            {item.flag && ` · ${item.flag}`}
          </span>
          {item.lap_number && (
            <span className="text-[10px] text-neutral-600">Volta {item.lap_number}</span>
          )}
          <span className="text-[10px] text-neutral-700 ml-auto">{formatTime(item.date)}</span>
        </div>
        <p className="text-xs text-neutral-400 leading-relaxed truncate">{item.message}</p>
      </div>
    </motion.div>
  )
}

export function RaceControlFeed({ messages, loading }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-2 px-3 py-2">
            <Skeleton height={12} width={12} rounded={6} />
            <div className="flex-1 space-y-1">
              <Skeleton height={10} width="40%" />
              <Skeleton height={12} width="90%" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!messages?.length) {
    return (
      <div className="text-center text-neutral-600 py-6 text-sm">
        Nenhuma mensagem de race control
      </div>
    )
  }

  const recent = [...messages].reverse().slice(0, 15)

  return (
    <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
      <AnimatePresence initial={false}>
        {recent.map((msg, i) => (
          <FeedItem key={`${msg.date}-${i}`} item={msg} isNew={i === 0} />
        ))}
      </AnimatePresence>
    </div>
  )
}
