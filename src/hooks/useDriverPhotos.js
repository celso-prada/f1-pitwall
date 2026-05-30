import { useQuery } from '@tanstack/react-query'
import { getDriverPhotoMap } from '../api/openf1'

export function useDriverPhotos() {
  const { data } = useQuery({
    queryKey: ['driverPhotos'],
    queryFn: getDriverPhotoMap,
    staleTime: 3_600_000,
  })
  return data ?? {}
}
