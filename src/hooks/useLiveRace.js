import { useQuery } from '@tanstack/react-query'
import {
  getLatestSession,
  getSessionDrivers,
  getLivePositions,
  getLiveIntervals,
  getLiveWeather,
  getPitStops,
  getRaceControl,
  getTeamRadio,
  getLaps,
  getStints,
  getSessions,
  buildCurrentOrder,
  buildLatestIntervals,
  buildCurrentStints,
  buildLatestLaps,
} from '../api/openf1'

// Staggered polling cadences. OpenF1's free tier allows ~3 req/s, and the live
// view fans out to ~10 endpoints — firing them all on the same 5s tick trips
// rate limiting (429). Spreading the intervals keeps each tick under budget
// while still feeling live for the data that actually changes fast.
const LIVE_INTERVAL = 5000   // core timing (positions, intervals)
const LAPS_INTERVAL = 8000
const RC_INTERVAL = 10000
const PIT_INTERVAL = 12000
const RADIO_INTERVAL = 15000

export function useLatestSession() {
  return useQuery({
    queryKey: ['latestSession'],
    queryFn: getLatestSession,
    staleTime: 60_000,
  })
}

export function useSessionDrivers(sessionKey) {
  return useQuery({
    queryKey: ['drivers', sessionKey],
    queryFn: () => getSessionDrivers(sessionKey),
    enabled: !!sessionKey,
    staleTime: 300_000,
  })
}

export function useLivePositions(sessionKey, isLive) {
  return useQuery({
    queryKey: ['positions', sessionKey],
    queryFn: () => getLivePositions(sessionKey),
    enabled: !!sessionKey,
    refetchInterval: isLive ? LIVE_INTERVAL : false,
    select: buildCurrentOrder,
  })
}

export function useLiveIntervals(sessionKey, isLive) {
  return useQuery({
    queryKey: ['intervals', sessionKey],
    queryFn: () => getLiveIntervals(sessionKey),
    enabled: !!sessionKey,
    refetchInterval: isLive ? LIVE_INTERVAL : false,
    select: buildLatestIntervals,
  })
}

export function useLiveWeather(sessionKey, isLive) {
  return useQuery({
    queryKey: ['weather', sessionKey],
    queryFn: () => getLiveWeather(sessionKey),
    enabled: !!sessionKey,
    refetchInterval: isLive ? 30_000 : false,
  })
}

export function usePitStops(sessionKey, isLive) {
  return useQuery({
    queryKey: ['pits', sessionKey],
    queryFn: () => getPitStops(sessionKey),
    enabled: !!sessionKey,
    refetchInterval: isLive ? PIT_INTERVAL : false,
  })
}

export function useRaceControl(sessionKey, isLive) {
  return useQuery({
    queryKey: ['raceControl', sessionKey],
    queryFn: () => getRaceControl(sessionKey),
    enabled: !!sessionKey,
    refetchInterval: isLive ? RC_INTERVAL : false,
  })
}

export function useTeamRadio(sessionKey, isLive) {
  return useQuery({
    queryKey: ['teamRadio', sessionKey],
    queryFn: () => getTeamRadio(sessionKey),
    enabled: !!sessionKey,
    refetchInterval: isLive ? RADIO_INTERVAL : false,
  })
}

// Returns the raw laps array — the live view derives latest/personal/session
// bests from the full history (see utils/live → buildLapInfo).
export function useLatestLaps(sessionKey, isLive) {
  return useQuery({
    queryKey: ['laps', sessionKey],
    queryFn: () => getLaps(sessionKey),
    enabled: !!sessionKey,
    refetchInterval: isLive ? LAPS_INTERVAL : false,
  })
}

export function useStints(sessionKey, isLive) {
  return useQuery({
    queryKey: ['stints', sessionKey],
    queryFn: () => getStints(sessionKey),
    enabled: !!sessionKey,
    refetchInterval: isLive ? 15_000 : false,
    select: buildCurrentStints,
  })
}

export function useRaceSessions() {
  const year = new Date().getFullYear()
  return useQuery({
    queryKey: ['raceSessions', year],
    queryFn: async () => {
      // Current year first; fall back to last year in the off-season so the
      // radio archive is never empty.
      for (const y of [year, year - 1]) {
        const data = await getSessions(y).catch(() => [])
        const races = data.filter(s => s.session_type === 'Race').reverse()
        if (races.length) return races
      }
      return []
    },
    staleTime: 60 * 60 * 1000,
  })
}

export function useSessionRadio(sessionKey) {
  return useQuery({
    queryKey: ['sessionRadio', sessionKey],
    queryFn: () => Promise.all([
      getTeamRadio(sessionKey),
      getSessionDrivers(sessionKey),
    ]).then(([radio, drivers]) => ({ radio, drivers })),
    enabled: !!sessionKey,
    staleTime: 5 * 60 * 1000,
  })
}
