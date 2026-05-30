import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'

function timeAgo(date) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000
  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

export function NewsCard({ item, index = 0 }) {
  return (
    <motion.a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="group flex gap-3 p-3 rounded-xl transition-colors"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-border-strong)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
    >
      {/* Thumbnail */}
      {item.image ? (
        <img
          src={item.image}
          alt=""
          aria-hidden
          className="w-16 h-14 object-cover rounded-lg flex-shrink-0"
          style={{ background: 'var(--color-surface-2)' }}
          onError={e => { e.target.style.display = 'none' }}
        />
      ) : (
        <div
          className="w-16 h-14 rounded-lg flex-shrink-0 flex items-center justify-center"
          style={{ background: 'var(--color-surface-2)' }}
          aria-hidden
        >
          <span className="text-xl">🏎️</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: 'var(--color-f1-dim)', color: 'var(--color-f1)' }}
          >
            {item.source}
          </span>
          <span className="num text-[9px] text-text-mute">{timeAgo(item.pubDate)}</span>
          <ExternalLink size={10} className="text-text-mute ml-auto opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
        </div>
        <h3 className="text-xs font-semibold text-text-dim group-hover:text-text leading-snug line-clamp-2 transition-colors">
          {item.title}
        </h3>
        {item.description && (
          <p className="text-[10px] text-text-mute mt-1 line-clamp-1">{item.description}</p>
        )}
      </div>
    </motion.a>
  )
}
