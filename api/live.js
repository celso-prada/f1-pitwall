// Endpoint serverless do Vercel: snapshot do feed AO VIVO oficial da F1.
// Ver api/_f1live.mjs para o porquê desta abordagem (Vercel-compatível, sem
// conexão persistente). Cache de borda curto (s-maxage) faz vários clientes
// compartilharem uma única captura por intervalo, protegendo o feed upstream.
import { buildLiveResponse } from './_f1live.mjs'

export default async function handler(req, res) {
  try {
    const payload = await buildLiveResponse()
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    // 3s de cache na borda + stale enquanto revalida: a torre atualiza ~a cada
    // poll do cliente sem martelar o feed da F1 quando há muitos espectadores.
    res.setHeader('Cache-Control', 'public, s-maxage=3, stale-while-revalidate=10')
    res.status(200).json(payload)
  } catch (err) {
    res.status(502).json({ live: false, error: String(err?.message || err), ts: Date.now() })
  }
}
