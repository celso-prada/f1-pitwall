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

export function getNextRace(races) {
  const now = Date.now()
  // A corrida continua sendo "a próxima" até o horário REAL de largada (não só
  // até a meia-noite do dia), para o countdown poder chegar a zero no dia.
  return races.find(r => new Date(`${r.date}T${r.time ?? '23:59:59'}`).getTime() >= now) ?? races.at(-1)
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
