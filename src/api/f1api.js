// Fallback data source — f1api.dev — used when Jolpica/Ergast (api.jolpi.ca) is
// unreachable. Maps f1api.dev responses into the Ergast/Jolpica shape the app
// already consumes, so components need no changes.
// In production, go through our Vercel serverless proxy so responses are served
// from the edge cache (f1api.dev itself is ~4.5s/req). In dev there is no
// serverless runtime, so hit f1api.dev directly.
import { cleanRaceName } from '../utils/format'

const DIRECT = 'https://f1api.dev/api'
const USE_PROXY = import.meta.env.PROD

// f1api.dev schedule slot → Ergast {date,time} (undefined when absent).
const sess = s => (s?.date ? { date: s.date, time: s.time ?? null } : undefined)

const directUrl = path => `${DIRECT}/${path.replace(/^\//, '')}`
const proxyUrl = path => `/api/f1?path=${encodeURIComponent(path.replace(/^\//, ''))}`

async function get(path, ms = 12000) {
  // In production prefer the edge-cached proxy; if it's unavailable (e.g. the
  // serverless function failed to deploy) fall back to hitting f1api.dev direct
  // so the app keeps working — the proxy is an optimisation, not a dependency.
  if (USE_PROXY) {
    try {
      const res = await fetch(proxyUrl(path), { signal: AbortSignal.timeout(ms) })
      if (res.ok) return await res.json()
    } catch { /* fall through to direct */ }
  }
  const res = await fetch(directUrl(path), { signal: AbortSignal.timeout(ms) })
  if (!res.ok) throw new Error(`f1api ${path} → ${res.status}`)
  return res.json()
}

// f1api.dev returns country names; the app's flag maps key on Ergast demonyms.
const COUNTRY_DEMONYM = {
  'Great Britain': 'British', 'United Kingdom': 'British', 'England': 'British',
  Netherlands: 'Dutch', Spain: 'Spanish', Monaco: 'Monegasque', Mexico: 'Mexican',
  Australia: 'Australian', Canada: 'Canadian', Brazil: 'Brazilian', France: 'French',
  Germany: 'German', Finland: 'Finnish', Japan: 'Japanese', 'United States': 'American',
  USA: 'American', China: 'Chinese', Thailand: 'Thai', Denmark: 'Danish', Italy: 'Italian',
  Austria: 'Austrian', Argentina: 'Argentine', Switzerland: 'Swiss',
  'New Zealand': 'New Zealander', Poland: 'Polish',
}
const demonym = c => COUNTRY_DEMONYM[c] ?? c

// f1api.dev teamId → clean constructor name used by team color/flag maps.
const TEAM_NAME = {
  mercedes: 'Mercedes', ferrari: 'Ferrari', mclaren: 'McLaren', red_bull: 'Red Bull',
  alpine: 'Alpine', haas: 'Haas', rb: 'Racing Bulls', racing_bulls: 'Racing Bulls',
  williams: 'Williams', audi: 'Audi', cadillac: 'Cadillac', aston_martin: 'Aston Martin',
  sauber: 'Kick Sauber', kick_sauber: 'Kick Sauber',
}
const teamName = (id, fallback) => TEAM_NAME[id] ?? fallback ?? id

// idOverride: in some payloads (e.g. standings) the driverId sits on the parent
// row, not inside the nested driver object — pass it in so navigation works.
const mapDriver = (d, idOverride) => ({
  driverId: idOverride ?? d.driverId,
  code: d.shortName,
  permanentNumber: d.number != null ? String(d.number) : undefined,
  givenName: d.name ?? '',
  familyName: d.surname ?? '',
  nationality: demonym(d.nationality),
})

const mapConstructor = (id, name, country) => ({
  constructorId: id,
  name: teamName(id, name),
  nationality: demonym(country),
})

export async function getDriverStandings(season = 'current') {
  const data = await get(`/${season}/drivers-championship`)
  return (data.drivers_championship ?? []).map(s => ({
    position: String(s.position),
    points: String(s.points),
    wins: String(s.wins ?? 0),
    Driver: mapDriver(s.driver, s.driverId),
    Constructors: [mapConstructor(s.teamId, s.team?.teamName, s.team?.country)],
  }))
}

