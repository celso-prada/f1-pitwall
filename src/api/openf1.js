const BASE = 'https://api.openf1.org/v1'

async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`OpenF1 ${path} → ${res.status}`)
  return res.json()
}

export async function getLatestSession() {
  const data = await get('/sessions?session_type=Race&year=2025')
  return data.at(-1) ?? null
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

export async function getSessions(year = 2025) {
  return get(`/sessions?year=${year}`)
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

// Builds the current race order from position snapshots
export function buildCurrentOrder(positions) {
  const latest = {}
  for (const p of positions) {
    const key = p.driver_number
    if (!latest[key] || p.date > latest[key].date) {
      latest[key] = p
    }
  }
  return Object.values(latest).sort((a, b) => a.position - b.position)
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
