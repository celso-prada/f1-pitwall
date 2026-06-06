const BASE = 'https://api.openf1.org/v1'

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(12000) })
  if (!res.ok) throw new Error(`OpenF1 ${path} → ${res.status}`)
  return res.json()
}

// Most recent session OpenF1 has data for. Prefers a session that is currently
// live, otherwise the latest one to have started (any type, current year →
// previous year as fallback so the page is never empty in the off-season).
export async function getLatestSession() {
  const year = new Date().getFullYear()
  const now = Date.now()
  for (const y of [year, year - 1]) {
    const data = await get(`/sessions?year=${y}`).catch(() => [])
    if (!data.length) continue
    const started = data
      .filter(s => new Date(s.date_start).getTime() <= now)
      .sort((a, b) => new Date(a.date_start) - new Date(b.date_start))
    const live = started.find(s => new Date(s.date_end).getTime() >= now)
    if (live) return live
    if (started.length) return started.at(-1)
  }
  return null
}

export async function getSessionDrivers(sessionKey = 'latest') {
  return get(`/drivers?session_key=${sessionKey}`)
}

export async function getLivePositions(sessionKey = 'latest') {
  return get(`/position?session_key=${sessionKey}`)
}

export async function getLiveIntervals(sessionKey = 'latest') {
  return get(`/intervals?session_key=${sessionKey}`)
}

export async function getLiveWeather(sessionKey = 'latest') {
  const data = await get(`/weather?session_key=${sessionKey}`)
  return data.at(-1) ?? null
}

export async function getPitStops(sessionKey = 'latest') {
  return get(`/pit?session_key=${sessionKey}`)
}

export async function getRaceControl(sessionKey = 'latest') {
  return get(`/race_control?session_key=${sessionKey}`)
}

export async function getTeamRadio(sessionKey = 'latest') {
  return get(`/team_radio?session_key=${sessionKey}`)
}

export async function getLaps(sessionKey = 'latest', driverNumber) {
  const q = driverNumber ? `&driver_number=${driverNumber}` : ''
  return get(`/laps?session_key=${sessionKey}${q}`)
}

export async function getStints(sessionKey = 'latest') {
  return get(`/stints?session_key=${sessionKey}`)
}

// Final classification of a session (official result). For qualifying each row's
// `duration`/`gap_to_leader` is an array [Q1,Q2,Q3]; for race/sprint it is a
// single total-time / gap number. Includes dnf/dns/dsq flags and lap count.
export async function getSessionResult(sessionKey = 'latest') {
  return get(`/session_result?session_key=${sessionKey}`)
}

export async function getSessions(year = new Date().getFullYear()) {
  return get(`/sessions?year=${year}`)
}

// Fetch all sessions for a specific circuit in a given year.
// circuitShortName must match OpenF1's circuit_short_name exactly.
// Returns [] when the circuit/year is not in OpenF1 (pre-2023 seasons).
export async function getCircuitSessions(year, circuitShortName) {
  if (!circuitShortName) return []
  try {
    const res = await fetch(
      `${BASE}/sessions?year=${year}&circuit_short_name=${encodeURIComponent(circuitShortName)}`,
      { signal: AbortSignal.timeout(6000) }
    )
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data)
      ? data
          .filter(s => ['Practice', 'Qualifying', 'Sprint', 'Race'].includes(s.session_type))
          .sort((a, b) => new Date(a.date_start) - new Date(b.date_start))
      : []
  } catch {
    return []
  }
}

// Build latest stint per driver (current compound + lap age)
export function buildCurrentStints(stints) {
  const latest = {}
  for (const s of stints) {
    const key = s.driver_number
    if (!latest[key] || s.stint_number > latest[key].stint_number) {
      latest[key] = s
    }
  }
  return latest
}

// Build latest lap time per driver
export function buildLatestLaps(laps) {
  const latest = {}
  for (const l of laps) {
    const key = l.driver_number
    if (!latest[key] || l.lap_number > latest[key].lap_number) {
      latest[key] = l
    }
  }
  return latest
}

export async function getDriverPhotoMap() {
  const drivers = await getSessionDrivers('latest')
  const map = {}
  for (const d of drivers) {
    if (d.name_acronym && d.headshot_url) map[d.name_acronym] = d.headshot_url
  }
  return map
}

// Builds the current race order from position snapshots, annotating each driver
// with `delta` = places gained (+) or lost (−) since their first recorded
// position, the way a broadcast timing tower shows ▲/▼ next to the position.
export function buildCurrentOrder(positions) {
  const latest = {}
  const first = {}
  for (const p of positions) {
    const key = p.driver_number
    if (!latest[key] || p.date > latest[key].date) latest[key] = p
    if (!first[key] || p.date < first[key].date) first[key] = p
  }
  return Object.values(latest)
    .map(p => ({ ...p, delta: (first[p.driver_number]?.position ?? p.position) - p.position }))
    .sort((a, b) => a.position - b.position)
}

// Gets latest interval per driver
export function buildLatestIntervals(intervals) {
  const latest = {}
  for (const i of intervals) {
    const key = i.driver_number
    if (!latest[key] || i.date > latest[key].date) {
      latest[key] = i
    }
  }
  return latest
}
