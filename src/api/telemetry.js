// Telemetry data layer — built on OpenF1's car_data + laps + sessions.
// Kept separate from openf1.js so the whole "Telemetria" menu stays self-contained
// and can be removed in one shot. Nothing here is imported by the original app.

const BASE = 'https://api.openf1.org/v1'

async function get(path, { timeout = 15000 } = {}) {
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(timeout) })
  if (!res.ok) throw new Error(`OpenF1 ${path} → ${res.status}`)
  return res.json()
}

// All real sessions (Practice/Qualifying/Sprint/Race) for a year, newest first.
// Falls back to the previous year in the off-season so the selector is never empty.
export async function getSeasonSessions() {
  const year = new Date().getFullYear()
  const now = Date.now()
  for (const y of [year, year - 1]) {
    const data = await get(`/sessions?year=${y}`).catch(() => [])
    const sessions = (Array.isArray(data) ? data : [])
      .filter(s =>
        ['Practice', 'Qualifying', 'Sprint', 'Race'].includes(s.session_type) &&
        new Date(s.date_start).getTime() <= now,
      )
      .sort((a, b) => new Date(b.date_start) - new Date(a.date_start))
    if (sessions.length) return sessions
  }
  return []
}

export async function getDrivers(sessionKey) {
  if (!sessionKey) return []
  return get(`/drivers?session_key=${sessionKey}`).catch(() => [])
}

// Raw laps for one driver in a session.
export async function getDriverLaps(sessionKey, driverNumber) {
  if (!sessionKey || driverNumber == null) return []
  return get(`/laps?session_key=${sessionKey}&driver_number=${driverNumber}`).catch(() => [])
}

// Picks a driver's fastest valid lap (smallest lap_duration with a start time we
// can use to window the car telemetry).
export function fastestLap(laps) {
  let best = null
  for (const l of laps) {
    if (l.lap_duration > 0 && l.date_start && (!best || l.lap_duration < best.lap_duration)) {
      best = l
    }
  }
  return best
}

// car_data samples (~3.7 Hz) for the window of a single lap, normalised to
// elapsed seconds from the lap start so two drivers' laps can be overlaid.
// OpenF1 supports comparison operators directly in the query string (date>=…).
export async function getLapTelemetry(sessionKey, driverNumber, lap) {
  if (!sessionKey || driverNumber == null || !lap?.date_start) return []
  const start = new Date(lap.date_start).getTime()
  const end = start + lap.lap_duration * 1000 + 500 // small tail so we reach the line
  const endISO = new Date(end).toISOString()
  // Encode the date VALUES (the "+00:00" offset would otherwise be read as a
  // space) but leave the >= / < operators raw so OpenF1 parses them as filters.
  const path =
    `/car_data?session_key=${sessionKey}&driver_number=${driverNumber}` +
    `&date>=${encodeURIComponent(lap.date_start)}&date<${encodeURIComponent(endISO)}`
  const rows = await get(path, { timeout: 20000 }).catch(() => [])
  return (Array.isArray(rows) ? rows : [])
    .map(r => ({
      t: +(((new Date(r.date).getTime() - start) / 1000).toFixed(2)),
      speed: r.speed ?? null,
      throttle: r.throttle ?? null,
      brake: r.brake ?? null,
      gear: r.n_gear ?? null,
      rpm: r.rpm ?? null,
      drs: r.drs ?? 0,
    }))
    .filter(r => r.t >= 0)
    .sort((a, b) => a.t - b.t)
}

// DRS codes in OpenF1: 0/1 = off, ≥8 = a DRS-open state (8/10/12/14).
export const drsOn = code => Number(code) >= 8

// --- Delta volta-a-volta + degradação de pneu (ROADMAP 4.3) ------------------
// Mapa lap_number → lap_duration de voltas "limpas" (sem pit-out / inválidas).
function cleanLapMap(laps) {
  const m = new Map()
  for (const l of laps ?? []) {
    if (!l.lap_duration || l.lap_duration <= 0 || l.is_pit_out_lap) continue
    m.set(l.lap_number, l.lap_duration)
  }
  return m
}

// Delta acumulado entre dois pilotos volta a volta. Em cada volta que ambos
// completaram, soma (durA − durB). Positivo = A está perdendo tempo para B.
// Só voltas em comum entram, então pit-stops de um não distorcem o outro.
export function lapDeltaSeries(lapsA, lapsB) {
  const a = cleanLapMap(lapsA)
  const b = cleanLapMap(lapsB)
  const laps = [...a.keys()].filter(n => b.has(n)).sort((x, y) => x - y)
  let acc = 0
  const data = []
  for (const lap of laps) {
    acc += a.get(lap) - b.get(lap)
    data.push({ lap, delta: +acc.toFixed(3) })
  }
  return data
}

// Regressão linear simples (mínimos quadrados) → coeficiente angular (s/volta).
function slope(points) {
  const n = points.length
  if (n < 2) return null
  let sx = 0, sy = 0, sxy = 0, sxx = 0
  for (const [x, y] of points) { sx += x; sy += y; sxy += x * y; sxx += x * x }
  const denom = n * sxx - sx * sx
  if (denom === 0) return null
  return (n * sxy - sx * sy) / denom
}

// Quebra as voltas em stints (limites pelo pit-out) e mede a degradação de cada
// um: a inclinação do tempo de volta ao longo do stint (s/volta). Voltas muito
// fora do ritmo (SC/tráfego) são descartadas para a tendência não distorcer.
export function stintDegradation(laps) {
  const sorted = [...(laps ?? [])].filter(l => l.lap_number != null).sort((a, b) => a.lap_number - b.lap_number)
  const stints = []
  let cur = null
  for (const l of sorted) {
    if (l.is_pit_out_lap || !cur) { cur = []; stints.push(cur) }
    if (l.lap_duration > 0 && !l.is_pit_out_lap) cur.push(l)
  }
  return stints
    .map((laps, i) => {
      const valid = laps.filter(l => l.lap_duration > 0)
      if (valid.length < 3) return null
      const min = Math.min(...valid.map(l => l.lap_duration))
      const kept = valid.filter(l => l.lap_duration <= min + 5) // tira SC/tráfego
      const pts = kept.map(l => [l.lap_number, l.lap_duration])
      const deg = slope(pts)
      if (deg == null) return null
      return {
        stint: i + 1,
        startLap: kept[0].lap_number,
        endLap: kept.at(-1).lap_number,
        laps: kept.length,
        degPerLap: +deg.toFixed(3),
      }
    })
    .filter(Boolean)
}

// Derived single-lap performance stats for the summary cards.
export function lapStats(samples) {
  if (!samples?.length) return null
  let vmax = 0
  let fullThrottle = 0
  let braking = 0
  let drsCount = 0
  let gearSum = 0
  let gearN = 0
  for (const s of samples) {
    if (s.speed > vmax) vmax = s.speed
    if (s.throttle >= 99) fullThrottle++
    if (s.brake >= 50) braking++
    if (drsOn(s.drs)) drsCount++
    if (s.gear > 0) { gearSum += s.gear; gearN++ }
  }
  const n = samples.length
  return {
    vmax,
    fullThrottlePct: Math.round((fullThrottle / n) * 100),
    brakingPct: Math.round((braking / n) * 100),
    drsPct: Math.round((drsCount / n) * 100),
    avgGear: gearN ? +(gearSum / gearN).toFixed(1) : 0,
  }
}
