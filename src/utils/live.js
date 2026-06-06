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

// --- Decisões dos comissários / penalidades (ROADMAP 3.2) -------------------
// Extrai do log de race control as mensagens que são decisão de comissário
// (punições, investigações, advertências, tempos deletados). Fonte é o mesmo
// RaceControlMessages que já temos — sem nova dependência. Cada item recebe um
// `type` em PT-BR e, quando dá, o número do carro envolvido (mensagens vêm como
// "CAR 44 (HAM) ..."). Aceita tanto o shape normalizado do feed oficial
// ({ utc, message }) quanto o do OpenF1 ({ date, message }).
const PENALTY_RULES = [
  { type: 'Punição de tempo', tone: 'red',    re: /TIME PENALTY|\d+\s*SECOND(S)?\s+PENALTY/ },
  { type: 'Drive-through',    tone: 'red',    re: /DRIVE[-\s]?THROUGH/ },
  { type: 'Stop & go',        tone: 'red',    re: /STOP\s*(AND|\/|&)?\s*GO/ },
  { type: 'Punição de grid',  tone: 'red',    re: /GRID (PENALTY|DROP|POSITION)/ },
  { type: 'Tempo deletado',   tone: 'amber',  re: /LAP TIME DELETED|DELETED|TRACK LIMITS/ },
  { type: 'Em investigação',  tone: 'amber',  re: /UNDER INVESTIGATION|WILL BE INVESTIGATED|NOTED|UNSAFE RELEASE/ },
  { type: 'Reprimenda',       tone: 'amber',  re: /REPRIMAND/ },
  { type: 'Advertência',      tone: 'amber',  re: /BLACK AND WHITE|WARNING/ },
  { type: 'Sem ação',         tone: 'green',  re: /NO FURTHER (ACTION|INVESTIGATION)|NO ACTION|REINSTATED|REVIEWED.*NO/ },
  { type: 'Punição',          tone: 'red',    re: /PENALTY/ }, // genérico, por último
]

export function classifyPenalty(message) {
  const text = String(message ?? '').toUpperCase()
  for (const rule of PENALTY_RULES) if (rule.re.test(text)) return { type: rule.type, tone: rule.tone }
  return null
}

export function extractPenalties(messages) {
  if (!messages?.length) return []
  return messages
    .map(m => {
      const hit = classifyPenalty(m.message)
      if (!hit) return null
      const carMatch = /CAR\s+(\d+)/.exec(String(m.message ?? '').toUpperCase())
      return {
        when: m.utc ?? m.date ?? null,
        message: m.message,
        type: hit.type,
        tone: hit.tone,
        car: carMatch ? carMatch[1] : null,
        lap: m.lap ?? null,
      }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.when) - new Date(a.when))
}

// --- Estratégia ao vivo: undercut/overcut + janela de pit (ROADMAP 5.2) ------
// Tudo ESTIMATIVA, a partir do que a torre já tem (pneu, idade, gap ao da
// frente). Vida típica por composto (voltas) — base só para sinalizar a janela.
export const TYRE_LIFE = { SOFT: 18, MEDIUM: 28, HARD: 40 }

// "+1.234" / "1,234" → 1.234 · "+1 LAP" / "1L" → null (lapeado, sem undercut).
export function parseGapSeconds(str) {
  if (str == null) return null
  const s = String(str).toUpperCase()
  if (s.includes('L')) return null
  const m = s.replace(',', '.').match(/-?\d+(\.\d+)?/)
  return m ? Math.abs(parseFloat(m[0])) : null
}

// Janela de pit estimada de um piloto pelo desgaste do composto atual.
export function pitWindow(d) {
  const life = TYRE_LIFE[String(d?.tyre ?? '').toUpperCase()]
  if (!life || d?.tyreAge == null) return null
  const remaining = life - d.tyreAge
  const state = remaining <= 0 ? 'over' : remaining <= 5 ? 'window' : 'fresh'
  return { life, age: d.tyreAge, remaining, state }
}

// Disputas próximas na pista: pares adjacentes (por posição) dentro de um gap de
// undercut. Marca DRS (≤1s) e quem TEM a ferramenta do undercut — o de trás, se
// está com pneu de vida igual/maior (mais gasto), ganha mais parando para pneu novo.
export function analyzeStrategy(drivers, { undercutGap = 2.5, drsGap = 1.0 } = {}) {
  const onTrack = (drivers ?? [])
    .filter(d => d.pos !== 999 && !d.retired && !d.knockedOut && !d.stopped)
    .sort((a, b) => a.pos - b.pos)
  const battles = []
  for (let i = 1; i < onTrack.length; i++) {
    const ahead = onTrack[i - 1]
    const behind = onTrack[i]
    const gap = parseGapSeconds(behind.gapToAhead)
    if (gap == null || gap > undercutGap) continue
    const canUndercut = behind.tyreAge != null && ahead.tyreAge != null
      ? behind.tyreAge >= ahead.tyreAge
      : null
    battles.push({
      pos: behind.pos,
      ahead: { tla: ahead.tla, color: ahead.color, tyre: ahead.tyre, age: ahead.tyreAge, inPit: !!ahead.inPit },
      behind: { tla: behind.tla, color: behind.color, tyre: behind.tyre, age: behind.tyreAge, inPit: !!behind.inPit },
      gap, drs: gap <= drsGap, canUndercut,
    })
  }
  return battles
}

// --- Final classification (OpenF1 /session_result) ---------------------------
export const QUALI_PART = ['Q1', 'Q2', 'Q3']

// Normaliza o resultado oficial numa lista pronta para exibir. Na quali,
// `duration` é um array [Q1,Q2,Q3] e o tempo que DEFINE a posição é a última
// entrada preenchida (P1-10 = Q3, P11-15 = Q2, P16-20 = Q1). Na corrida/sprint
// é um único tempo total. O gap é calculado em relação ao líder (pole/vencedor).
export function buildClassification(results) {
  if (!results?.length) return []

  const rows = results.map(r => {
    const arr = Array.isArray(r.duration) ? r.duration : null
    let timeSec = null
    let partIndex = null
    if (arr) {
      for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i] != null) { timeSec = arr[i]; partIndex = i; break }
      }
    } else if (typeof r.duration === 'number') {
      timeSec = r.duration
    }
    // gap bruto vindo da API (corrida costuma trazer número direto)
    let rawGap = null
    if (Array.isArray(r.gap_to_leader)) {
      for (let i = r.gap_to_leader.length - 1; i >= 0; i--) {
        if (r.gap_to_leader[i] != null) { rawGap = r.gap_to_leader[i]; break }
      }
    } else if (typeof r.gap_to_leader === 'number') {
      rawGap = r.gap_to_leader
    }
    return {
      position: r.position ?? null,
      num: r.driver_number,
      dnf: !!r.dnf, dns: !!r.dns, dsq: !!r.dsq,
      laps: r.number_of_laps ?? null,
      timeSec, partIndex, rawGap,
      isQuali: !!arr,
    }
  }).sort((a, b) => (a.position ?? 99) - (b.position ?? 99))

  // Tempo do líder para o gap "até a pole / vencedor".
  const leadTime = rows.find(r => r.position === 1)?.timeSec ?? rows[0]?.timeSec ?? null
  for (const r of rows) {
    if (r.position === 1) { r.gapSec = 0; continue }
    if (r.timeSec != null && leadTime != null) r.gapSec = r.timeSec - leadTime
    else if (r.rawGap != null) r.gapSec = r.rawGap
    else r.gapSec = null
  }
  return rows
}