export async function getConstructorStandings(season = 'current') {
  const data = await get(`/${season}/constructors-championship`)
  return (data.constructors_championship ?? []).map(s => ({
    position: String(s.position),
    points: String(s.points),
    wins: String(s.wins ?? 0),
    Constructor: mapConstructor(s.teamId, s.team?.teamName, s.team?.country),
  }))
}

// Current championship row for a single driver (Ergast DriverStandings item).
export async function getDriverSeasonStats(driverId, season = 'current') {
  const list = await getDriverStandings(season)
  return list.find(s => s.Driver?.driverId === driverId) ?? null
}

export async function getCurrentSeason() {
  const data = await get('/current')
  return String(data.season ?? new Date().getFullYear())
}

// Circuit metadata in an Ergast-ish Circuit shape, plus the richer f1api extras
// (lap record, corners, length, fastest-lap holder) used to enrich CircuitPage.
export async function getCircuitInfo(circuitId) {
  const data = await get(`/circuits/${circuitId}`)
  const c = Array.isArray(data.circuit) ? data.circuit[0] : data.circuit
  if (!c) return null
  return {
    circuitId: c.circuitId ?? circuitId,
    circuitName: c.circuitName,
    url: c.url,
    Location: { locality: c.city, country: c.country },
    // extras (not in Ergast)
    length: c.circuitLength ?? null,
    corners: c.numberOfCorners ?? null,
    lapRecord: c.lapRecord ?? null,
    firstYear: c.firstParticipationYear ?? null,
    fastestLapDriverId: c.fastestLapDriverId ?? null,
    fastestLapTeamId: c.fastestLapTeamId ?? null,
    fastestLapYear: c.fastestLapYear ?? null,
  }
}

const mapRace = (r, season) => ({
  season: String(season),
  round: String(r.round),
  raceName: cleanRaceName(r.raceName),
  date: r.schedule?.race?.date ?? r.date,
  // Mantém o "Z": o horário é UTC e remover o fuso fazia o JS interpretar como
  // horário local, errando o countdown pelo offset do aparelho (ex.: +3h no BR).
  time: (r.schedule?.race?.time ?? r.time) ?? null,
  // Agenda do fim de semana (treinos/quali/sprint) — em chaves Ergast para a
  // agenda renderizar igual aos dados da Jolpica.
  FirstPractice:    sess(r.schedule?.fp1),
  SecondPractice:   sess(r.schedule?.fp2),
  ThirdPractice:    sess(r.schedule?.fp3),
  Qualifying:       sess(r.schedule?.qualy),
  Sprint:           sess(r.schedule?.sprintRace),
  SprintQualifying: sess(r.schedule?.sprintQualy),
  Circuit: {
    circuitId: r.circuit?.circuitId,
    circuitName: r.circuit?.circuitName,
    Location: { locality: r.circuit?.city, country: r.circuit?.country },
  },
})

export async function getCalendar(season = 'current') {
  const data = await get(`/${season}`)
  const yr = data.season ?? season
  return (data.races ?? []).map(r => mapRace(r, yr))
}

// --- Race results by round (Ergast Race shape with .Results[]) ---------------
function mapRaceResultItem(res, fastestTime) {
  const fl = res.fastLap || null
  return {
    position: String(res.position),
    points: String(res.points ?? 0),
    grid: String(res.grid ?? ''),
    status: res.retired ? String(res.retired) : 'Finished',
    Time: res.time ? { time: String(res.time) } : undefined,
    FastestLap: fl ? { rank: fl === fastestTime ? '1' : '0', Time: { time: fl } } : undefined,
    Driver: mapDriver(res.driver),
    Constructor: mapConstructor(res.team?.teamId, res.team?.teamName, res.team?.nationality),
  }
}

