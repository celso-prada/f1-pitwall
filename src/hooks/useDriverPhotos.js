import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getDriverPhotoMap } from '../api/openf1'
import { useLiveTiming } from './useLiveTiming'

// Mapa TLA → foto do piloto. Fonte dupla, porque o OpenF1 (headshots) fica
// BLOQUEADO durante a sessão ao vivo:
//  - fora do ao vivo: OpenF1 (getDriverPhotoMap), persistido em cache;
//  - durante o ao vivo: HeadshotUrl do feed oficial (DriverList via /api/live).
// Assim os círculos de foto nunca ficam vazios, e não chamamos o OpenF1 no ao
// vivo (evita os erros de CORS do /drivers).
export function useDriverPhotos() {
  const { data: live } = useLiveTiming()
  const isLive = !!live?.live

  const { data: openf1Map } = useQuery({
    queryKey: ['driverPhotos'],
    queryFn: getDriverPhotoMap,
    staleTime: 3_600_000,
    enabled: !isLive,
  })

  return useMemo(() => {
    const map = { ...(openf1Map ?? {}) }
    // Headshots do feed oficial preenchem o que faltar (chave = TLA == code).
    for (const d of live?.data?.drivers ?? []) {
      if (d.tla && d.headshot && !map[d.tla]) map[d.tla] = d.headshot
    }
    return map
  }, [openf1Map, live])
}
