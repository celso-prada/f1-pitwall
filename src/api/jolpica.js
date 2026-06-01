import * as f1api from './f1api'

const BASE = 'https://api.jolpi.ca/ergast/f1'
const TIMEOUT = 8000

async function get(path) {
  // Bounded request — api.jolpi.ca can hang indefinitely when overloaded/down,
  // which previously left the UI stuck on skeletons forever.
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(TIMEOUT) })
  if (!res.ok) throw new Error(`Jolpica ${path} → ${res.status}`)
  return res.json()
}

// Try Jolpica first; if it times out / errors, fall back to f1api.dev so the
// core views keep showing live data during a Jolpica outage.
async function withFallback(label, primary, fallback) {
  try {
    return await primary()
  } catch (err) {
    console.warn(`[jolpica] ${label} failed (${err.message}); using f1api.dev fallback`)
    return fallback()
  }
}

export async function getDriverStandings(season = 'current') {
  return withFallback('driverStandings',
    async () => {
      const data = await get(`/${season}/driverStandings.json`)
      return data.MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? []
    },
    () => f1api.getDriverStandings(season),
  )
}

export async function getConstructorStandings(season = 'current') {
  return withFallback('constructorStandings',
    async () => {
      const data = await get(`/${season}/constructorStandings.json`)
      return data.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? []
    },
    () => f1api.getConstructorStandings(season),
  )
}

export async function getCalendar(season = 'current') {
  return withFallback('calendar',
    async () => {
      const data = await get(`/${season}.json`)
      return data.MRData.RaceTable.Races ?? []
    },
    () => f1api.getCalendar(season),
  )
}

export async function getLastRaceResults() {
  return withFallback('lastRaceResults',
    async () => {
      const data = await get('/current/last/results.json')
      return data.MRData.RaceTable.Races[0] ?? null
    },
    () => f1api.getLastRaceResults(),
  )
}

export async function getRaceResults(season, round) {
  const data = await get(`/${season}/${round}/results.json`)
  return data.MRData.RaceTable.Races[0] ?? null
}

export async function getDriverResults(driverId, season = 'current') {
  const data = await get(`/${season}/drivers/${driverId}/results.json`)
  return data.MRData.RaceTable.Races ?? []
}

export async function getDriverSeasonStats(driverId) {
  const data = await get(`/current/drivers/${driverId}/driverStandings.json`)
  return data.MRData.StandingsTable.StandingsLists[0]?.DriverStandings[0] ?? null
}

export async function getDriverInfo(driverId) {
  const data = await get(`/drivers/${driverId}.json`)
  return data.MRData.DriverTable.Drivers[0] ?? null
}

export async function getCircuitResults(circuitId) {
  const first = await get(`/circuits/${circuitId}/results/1.json?limit=100`)
  const races = first.MRData.RaceTable.Races ?? []
  const total = parseInt(first.MRData.total)
  if (total <= 100) return races
  const pages = await Promise.all(
    Array.from({ length: Math.ceil((total - 100) / 100) }, (_, i) =>
      get(`/circuits/${circuitId}/results/1.json?limit=100&offset=${(i + 1) * 100}`)
    )
  )
  return [...races, ...pages.flatMap(p => p.MRData.RaceTable.Races ?? [])]
}

export async function getDriverWins(driverId) {
  const first = await get(`/drivers/${driverId}/results/1.json?limit=100`)
  const races = first.MRData.RaceTable.Races ?? []
  const total = parseInt(first.MRData.total)
  if (total <= 100) return races
  const pages = await Promise.all(
    Array.from({ length: Math.ceil((total - 100) / 100) }, (_, i) =>
      get(`/drivers/${driverId}/results/1.json?limit=100&offset=${(i + 1) * 100}`)
    )
  )
  return [...races, ...pages.flatMap(p => p.MRData.RaceTable.Races ?? [])]
}

export async function getDriverAllResults(driverId) {
  const first = await get(`/drivers/${driverId}/results.json?limit=100`)
  const races = first.MRData.RaceTable.Races ?? []
  const total = parseInt(first.MRData.total)
  if (total <= 100) return races
  const pages = await Promise.all(
    Array.from({ length: Math.ceil((total - 100) / 100) }, (_, i) =>
      get(`/drivers/${driverId}/results.json?limit=100&offset=${(i + 1) * 100}`)
    )
  )
  return [...races, ...pages.flatMap(p => p.MRData.RaceTable.Races ?? [])]
}

export async function getDriverCareerStats(driverId) {
  const [wins, poles, seasons] = await Promise.allSettled([
    get(`/drivers/${driverId}/results/1.json?limit=1`),
    get(`/drivers/${driverId}/grid/1.json?limit=1`),
    get(`/drivers/${driverId}/seasons.json?limit=100`),
  ])
  const safeInt = r => {
    if (r.status !== 'fulfilled') return null
    const n = parseInt(r.value.MRData.total, 10)
    return isNaN(n) ? null : n
  }
  return {
    wins:    safeInt(wins),
    poles:   safeInt(poles),
    seasons: seasons.status === 'fulfilled' ? (seasons.value.MRData.SeasonTable.Seasons ?? []) : [],
  }
}

export async function getConstructorRaces(constructorId) {
  const data = await get(`/current/constructors/${constructorId}/results.json?limit=10`)
  return data.MRData.RaceTable.Races ?? []
}

export async function getQualifyingResults(season, round) {
  const data = await get(`/${season}/${round}/qualifying.json`)
  return data.MRData.RaceTable.Races[0] ?? null
}

export async function getDriverSeasonHistory(driverId) {
  const seasonsData = await get(`/drivers/${driverId}/driverStandings.json?limit=30`)
  return seasonsData.MRData.StandingsTable.StandingsLists ?? []
}

export async function getLapTimes(season, round) {
  // Jolpica returns lap times paginated — get first 3 pages (covers ~60 laps)
  const pages = await Promise.allSettled([
    get(`/${season}/${round}/laps.json?limit=100&offset=0`),
    get(`/${season}/${round}/laps.json?limit=100&offset=100`),
  ])
  const laps = pages
    .filter(p => p.status === 'fulfilled')
    .flatMap(p => p.value.MRData.RaceTable.Races[0]?.Laps ?? [])
  return laps
}

export async function getCurrentSeason() {
  const data = await get('/current.json')
  return data.MRData.RaceTable.season
}
