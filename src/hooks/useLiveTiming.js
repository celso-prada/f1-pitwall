import { useQuery } from '@tanstack/react-query'
import { getLiveSnapshot, normalizeLive } from '../api/livetiming'

// Poll do feed oficial via /api/live. Quando há sessão (live:true) atualiza a
// cada 5s; quando não há, espaça para 20s (a checagem de StreamingStatus é
// barata, mas não há motivo para insistir fora do ao vivo).
export function useLiveTiming() {
  return useQuery({
    queryKey: ['liveSnapshot'],
    queryFn: getLiveSnapshot,
    refetchInterval: (query) => (query.state.data?.live ? 5000 : 20000),
    refetchOnWindowFocus: true,
    staleTime: 4000,
    retry: 1,
    select: (res) => ({
      live: !!res?.live,
      status: res?.status,
      error: res?.error,
      ts: res?.ts,
      data: res?.live ? normalizeLive(res.snapshot) : null,
    }),
  })
}
