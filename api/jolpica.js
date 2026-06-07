// Vercel serverless proxy + edge cache for api.jolpi.ca (Ergast/Jolpica).
//
// Why: the SPA hits Jolpica directly from the browser, so every visitor pays
// Jolpica's full latency and, when Jolpica is slow/down, the app degrades to the
// incompatible f1api.dev data (different round numbering, sponsor-prefixed race
// names). Routing through this proxy turns Vercel's edge into a self-refreshing
// cache of COHERENT Jolpica data: the first request per path warms the edge and
// every later request worldwide is served in ~tens of ms. stale-while-revalidate
// means that even if Jolpica goes down, the edge keeps serving the last good copy
// for up to a day while it revalidates in the background — so a Jolpica hiccup no
// longer pushes the UI onto the mismatched fallback. This is the "cache file"
// idea, but self-maintaining and free on Vercel Hobby.
export default async function handler(req, res) {
  const path = String(req.query.path || '')

  // Allow only Ergast path characters; block traversal.
  if (!path || path.includes('..') || !/^[\w\-/.?=&]+$/.test(path)) {
    res.status(400).json({ error: 'invalid path' })
    return
  }

  try {
    const upstream = await fetch(`https://api.jolpi.ca/ergast/f1/${path.replace(/^\//, '')}`, {
      headers: { 'User-Agent': 'f1-pitwall/1.0 (+vercel)' },
      signal: AbortSignal.timeout(12000),
    })
    const body = await upstream.text()
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    // Standings/last-race move only on race weekends; 5 min fresh + 1 day stale
    // keeps it snappy while still picking up new results within minutes.
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400')
    res.status(upstream.status).send(body)
  } catch (err) {
    res.status(502).json({ error: 'upstream_failed', message: String(err) })
  }
}
