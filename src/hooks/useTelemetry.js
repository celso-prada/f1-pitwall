import { useQueries, useQuery } from '@tanstack/react-query'
import {
  getSeasonSessions,
  getDrivers,
  getDriverLaps,
  getLapTelemetry,
  fastestLap,
} from '../api/telemetry'

const HOUR = 60 * 60 * 1000

export function useSeasonSessions() {
  return useQuery({
    queryKey: ['telemetry', 'sessions'],
    queryFn: getSeasonSessions,
    staleTime: HOUR,
  })
}

export function useSessionDriversList(sessionKey) {
  return useQuery({
    queryKey: ['telemetry', 'drivers', sessionKey],
    queryFn: () => getDrivers(sessionKey),
    enabled: !!sessionKey,
    staleTime: HOUR,
  })
}

// Laps for several drivers at once — used to draw the race-pace lines and to
// locate each driver's fastest lap for the telemetry overlay.
export function useDriversLaps(sessionKey, driverNumbers) {
  const results = useQueries({
    queries: (driverNumbers ?? []).map(n => ({
      queryKey: ['telemetry', 'laps', sessionKey, n],
      queryFn: () => getDriverLaps(sessionKey, n),
      enabled: !!sessionKey && n != null,
      staleTime: HOUR,
    })),
  })
  return {
    byDriver: Object.fromEntries((driverNumbers ?? []).map((n, i) => [n, results[i]?.data ?? []])),
    isLoading: results.some(r => r.isLoading),
  }
}

// Fastest-lap car telemetry for up to two drivers (the comparison pair).
export function useLapTelemetry(sessionKey, driverNumber, lapsForDriver) {
  const lap = fastestLap(lapsForDriver ?? [])
  return useQuery({
    queryKey: ['telemetry', 'carData', sessionKey, driverNumber, lap?.lap_number],
    queryFn: () => getLapTelemetry(sessionKey, driverNumber, lap),
    enabled: !!sessionKey && driverNumber != null && !!lap,
    staleTime: HOUR,
  })
}
