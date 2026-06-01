// Fallback data source — f1api.dev — used when Jolpica/Ergast (api.jolpi.ca) is
// unreachable. Maps f1api.dev responses into the Ergast/Jolpica shape the app
// already consumes, so components need no changes.
const BASE = 'https://f1api.dev/api'

async function get(path, ms = 12000) {
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(ms) })
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

const mapDriver = d => ({
  driverId: d.driverId,
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
    Driver: mapDriver(s.driver),
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

const mapRace = (r, season) => ({
  season: String(season),
  round: String(r.round),
  raceName: r.raceName,
  date: r.schedule?.race?.date ?? r.date,
  time: (r.schedule?.race?.time ?? r.time)?.replace('Z', '') ?? null,
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

export async function getLastRaceResults() {
  const data = await get('/current/last/race')
  const r = Array.isArray(data.races) ? data.races[0] : data.races
  if (!r) return null
  return {
    season: String(data.season ?? ''),
    round: String(r.round ?? ''),
    raceName: r.raceName,
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
