export function formatGap(val) {
  if (val === null || val === undefined) return '—'
  if (val === 0 || val === '0' || val === 0.0) return 'LÍDER'
  if (typeof val === 'string') return val
  return `+${val.toFixed(3)}s`
}

export function formatInterval(val) {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'string') {
    if (val.includes('LAP') || val.includes('lap')) return val
    const n = parseFloat(val)
    if (!isNaN(n)) return `+${n.toFixed(3)}s`
    return val
  }
  return `+${val.toFixed(3)}s`
}

export function formatLapTime(ms) {
  if (!ms) return '—'
  const totalSec = ms / 1000
  const min = Math.floor(totalSec / 60)
  const sec = (totalSec % 60).toFixed(3).padStart(6, '0')
  return `${min}:${sec}`
}

export function formatPitDuration(sec) {
  if (!sec) return '—'
  return `${sec.toFixed(1)}s`
}

export function formatWindDir(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW']
  return dirs[Math.round(deg / 45) % 8]
}

export function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatTime(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function getCountdown(dateStr) {
  const now = Date.now()
  const target = new Date(dateStr).getTime()
  const diff = target - now
  if (diff <= 0) return null
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return { d, h, m, s, diff }
}

// Unidades visíveis do countdown: descarta as unidades-zero do topo
// (dias → horas → min → seg), mantendo sempre ao menos os segundos. Assim,
// faltando 0 dias mostra h:m:s; faltando 0 horas mostra m:s; no fim, só seg.
export function countdownUnits(c) {
  if (!c) return []
  const units = [
    { v: c.d, label: 'Dias', short: 'd' },
    { v: c.h, label: 'Horas', short: 'h' },
    { v: c.m, label: 'Min', short: 'm' },
    { v: c.s, label: 'Seg', short: 's' },
  ]
  let start = 0
  while (start < units.length - 1 && units[start].v === 0) start++
  return units.slice(start)
}

// Monta o instante da corrida em ISO SEMPRE em UTC. A Jolpica dá o horário com
// "Z" (ex.: "13:00:00Z"); o fallback f1api.dev às vezes vem sem. Uma string de
// data-hora SEM fuso é interpretada pelo JS como horário LOCAL do dispositivo,
// então o countdown errava pelo offset do aparelho (ex.: +3h no Brasil) e ficava
// inconsistente entre fontes/celulares. Aqui garantimos o "Z" quando falta.
export function raceISO(date, time, fallback = '00:00:00') {
  if (!date) return null
  const t = time || fallback
  const hasTz = /(Z|[+-]\d{2}:?\d{2})$/.test(t)
  return `${date}T${hasTz ? t : `${t}Z`}`
}

// Janela após a largada em que a corrida ainda conta como "a atual" — cobre a
// transmissão ao vivo (corrida ~2h + atrasos/bandeira vermelha + pódio). Só
// DEPOIS dela o sistema aponta para a próxima. Assim, em dia de corrida, o
// calendário e o cronômetro seguem na corrida atual até a transmissão acabar.
export const RACE_BROADCAST_MS = 4 * 60 * 60 * 1000

// Fim estimado da transmissão da corrida (largada + janela). NaN se não dá pra
// montar a data.
export function raceEndMs(race) {
  if (!race?.date) return NaN
  const start = new Date(raceISO(race.date, race.time, '23:59:59')).getTime()
  return isNaN(start) ? NaN : start + RACE_BROADCAST_MS
}

// A corrida (e sua transmissão) já terminou?
export function isRaceOver(race, now = Date.now()) {
  const end = raceEndMs(race)
  return !isNaN(end) && end < now
}

// A largada da corrida já aconteceu? (independe da janela de transmissão.)
export function raceStarted(race, now = Date.now()) {
  if (!race?.date) return false
  const start = new Date(raceISO(race.date, race.time, '23:59:59')).getTime()
  return !isNaN(start) && start <= now
}

// `liveRaceFinished`: a bandeira quadriculada já foi confirmada pelo feed oficial
// ao vivo (ver HomePage/Header). Quando verdadeiro, encerramos a corrida que já
// largou ASSIM QUE a transmissão termina, sem esperar a janela fixa de 4h
// (RACE_BROADCAST_MS) expirar — aí o alvo passa para a próxima corrida e o
// countdown recomeça. Sem esse sinal caímos só na janela de tempo, como antes.
export function getNextRace(races, { now = Date.now(), liveRaceFinished = false } = {}) {
  // "A próxima" segue sendo a corrida ATUAL durante toda a transmissão ao vivo;
  // só depois que ela acaba é que apontamos para a seguinte. O countdown chega a
  // zero na largada (vira "ao vivo") e só troca de alvo quando a corrida termina.
  return (races ?? []).find(r => {
    if (isRaceOver(r, now)) return false
    // Bandeirada confirmada: a corrida já largou e o feed parou de transmitir →
    // trata como encerrada mesmo dentro da janela de 4h.
    if (liveRaceFinished && raceStarted(r, now)) return false
    return true
  }) ?? (races ?? []).at(-1)
}

// Última corrida JÁ FINALIZADA (maior round concluído). Uma corrida conta como
// concluída quando passou a janela de transmissão (isRaceOver) OU quando o feed
// oficial confirmou a bandeirada (liveRaceFinished, só vale para a que já
// largou). Usado para detectar quando os endpoints AGREGADOS da Jolpica estão
// atrasados em relação ao que já correu (ver o "bridge" em useStandings).
export function latestCompletedRound(races, { now = Date.now(), liveRaceFinished = false } = {}) {
  let best = null
  for (const r of races ?? []) {
    const done = isRaceOver(r, now) || (liveRaceFinished && raceStarted(r, now))
    if (!done) continue
    const round = parseInt(r.round, 10)
    if (!isNaN(round) && (!best || round > best.round)) best = { ...r, round }
  }
  return best
}

export function isToday(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const now = new Date()
  return now.getFullYear() === y && now.getMonth() + 1 === m && now.getDate() === d
}

export function positionSuffix(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}
