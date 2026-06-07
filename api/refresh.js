// Edge-cache warmer, triggered by a Vercel Cron (see vercel.json).
//
// After a race weekend the aggregate endpoints change. This pings the key
// Jolpica proxy paths on our own public origin so the edge cache revalidates
// proactively — the first real visitor then already gets fresh standings/results
// instead of a stale copy. Best-effort and secret-free; safe to call anytime.
export default async function handler(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const base = `${proto}://${host}`
  const paths = [
    'current/driverStandings.json',
    'current/constructorStandings.json',
    'current.json',
    'current/last/results.json',
  ]
  const settled = await Promise.allSettled(
    paths.map(p => fetch(`${base}/api/jolpica?path=${encodeURIComponent(p)}`, {
      // Cache-busting query so the warmer forces a revalidate at the edge.
      signal: AbortSignal.timeout(12000),
    })),
  )
  res.status(200).json({ warmed: paths, status: settled.map(s => s.status) })
}
