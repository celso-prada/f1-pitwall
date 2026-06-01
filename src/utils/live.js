// Presentation helpers for the live (pit wall) view. Pure functions over the
// OpenF1 payloads — no fetching here.

// --- Tyre compounds ----------------------------------------------------------
export const COMPOUND = {
  SOFT:         { label: 'S', color: '#e10600', name: 'Macio' },
  MEDIUM:       { label: 'M', color: '#ffd700', name: 'Médio' },
  HARD:         { label: 'H', color: '#e8e8e8', name: 'Duro', dark: true },
  INTERMEDIATE: { label: 'I', color: '#00d632', name: 'Intermediário' },
  WET:          { label: 'W', color: '#0066ff', name: 'Chuva' },
}
export const tyreOf = c => COMPOUND[String(c ?? '').toUpperCase()] ?? { label: c?.[0] ?? '?', color: '#666', name: c ?? '—' }

// --- Track status (derived from race control log) ----------------------------
// Walks the message log chronologically and reduces to the current track state,
// the same hierarchy a TV banner shows: chequered > red > SC/VSC > yellow > green.
export const TRACK_STATUS = {
  GREEN:     { code: 'GREEN',     label: 'Pista Liberada',   color: '#22c55e' },
  YELLOW:    { code: 'YELLOW',    label: 'Bandeira Amarela', color: '#eab308' },
  VSC:       { code: 'VSC',       label: 'Virtual Safety Car', color: '#f59e0b' },
  SC:        { code: 'SC',        label: 'Safety Car',       color: '#f97316' },
  RED:       { code: 'RED',       label: 'Bandeira Vermelha', color: '#ef4444' },
  CHEQUERED: { code: 'CHEQUERED', label: 'Bandeirada',       color: '#e8e8e8' },
  UNKNOWN:   { code: 'UNKNOWN',   label: '—',                color: '#666' },
}

export function deriveTrackStatus(messages) {
  if (!messages?.length) return TRACK_STATUS.UNKNOWN
  const sorted = [...messages].sort((a, b) => new Date(a.date) - new Date(b.date))
  let sc = null            // 'SC' | 'VSC' | null
  let red = false
  let chequered = false
  let yellow = 0           // count of open sector yellows

  for (const m of sorted) {
    const text = (m.message ?? '').toUpperCase()
    const cat = m.category
    const flag = m.flag

    if (cat === 'SafetyCar') {
      if (text.includes('DEPLOYED')) sc = text.includes('VIRTUAL') ? 'VSC' : 'SC'
      else if (text.includes('IN THIS LAP') || text.includes('ENDING') || text.includes('IN PIT')) sc = null
    }
    if (flag === 'RED' || text.includes('RED FLAG')) red = true
    if (flag === 'GREEN' || text.includes('GREEN LIGHT') || text.includes('TRACK CLEAR')) { red = false }
    if (flag === 'CHEQUERED') chequered = true
    if (cat === 'SessionStatus') {
      if (text.includes('FINISH')) chequered = true
      if (text.includes('STARTED')) { red = false; chequered = false }
    }
    // sector yellows: YELLOW opens, CLEAR/GREEN closes
    if (flag === 'YELLOW' || flag === 'DOUBLE YELLOW') yellow++
    if (flag === 'CLEAR' || flag === 'GREEN') yellow = Math.max(0, yellow - 1)
  }

  if (chequered) return TRACK_STATUS.CHEQUERED
  if (red) return TRACK_STATUS.RED
  if (sc === 'SC') return TRACK_STATUS.SC
  if (sc === 'VSC') return TRACK_STATUS.VSC
  if (yellow > 0) return TRACK_STATUS.YELLOW
  return TRACK_STATUS.GREEN
}

// --- Lap timing --------------------------------------------------------------
// Returns latest valid lap per driver + session best + each driver's personal
// best, so the tower can colour a last lap purple (overall) / green (personal).
export function buildLapInfo(laps) {
  if (!laps?.length) return { byDriver: {}, sessionBest: null, personalBest: {} }
  const latest = {}
  const personalBest = {}
  let sessionBest = null

  for (const l of laps) {
    const n = l.driver_number
    const dur = l.lap_duration
    if (!latest[n] || l.lap_number > latest[n].lap_number) latest[n] = l
    if (dur && dur > 0) {
      if (personalBest[n] == null || dur < personalBest[n]) personalBest[n] = dur
      if (sessionBest == null || dur < sessionBest) sessionBest = dur
    }
  }
  return { byDriver: latest, sessionBest, personalBest }
}

const EPS = 0.0005
// 'overall' (purple) | 'personal' (green) | 'normal'
export function lapTone(dur, num, lapInfo) {
  if (!dur || dur <= 0) return 'normal'
  if (lapInfo.sessionBest != null && Math.abs(dur - lapInfo.sessionBest) < EPS) return 'overall'
  if (lapInfo.personalBest[num] != null && Math.abs(dur - lapInfo.personalBest[num]) < EPS) return 'personal'
  return 'normal'
}

export const LAP_TONE_COLOR = { overall: '#b14be8', personal: '#22c55e', normal: 'var(--color-text)' }

export function fmtLap(dur) {
  if (!dur || dur <= 0) return '—'
  const m = Math.floor(dur / 60)
  const s = (dur % 60).toFixed(3).padStart(6, '0')
  return m > 0 ? `${m}:${s}` : s
}

// Current lap number across the field (for the "VOLTA n" counter).
export function currentLap(laps) {
  if (!laps?.length) return null
  return laps.reduce((max, l) => Math.max(max, l.lap_number ?? 0), 0) || null
}
