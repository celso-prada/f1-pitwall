// Funções puras para o head-to-head de pilotos (ROADMAP 6.1). Operam sobre o
// array de corridas da Jolpica/f1api (cada corrida traz Results[0] do piloto):
// { round, raceName, Results: [{ position, grid, points, status }] }.

function res(race) {
  return race?.Results?.[0] ?? null
}
function posNum(r) {
  const n = parseInt(r?.position, 10)
  return isNaN(n) ? null : n
}
function gridNum(r) {
  const n = parseInt(r?.grid, 10)
  return isNaN(n) ? null : n
}
// "Finished" ou "+1 Lap" = completou; o resto (Accident, Engine, Retired…) = DNF.
function isDNF(r) {
  const s = String(r?.status ?? '')
  return !(s === 'Finished' || /^\+\d+\s+Lap/.test(s))
}

export function summarizeSeason(races) {
  const list = races ?? []
  let wins = 0, podiums = 0, points = 0, poles = 0, dnfs = 0, finishes = 0, sumFinish = 0
  let best = null
  for (const race of list) {
    const r = res(race)
    if (!r) continue
    const p = posNum(r)
    points += parseFloat(r.points) || 0
    if (gridNum(r) === 1) poles++
    if (isDNF(r)) dnfs++
    if (p != null) {
      if (p === 1) wins++
      if (p <= 3) podiums++
      if (best == null || p < best) best = p
      finishes++
      sumFinish += p
    }
  }
  return {
    races: list.length,
    wins, podiums, poles, dnfs,
    points: Math.round(points * 100) / 100,
    bestFinish: best,
    avgFinish: finishes ? Math.round((sumFinish / finishes) * 10) / 10 : null,
  }
}

// Confronto direto corrida a corrida nos rounds em que AMBOS correram. "Ahead"
// usa a posição final; o quali usa o grid. Empate só quando um (ou ambos) não
// tem posição classificável naquela corrida.
export function headToHead(racesA, racesB) {
  const byRoundB = new Map((racesB ?? []).map(r => [String(r.round), r]))
  let raceA = 0, raceB = 0, qualiA = 0, qualiB = 0, shared = 0
  for (const ra of racesA ?? []) {
    const rb = byRoundB.get(String(ra.round))
    if (!rb) continue
    shared++
    const pa = posNum(res(ra)), pb = posNum(res(rb))
    if (pa != null && pb != null) { if (pa < pb) raceA++; else if (pb < pa) raceB++ }
    const ga = gridNum(res(ra)), gb = gridNum(res(rb))
    if (ga != null && gb != null) { if (ga < gb) qualiA++; else if (gb < ga) qualiB++ }
  }
  return { shared, race: { a: raceA, b: raceB }, quali: { a: qualiA, b: qualiB } }
}
