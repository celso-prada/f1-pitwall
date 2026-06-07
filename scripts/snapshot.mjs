// Build-time season snapshot.
//
// Runs in `prebuild`, fetches the coherent Jolpica season (calendar with full
// session schedule, standings, and every completed round's results/qualifying)
// and writes public/data/season-<year>.json. The app reads this as the LAST
// RESORT data layer (after the live edge-cached Jolpica): even with a cold edge
// AND Jolpica down, the dashboard still shows a coherent season instead of
// falling onto the mismatched f1api.dev data. A committed baseline ships in the
// repo so the very first build (or a build while Jolpica is down) still works —
// this script only refreshes it, never requires it.
//
// Resilient by design: any fetch failure is swallowed and the previous snapshot
// is kept, so a flaky Jolpica can never break the deploy.
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = 'https://api.jolpi.ca/ergast/f1'
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data')

async function get(path, ms = 10000) {
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(ms) })
  if (!res.ok) throw new Error(`${path} → ${res.status}`)
  return res.json()
}

// Map a results Race down to what the UI consumes (keeps payload small).
const trimResult = r => ({
  position: r.position, points: r.points, grid: r.grid, status: r.status,
  Time: r.Time, FastestLap: r.FastestLap, Driver: r.Driver, Constructor: r.Constructor,
})
const trimRace = race => ({
  season: race.season, round: race.round, raceName: race.raceName,
  date: race.date, time: race.time, Circuit: race.Circuit,
  Results: (race.Results ?? []).map(trimResult),
})

async function main() {
  let season, calendar
  try {
    const cur = await get('/current.json')
    season = cur.MRData.RaceTable.season
    calendar = cur.MRData.RaceTable.Races ?? []
  } catch (err) {
    console.warn(`[snapshot] could not reach Jolpica (${err.message}); keeping existing snapshot.`)
    return
  }

  const snap = { season, generatedAt: new Date().toISOString(), calendar }

  try {
    const ds = await get('/current/driverStandings.json')
    snap.driverStandings = ds.MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? []
  } catch (err) { console.warn(`[snapshot] driverStandings: ${err.message}`) }

  try {
    const cs = await get('/current/constructorStandings.json')
    snap.constructorStandings = cs.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? []
  } catch (err) { console.warn(`[snapshot] constructorStandings: ${err.message}`) }

  // Completed rounds = those whose race date is on/before today. Fetch their
  // results + qualifying so RacePage and the home podium work fully offline.
  const today = new Date().toISOString().slice(0, 10)
  const completed = calendar.filter(r => r.date && r.date <= today)
  snap.races = {}
  snap.qualifying = {}
  for (const r of completed) {
    try {
      const rr = await get(`/${season}/${r.round}/results.json`)
      const race = rr.MRData.RaceTable.Races[0]
      if (race?.Results?.length) snap.races[r.round] = trimRace(race)
    } catch (err) { console.warn(`[snapshot] results r${r.round}: ${err.message}`) }
    try {
      const q = await get(`/${season}/${r.round}/qualifying.json`)
      const qr = q.MRData.RaceTable.Races[0]
      if (qr?.QualifyingResults?.length) {
        snap.qualifying[r.round] = {
          season: qr.season, round: qr.round, raceName: qr.raceName,
          Circuit: qr.Circuit, QualifyingResults: qr.QualifyingResults,
        }
      }
    } catch (err) { console.warn(`[snapshot] qualifying r${r.round}: ${err.message}`) }
  }
  snap.lastRound = Object.keys(snap.races).map(Number).reduce((a, b) => Math.max(a, b), 0) || null

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })
  const file = join(OUT_DIR, `season-${season}.json`)
  // Also keep a stable "latest" alias the client can fetch without knowing the year.
  writeFileSync(file, JSON.stringify(snap))
  writeFileSync(join(OUT_DIR, 'season-latest.json'), JSON.stringify(snap))
  console.log(`[snapshot] wrote ${file} — ${calendar.length} races, ${Object.keys(snap.races).length} completed, last round ${snap.lastRound}`)
}

main().catch(err => {
  // Never fail the build over the snapshot.
  console.warn(`[snapshot] skipped: ${err.message}`)
})
