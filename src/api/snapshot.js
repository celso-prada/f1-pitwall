// Static season snapshot reader — the last-resort data layer.
//
// Served from public/data/season-latest.json (generated at build by
// scripts/snapshot.mjs from Jolpica). Used only when the live edge-cached
// Jolpica fails: because the snapshot IS Jolpica data, it stays COHERENT with
// the rest of the app (same rounds, same names), unlike f1api.dev. This is what
// lets the dashboard show a sane season even fully offline.
//
// Fetched once and memoised. Every getter throws when the snapshot can't serve
// the request (missing file, wrong season, missing round) so the caller's
// fallback chain keeps going.

let snapPromise = null

function load() {
  if (!snapPromise) {
    // cache:'no-cache' = revalida no servidor (ETag/304) em vez de aceitar uma
    // cópia local — este arquivo muda a cada deploy e já ficou preso em cache.
    snapPromise = fetch('/data/season-latest.json', { cache: 'no-cache', signal: AbortSignal.timeout(4000) })
      .then(r => { if (!r.ok) throw new Error(`snapshot ${r.status}`); return r.json() })
      .catch(err => { snapPromise = null; throw err }) // allow retry on a later call
  }
  return snapPromise
}

// 'current' and the snapshot's own year both map to the snapshot.
const seasonMatches = (snap, season) =>
  season == null || season === 'current' || String(season) === String(snap.season)

export async function getCalendar(season = 'current') {
  const snap = await load()
  if (!seasonMatches(snap, season) || !snap.calendar?.length) throw new Error('snapshot: no calendar')
  return snap.calendar
}

export async function getDriverStandings(season = 'current') {
  const snap = await load()
  if (!seasonMatches(snap, season) || !snap.driverStandings?.length) throw new Error('snapshot: no driverStandings')
  return snap.driverStandings
}

export async function getConstructorStandings(season = 'current') {
  const snap = await load()
  if (!seasonMatches(snap, season) || !snap.constructorStandings?.length) throw new Error('snapshot: no constructorStandings')
  return snap.constructorStandings
}

export async function getDriverSeasonStats(driverId, season = 'current') {
  const list = await getDriverStandings(season)
  const row = list.find(s => s.Driver?.driverId === driverId)
  if (!row) throw new Error('snapshot: driver not in standings')
  return row
}

export async function getLastRaceResults() {
  const snap = await load()
  const race = snap.lastRound != null ? snap.races?.[snap.lastRound] : null
  if (!race) throw new Error('snapshot: no last race')
  return race
}

export async function getRaceResults(season, round) {
  const snap = await load()
  if (!seasonMatches(snap, season)) throw new Error('snapshot: wrong season')
  const race = snap.races?.[String(round)]
  if (!race) throw new Error('snapshot: round not available')
  return race
}

export async function getQualifyingResults(season, round) {
  const snap = await load()
  if (!seasonMatches(snap, season)) throw new Error('snapshot: wrong season')
  const q = snap.qualifying?.[String(round)]
  if (!q) throw new Error('snapshot: qualifying not available')
  return q
}

// Semeia o cache do React Query a partir do snapshot estático, para a PRIMEIRA
// pintura ser instantânea e coerente mesmo num aparelho novo (localStorage
// vazio, sem visita anterior) — e então o react-query revalida contra a Jolpica
// ao vivo em segundo plano, dando refresh na tela se vier algo novo. Só preenche
// chaves ainda sem dado, então nunca sobrescreve dado mais fresco do
// localStorage/rede. É a base "de primeira pesquisa" que impede qualquer página
// de quebrar: o repo sempre traz um baseline commitado.
export async function hydrateFromSnapshot(qc) {
  let snap
  try { snap = await load() } catch { return }
  const updatedAt = Date.parse(snap.generatedAt) || 0
  const seed = (key, data) => {
    if (data == null) return
    if (qc.getQueryData(key) !== undefined) return // não pisa em dado mais fresco
    // updatedAt antigo de propósito: o react-query trata como stale e revalida.
    try { qc.setQueryData(key, data, { updatedAt }) } catch { /* ignore */ }
  }
  seed(['calendar', 'current'], snap.calendar)
  seed(['driverStandings', 'current'], snap.driverStandings)
  seed(['constructorStandings', 'current'], snap.constructorStandings)
  if (snap.lastRound != null) seed(['lastRace'], snap.races?.[snap.lastRound])
}

// Reconstruct a driver's season results from the completed rounds in the
// snapshot (same shape the DriverPage consumes: Races[] each with Results[0]).
export async function getDriverResults(driverId, season = 'current') {
  const snap = await load()
  if (!seasonMatches(snap, season)) throw new Error('snapshot: wrong season')
  const rounds = Object.values(snap.races ?? {})
    .map(race => {
      const res = (race.Results ?? []).find(r => r.Driver?.driverId === driverId)
      if (!res) return null
      return {
        season: race.season, round: race.round, raceName: race.raceName,
        date: race.date, Circuit: race.Circuit, Results: [res],
      }
    })
    .filter(Boolean)
    .sort((a, b) => parseInt(a.round, 10) - parseInt(b.round, 10))
  if (!rounds.length) throw new Error('snapshot: no driver results')
  return rounds
}
