// Cliente do feed AO VIVO oficial da F1, via /api/live (serverless no Vercel,
// plugin do Vite em dev). Aqui só normalizamos o snapshot cru do SignalR num
// modelo limpo para a UI. Ver api/_f1live.mjs para o lado servidor.

export async function getLiveSnapshot() {
  const res = await fetch('/api/live', { signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`/api/live → ${res.status}`)
  return res.json()
}

// --- Códigos de minisetor (segments) ---------------------------------------
// 2064 = roxo (melhor geral) · 2051/2052 = verde (melhor pessoal) ·
// 2049 = amarelo (volta normal) · 2048/0 = ainda não percorrido.
export function segTone(status) {
  if (status === 2064) return 'purple'
  if (status === 2051 || status === 2052) return 'green'
  if (status === 2049) return 'yellow'
  return 'none'
}

// --- Bandeira / status de pista (TrackStatus.Status) ------------------------
const TRACK = {
  '1': { code: 'GREEN', label: 'Pista Liberada', color: '#22c55e' },
  '2': { code: 'YELLOW', label: 'Bandeira Amarela', color: '#eab308' },
  '3': { code: 'YELLOW', label: 'Bandeira Amarela', color: '#eab308' },
  '4': { code: 'SC', label: 'Safety Car', color: '#f97316' },
  '5': { code: 'RED', label: 'Bandeira Vermelha', color: '#ef4444' },
  '6': { code: 'VSC', label: 'Virtual Safety Car', color: '#f59e0b' },
  '7': { code: 'VSC', label: 'VSC Encerrando', color: '#f59e0b' },
}
export function trackStatusOf(ts) {
  return TRACK[String(ts?.Status)] || { code: 'UNKNOWN', label: ts?.Message || '—', color: '#888' }
}

const PART_LABEL = { 1: 'Q1', 2: 'Q2', 3: 'Q3' }

// Gap ao líder / ao carro à frente — funciona em quali (Stats por segmento) e
// corrida (GapToLeader / IntervalToPositionAhead diretos na linha).
function gapToLeader(line) {
  if (line.GapToLeader) return line.GapToLeader
  const stats = Array.isArray(line.Stats) ? line.Stats : []
  for (let i = stats.length - 1; i >= 0; i--) if (stats[i]?.TimeDiffToFastest) return stats[i].TimeDiffToFastest
  return ''
}
function gapToAhead(line) {
  if (line.IntervalToPositionAhead?.Value) return line.IntervalToPositionAhead.Value
  const stats = Array.isArray(line.Stats) ? line.Stats : []
  for (let i = stats.length - 1; i >= 0; i--) if (stats[i]?.TimeDifftoPositionAhead) return stats[i].TimeDifftoPositionAhead
  return ''
}

function asArray(x) { return Array.isArray(x) ? x : x && typeof x === 'object' ? Object.values(x) : [] }

// Snapshot cru → modelo de UI.
export function normalizeLive(snapshot) {
  if (!snapshot) return null
  const si = snapshot.SessionInfo || {}
  const dl = snapshot.DriverList || {}
  const td = snapshot.TimingData?.Lines || {}
  const tstats = snapshot.TimingStats?.Lines || {}
  const tapp = snapshot.TimingAppData?.Lines || {}
  const clock = snapshot.ExtrapolatedClock || {}
  const lapCount = snapshot.LapCount || null
  const part = snapshot.TopThree?.SessionPart ?? asArray(snapshot.SessionData?.Series).at(-1)?.QualifyingPart ?? 0

  const drivers = Object.keys(td).filter(n => n !== '_kf').map(num => {
    const line = td[num] || {}
    const d = dl[num] || {}
    const st = tstats[num] || {}
    const stint = (tapp[num]?.Stints || []).at(-1) || {}
    return {
      num,
      pos: parseInt(line.Position, 10) || 999,
      tla: d.Tla || num,
      name: d.FullName || d.BroadcastName || `#${num}`,
      lastName: d.LastName || d.BroadcastName || '',
      team: d.TeamName || '',
      color: d.TeamColour ? `#${d.TeamColour}` : '#8a8a8a',
      headshot: d.HeadshotUrl || null,
      bestLap: line.BestLapTime?.Value || '',
      lastLap: {
        value: line.LastLapTime?.Value || '',
        personalBest: !!line.LastLapTime?.PersonalFastest,
        overallBest: !!line.LastLapTime?.OverallFastest,
      },
      gapToLeader: gapToLeader(line),
      gapToAhead: gapToAhead(line),
      sectors: asArray(line.Sectors).map(s => ({
        value: s.Value || '',
        personalBest: !!s.PersonalFastest,
        overallBest: !!s.OverallFastest,
        segments: asArray(s.Segments).map(seg => segTone(seg?.Status)),
      })),
      bestSectors: asArray(st.BestSectors).map(b => b?.Value || ''),
      speedTrap: line.Speeds?.ST?.Value || '',
      speedTrapBest: !!line.Speeds?.ST?.OverallFastest,
      tyre: stint.Compound || null,
      tyreNew: stint.New === 'true' || stint.New === true,
      tyreAge: stint.TotalLaps ?? null,
      inPit: !!line.InPit,
      pitOut: !!line.PitOut,
      stopped: !!line.Stopped,
      retired: !!line.Retired,
      knockedOut: !!line.KnockedOut,
      cutoff: !!line.Cutoff,
      laps: line.NumberOfLaps ?? null,
    }
  }).sort((a, b) => a.pos - b.pos)

  const w = snapshot.WeatherData || {}
  const weather = {
    airTemp: w.AirTemp, trackTemp: w.TrackTemp, humidity: w.Humidity,
    pressure: w.Pressure, rainfall: w.Rainfall, windSpeed: w.WindSpeed,
    windDirection: w.WindDirection,
  }

  const raceControl = asArray(snapshot.RaceControlMessages?.Messages)
    .map(m => ({ utc: m.Utc, message: m.Message, flag: m.Flag, category: m.Category, scope: m.Scope, lap: m.Lap }))
    .sort((a, b) => new Date(b.utc) - new Date(a.utc))

  const radioBase = `https://livetiming.formula1.com/static/${si.Path || ''}`
  const teamRadio = asArray(snapshot.TeamRadio?.Captures)
    .map(c => ({
      utc: c.Utc, num: c.RacingNumber,
      tla: dl[c.RacingNumber]?.Tla || c.RacingNumber,
      color: dl[c.RacingNumber]?.TeamColour ? `#${dl[c.RacingNumber].TeamColour}` : '#888',
      url: radioBase + c.Path,
    }))
    .sort((a, b) => new Date(b.utc) - new Date(a.utc))

  return {
    session: {
      gp: si.Meeting?.Name || '',
      official: si.Meeting?.OfficialName || '',
      location: si.Meeting?.Location || '',
      country: si.Meeting?.Country?.Code || '',
      circuit: si.Meeting?.Circuit?.ShortName || '',
      name: si.Name || '',
      type: si.Type || '',
      status: snapshot.SessionStatus?.Status || si.SessionStatus || '',
      remaining: clock.Remaining || null,
      extrapolating: !!clock.Extrapolating,
      clockUtc: clock.Utc || null,
      part, partLabel: PART_LABEL[part] || null,
      lap: lapCount ? Number(lapCount.CurrentLap) : null,
      totalLaps: lapCount ? Number(lapCount.TotalLaps) : null,
      track: trackStatusOf(snapshot.TrackStatus),
    },
    drivers,
    weather,
    raceControl,
    teamRadio,
    pitTimes: snapshot.PitLaneTimeCollection?.PitTimes || {},
  }
}
