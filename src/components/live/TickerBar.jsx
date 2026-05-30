import { useNewsFeed } from '../../hooks/useNewsFeed'

export function TickerBar() {
  const { data: news } = useNewsFeed()

  if (!news?.length) return null

  const items = news

  return (
    <div
      className="h-7 overflow-hidden flex items-center border-b"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border-mute)' }}
    >
      <div
        className="flex-shrink-0 flex items-center gap-1.5 px-3 h-full border-r"
        style={{ background: 'var(--color-f1)', borderColor: 'rgba(255,255,255,0.15)' }}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-white live-dot" aria-hidden />
        <span className="text-white text-[9px] font-black tracking-widest">NEWS</span>
      </div>

      <div className="flex-1 overflow-hidden relative" aria-hidden>
        <div className="ticker-anim whitespace-nowrap flex items-center h-7">
          {items.map((item, i) => (
            <a
              key={i}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mr-8 transition-colors group flex-shrink-0"
              style={{ color: 'var(--color-text-mute)' }}
              tabIndex={-1}
            >
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-f1)' }}
              >
                {item.source?.toUpperCase() ?? 'F1'}
              </span>
              <span className="text-[10px] group-hover:text-text transition-colors truncate max-w-xs">
                {item.title}
              </span>
              {i < items.length - 1 && (
                <span className="ml-8" style={{ color: 'var(--color-border-strong)' }}>•</span>
              )}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
