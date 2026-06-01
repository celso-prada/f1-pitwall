// Lightweight localStorage persistence for TanStack Query — no extra deps.
//
// The core data sources (Jolpica down → f1api.dev fallback) are slow (~4.5s),
// so a first paint that waits on the network feels sluggish. Here we persist
// successful results and hydrate them on startup: the page paints instantly
// with the last good data, then react-query revalidates in the background
// (stale-while-revalidate). Only small, high-value current-season payloads are
// cached — not per-driver/per-race history.

const STORE = 'f1_qcache_v1'
const MAX_AGE = 24 * 60 * 60 * 1000 // drop anything older than a day

// Persist only queries whose root key is in this list (keeps storage tiny and
// avoids caching volatile live-timing data).
const PERSIST = new Set([
  'driverStandings', 'constructorStandings', 'calendar', 'lastRace', 'driverPhotos',
])

const rootKey = qk => (Array.isArray(qk) ? qk[0] : qk)

function load() {
  try { return JSON.parse(localStorage.getItem(STORE) || '{}') } catch { return {} }
}
function save(obj) {
  try { localStorage.setItem(STORE, JSON.stringify(obj)) } catch { /* quota / disabled */ }
}

// Seed the cache from localStorage before the first render. Each entry keeps its
// original timestamp so react-query treats it as stale and refetches.
export function hydrateQueryClient(qc) {
  const store = load()
  const now = Date.now()
  for (const [k, entry] of Object.entries(store)) {
    if (!entry || entry.data === undefined || now - entry.ts > MAX_AGE) continue
    try {
      qc.setQueryData(JSON.parse(k), entry.data, { updatedAt: entry.ts })
    } catch { /* skip malformed entry */ }
  }
}

// Subscribe to the cache and persist whitelisted successful queries (throttled).
export function persistQueryClient(qc) {
  const cache = qc.getQueryCache()
  let timer = null
  cache.subscribe(() => {
    if (timer) return
    timer = setTimeout(() => {
      timer = null
      const store = {}
      for (const q of cache.getAll()) {
        if (q.state.status !== 'success' || q.state.data === undefined) continue
        if (!PERSIST.has(rootKey(q.queryKey))) continue
        store[JSON.stringify(q.queryKey)] = { data: q.state.data, ts: q.state.dataUpdatedAt }
      }
      save(store)
    }, 1000)
  })
}