export async function getRaceResults(season, round) {
  const data = await get(`/${season}/${round}/race`)
  const r = Array.isArray(data.races) ? data.races[0] : data.races
  if (!r) return null
  const results = r.results ?? []
  // f1api gives each driver's fastest lap but no FL rank — derive it.
  const laps = results.map(x => x.fastLap).filter(Boolean)
  const fastest = laps.length ? laps.reduce((a, b) => (a < b ? a : b)) : null
  return {
    season: String(data.season ?? season),
    round: String(r.round ?? round),
    raceName: cleanRaceName(r.raceName),
    date: r.date,
    Circuit: {
      circuitId: r.circuit?.circuitId,
      circuitName: r.circuit?.circuitName,
      Location: { locality: r.circuit?.city, country: r.circuit?.country },
    },
    Results: results.map(res => mapRaceResultItem(res, fastest)),
  }
}

// --- Qualifying by round (Ergast shape with .QualifyingResults[]) -------------
export async function getQualifyingResults(season, round) {
  const data = await get(`/${season}/${round}/qualy`)
  const r = Array.isArray(data.races) ? data.races[0] : data.races
  if (!r) return null
  return {
    season: String(data.season ?? season),
    round: String(r.round ?? round),
    raceName: cleanRaceName(r.raceName),
    Circuit: {
      circuitId: r.circuit?.circuitId,
      circuitName: r.circuit?.circuitName,
      Location: { locality: r.circuit?.city, country: r.circuit?.country },
    },
    QualifyingResults: (r.qualyResults ?? []).map(q => ({
      position: String(q.gridPosition ?? ''),
      Q1: q.q1 ?? '',
      Q2: q.q2 ?? '',
      Q3: q.q3 ?? '',
      Driver: mapDriver(q.driver),
      Constructor: mapConstructor(q.team?.teamId, q.team?.teamName, q.team?.nationality),
    })),
  }
}

// --- Single driver bio (Ergast Driver shape) ---------------------------------
export async function getDriverInfo(driverId) {
  const data = await get(`/drivers/${driverId}`)
  const d = Array.isArray(data.driver) ? data.driver[0] : data.driver
  if (!d) return null
  return { ...mapDriver(d), dateOfBirth: d.birthday, url: d.url }
}

// --- A driver's results for one season (Ergast Races[] with .Results[0]) ------
// f1api returns driver/team at the top level and per-race {race, result}.
export async function getDriverResults(driverId, season = 'current') {
  const data = await get(`/${season}/drivers/${driverId}`)
  const Driver = data.driver ? mapDriver(data.driver) : undefined
  const Constructor = data.team
    ? mapConstructor(data.team.teamId, data.team.teamName, data.team.country)
    : undefined
  return (data.results ?? []).map(({ race: r, result: res }) => ({
    season: String(data.season ?? season),
    round: String(r?.round ?? ''),
    raceName: cleanRaceName(r?.name ?? r?.raceName),
    date: r?.date,
    Circuit: {
      circuitId: r?.circuit?.circuitId,
      Location: { locality: r?.circuit?.city, country: r?.circuit?.country },
    },
    Results: [{
      position: String(res?.finishingPosition ?? ''),
      points: String(res?.pointsObtained ?? 0),
      grid: String(res?.gridPosition ?? ''),
      status: res?.retired ? String(res.retired) : 'Finished',
      Time: res?.raceTime ? { time: String(res.raceTime) } : undefined,
      Driver,
      Constructor,
    }],
  }))
}

export async function getLastRaceResults() {
  const data = await get('/current/last/race')
  const r = Array.isArray(data.races) ? data.races[0] : data.races
  if (!r) return null
  return {
    season: String(data.season ?? ''),
    round: String(r.round ?? ''),
    raceName: cleanRaceName(r.raceName),
    date: r.schedule?.race?.date ?? r.date,
    Circuit: {
      circuitId: r.circuit?.circuitId,
      circuitName: r.circuit?.circuitName,
      Location: { locality: r.circuit?.city, country: r.circuit?.country },
    },
    Results: (r.results ?? []).map(res => ({
      position: String(res.position),
      points: String(res.points ?? 0),
      grid: String(res.grid ?? ''),
      Driver: mapDriver(res.driver),
      Constructor: mapConstructor(res.team?.teamId, res.team?.teamName, res.team?.nationality),
    })),
  }
}
