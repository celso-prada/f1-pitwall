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

const LIVE_INTERVAL = 5000 // 5s polling

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

export function usePitStops(sessionKey) {
  return useQuery({
    queryKey: ['pits', sessionKey],
    queryFn: () => getPitStops(sessionKey),
    enabled: !!sessionKey,
    refetchInterval: LIVE_INTERVAL,
  })
}

export function useRaceControl(sessionKey, isLive) {
  return useQuery({
    queryKey: ['raceControl', sessionKey],
    queryFn: () => getRaceControl(sessionKey),
    enabled: !!sessionKey,
    refetchInterval: isLive ? LIVE_INTERVAL : false,
  })
}

export function useTeamRadio(sessionKey, isLive) {
  return useQuery({
    queryKey: ['teamRadio', sessionKey],
    queryFn: () => getTeamRadio(sessionKey),
    enabled: !!sessionKey,
    refetchInterval: isLive ? LIVE_INTERVAL : false,
  })
}

export function useLatestLaps(sessionKey, isLive) {
  return useQuery({
    queryKey: ['laps', sessionKey],
    queryFn: () => getLaps(sessionKey),
    enabled: !!sessionKey,
    refetchInterval: isLive ? LIVE_INTERVAL : false,
    select: buildLatestLaps,
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
  return useQuery({
    queryKey: ['raceSessions', 2025],
    queryFn: () => getSessions(2025).then(data =>
      data.filter(s => s.session_type === 'Race').reverse()
    ),
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
