import * as f1api from './f1api'

const BASE = 'https://api.jolpi.ca/ergast/f1'
const TIMEOUT = 3000

async function get(path) {
  // Bounded request — api.jolpi.ca can hang indefinitely when overloaded/down,
  // which previously left the UI stuck on skeletons forever.
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(TIMEOUT) })
  if (!res.ok) throw new Error(`Jolpica ${path} → ${res.status}`)
  return res.json()
}

// --- Circuit breaker ---------------------------------------------------------
// Jolpica has been down for extended periods. Without this, every page load
// pays the full timeout on each core call (in parallel, ~4s) before falling
// back. Once Jolpica fails we remember it (persisted, survives reloads) and
// skip straight to f1api.dev so subsequent loads are instant. After a cooldown
// we probe Jolpica again so it recovers automatically when it comes back.
const COOLDOWN_MS = 10 * 60 * 1000 // 10 min
const KEY = 'jolpica_down_until'

function jolpicaDown() {
  try {
    const until = Number(localStorage.getItem(KEY))
    return until && Date.now() < until
  } catch { return false }
}
function markJolpicaDown() {
  try { localStorage.setItem(KEY, String(Date.now() + COOLDOWN_MS)) } catch { /* ignore */ }
}
function markJolpicaUp() {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}

// Hedge window: how long to give Jolpica before also firing the fallback.
const HEDGE_MS = 1500

// Resilient read with three layers:
//  1. Breaker open  → skip Jolpica, go straight to f1api.dev (instant).
//  2. Breaker closed → try Jolpica, but if it hasn't answered within HEDGE_MS,
//     fire f1api.dev in parallel and return whichever finishes first (still
//     preferring Jolpica's richer data if it wins the race).
//  3. Jolpica errors → mark it down and use f1api.dev.
async function withFallback(label, primary, fallback) {
  if (jolpicaDown()) return fallback()

  const primaryP = (async () => {
    try { const r = await primary(); markJolpicaUp(); return r }
    catch (err) {
      console.warn(`[jolpica] ${label} failed (${err.message}); using f1api.dev fallback`)
      markJolpicaDown()
      throw err
    }
  })()

  // Give Jolpica a head start; if it wins (or fails fast) we skip the fallback.
  const first = await Promise.race([
    primaryP.then(r => ({ from: 'primary', r }), () => ({ from: 'failed' })),
    new Promise(res => setTimeout(() => res({ from: 'grace' }), HEDGE_MS)),
  ])
  if (first.from === 'primary') return first.r

  // Jolpica is slow or already failed — race it against the fallback.
  const fb = fallback().then(r => ({ from: 'fallback', r }))
  const winner = await Promise.race([
    primaryP.then(r => ({ from: 'primary', r }), () => fb),
    fb,
  ])
  return winner.r
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
  return withFallback('raceResults',
    async () => {
      const data = await get(`/${season}/${round}/results.json`)
      return data.MRData.RaceTable.Races[0] ?? null
    },
    () => f1api.getRaceResults(season, round),
  )
}

export async function getDriverResults(driverId, season = 'current') {
  return withFallback('driverResults',
    async () => {
      const data = await get(`/${season}/drivers/${driverId}/results.json`)
      return data.MRData.RaceTable.Races ?? []
    },
    () => f1api.getDriverResults(driverId, season),
  )
}

export async function getDriverSeasonStats(driverId) {
  return withFallback('driverSeasonStats',
    async () => {
      const data = await get(`/current/drivers/${driverId}/driverStandings.json`)
      return data.MRData.StandingsTable.StandingsLists[0]?.DriverStandings[0] ?? null
    },
    () => f1api.getDriverSeasonStats(driverId),
  )
}

export async function getDriverInfo(driverId) {
  return withFallback('driverInfo',
    async () => {
      const data = await get(`/drivers/${driverId}.json`)
      return data.MRData.DriverTable.Drivers[0] ?? null
    },
    () => f1api.getDriverInfo(driverId),
  )
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
  return withFallback('qualifyingResults',
    async () => {
      const data = await get(`/${season}/${round}/qualifying.json`)
      return data.MRData.RaceTable.Races[0] ?? null
    },
    () => f1api.getQualifyingResults(season, round),
  )
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
  return withFallback('currentSeason',
    async () => {
      const data = await get('/current.json')
      return data.MRData.RaceTable.season
    },
    () => f1api.getCurrentSeason(),
  )
}
