import { useNewsFeed } from '../../hooks/useNewsFeed'
import { NewsCard } from './NewsCard'
import { Skeleton } from '../ui/Skeleton'
import { Newspaper, RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

export function NewsFeed({ limit = 6 }) {
  const { data: news, isLoading, isFetching, dataUpdatedAt } = useNewsFeed()
  const queryClient = useQueryClient()

  const lastUpdate = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Newspaper size={13} className="text-red-500" />
          <span className="section-title">Notícias F1</span>
          {lastUpdate && (
            <span className="text-[10px] text-neutral-700">· {lastUpdate}</span>
          )}
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['f1news'] })}
          className="text-neutral-600 hover:text-white transition-colors"
          title="Atualizar"
        >
          <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-xl" style={{ background: '#141414' }}>
              <Skeleton height={56} width={64} rounded={8} />
              <div className="flex-1 space-y-2">
                <Skeleton height={10} width="40%" />
                <Skeleton height={14} width="90%" />
                <Skeleton height={10} width="70%" />
              </div>
            </div>
          ))}
        </div>
      ) : !news?.length ? (
        <div className="text-center text-neutral-600 py-8 text-sm">
          <Newspaper size={24} className="mx-auto mb-2 opacity-30" />
          Notícias indisponíveis no momento
        </div>
      ) : (
        <div className="space-y-2">
          {news.slice(0, limit).map((item, i) => (
            <NewsCard key={`${item.link}-${i}`} item={item} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
