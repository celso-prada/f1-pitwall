import { useQuery } from '@tanstack/react-query'
import { getF1News } from '../api/news'

export function useNewsFeed() {
  return useQuery({
    queryKey: ['f1news'],
    queryFn: getF1News,
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    retry: 1,
  })
}
