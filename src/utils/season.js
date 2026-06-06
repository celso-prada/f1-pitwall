// Funções puras para a página de recordes/progressão (ROADMAP 6.2).

// Pontos acumulados rodada a rodada de um piloto, a partir do array de corridas
// da Jolpica/f1api (cada uma com round + Results[0].points). Retorna pares
// { round, points } ordenados, com o ponto somando o que veio antes.
export function cumulativePoints(races) {
  const rows = (races ?? [])
    .map(r => ({ round: parseInt(r.round, 10), pts: parseFloat(r.Results?.[0]?.points) || 0 }))
    .filter(r => !isNaN(r.round))
    .sort((a, b) => a.round - b.round)
  let acc = 0
  const out = []
  for (const r of rows) {
    acc += r.pts
    out.push({ round: r.round, points: acc })
  }
  return out
}

// Funde as progressões de vários pilotos numa série pronta para o gráfico:
// [{ round: 1, VER: 25, HAM: 18 }, ...]. Cada piloto vira uma chave (o `key`,
// normalmente o code/TLA). Em rounds que o piloto pulou, repete o último valor
// conhecido para a linha não "cair" a zero.
export function buildProgression(drivers) {
  const series = drivers.map(d => ({ key: d.key, points: cumulativePoints(d.races) }))
  const maxRound = series.reduce((m, s) => Math.max(m, s.points.at(-1)?.round ?? 0), 0)
  const out = []
  const last = {}
  for (let round = 1; round <= maxRound; round++) {
    const row = { round }
    for (const s of series) {
      const hit = s.points.find(p => p.round === round)
      if (hit) last[s.key] = hit.points
      row[s.key] = last[s.key] ?? 0
    }
    out.push(row)
  }
  return out
}

// Superlativos da temporada a partir da tabela de classificação (já temos os
// totais). Lower-noise: só o que dá pra afirmar com os campos de standings.
export function seasonHighlights(standings) {
  const list = standings ?? []
  if (!list.length) return null
  const num = v => parseFloat(v) || 0
  const leader = list[0]
  const runnerUp = list[1]
  const mostWins = [...list].sort((a, b) => num(b.wins) - num(a.wins))[0]
  return {
    leader,
    gapToSecond: runnerUp ? num(leader.points) - num(runnerUp.points) : null,
    mostWins,
    totalWins: list.reduce((s, d) => s + num(d.wins), 0),
    driversScored: list.filter(d => num(d.points) > 0).length,
  }
}
