// Vercel serverless proxy + edge cache for f1api.dev.
//
// f1api.dev is slow (~4.5s/req). By proxying through Vercel and returning a
// CDN cache header, the first request per path warms Vercel's edge and every
// subsequent request worldwide is served from the edge in ~tens of ms.
// stale-while-revalidate keeps it fresh without ever blocking on the slow
// origin once warmed. Historical data effectively never changes, so this is
// safe and a big perceived-latency win.
export default async function handler(req, res) {
  const path = String(req.query.path || '')

  // Allow only f1api path characters; block traversal.
  if (!path || path.includes('..') || !/^[\w\-/.?=&]+$/.test(path)) {
    res.status(400).json({ error: 'invalid path' })
    return
  }

  try {
    const upstream = await fetch(`https://f1api.dev/api/${path}`, {
      headers: { 'User-Agent': 'f1-pitwall/1.0 (+vercel)' },
      signal: AbortSignal.timeout(12000),
    })
    const body = await upstream.text()
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    // Edge-cache 10 min; serve stale up to a day while revalidating.
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400')
    res.status(upstream.status).send(body)
  } catch (err) {
    res.status(502).json({ error: 'upstream_failed', message: String(err) })
  }
}
