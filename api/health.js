// Endpoint serverless do Vercel: saúde das fontes (ROADMAP 7.3).
// Ver api/_health.mjs para a lógica de probe compartilhada (também usada pelo
// plugin do Vite em dev). Cache de borda curto: vários visitantes da /status
// compartilham uma única rodada de probes por ~30s, sem martelar as fontes
// (sobretudo a f1api.dev, que é lenta).
import { buildHealthResponse } from './_health.mjs'

export default async function handler(req, res) {
  try {
    const payload = await buildHealthResponse()
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')
    res.status(200).json(payload)
  } catch (err) {
    res.status(502).json({ overall: 'down', error: String(err?.message || err), ts: Date.now() })
  }
}
