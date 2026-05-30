const BASE = 'https://api.jolpi.ca/ergast/f1'

async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`Jolpica ${path} → ${res.status}`)
  return res.json()
}

export async function getDriverStandings(season = 'current') {
  const data = await get(`/${season}/driverStandings.json`)
  return data.MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? []
}

export async function getConstructorStandings(season = 'current') {
  const data = await get(`/${season}/constructorStandings.json`)
  return data.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? []
}

export async function getCalendar(season = '2025') {
  const data = await get(`/${season}.json`)
  return data.MRData.RaceTable.Races ?? []
}

export async function getLastRaceResults() {
  const data = await get('/current/last/results.json')
  const race = data.MRData.RaceTable.Races[0]
  return race ?? null
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

export async function getDriverCareerStats(driverId) {
  const [wins, poles, seasons] = await Promise.all([
    get(`/drivers/${driverId}/results/1.json?limit=1`),
    get(`/drivers/${driverId}/grid/1.json?limit=1`),
    get(`/drivers/${driverId}/seasons.json?limit=100`),
  ])
  return {
    wins: parseInt(wins.MRData.total),
    poles: parseInt(poles.MRData.total),
    seasons: seasons.MRData.SeasonTable.Seasons ?? [],
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
