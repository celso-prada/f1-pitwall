import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Em produção o /api/live é uma função serverless do Vercel. Em dev (`npm run
// dev`) o Vite não roda funções serverless, então este plugin serve o MESMO
// endpoint a partir do core compartilhado — o feed ao vivo funciona local
// (assistir ao lado da TV) sem precisar de `vercel dev`.
//
// Interceptamos com um middleware catch-all que checa o path explicitamente: se
// registrássemos em '/api/live', o transformMiddleware do Vite poderia resolver
// '/api/live' -> 'api/live.js' e servir o código-fonte. Importamos o core por
// file URL (não ssrLoadModule) para não depender do grafo de módulos do Vite,
// que se invalida quando o otimizador de deps re-processa o `ws`.
function liveApiDevPlugin() {
  const coreUrl = new URL('./api/_f1live.mjs', import.meta.url)
  return {
    name: 'f1-live-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if ((req.url || '').split('?')[0] !== '/api/live') return next()
        try {
          const { buildLiveResponse } = await import(coreUrl.href)
          const payload = await buildLiveResponse()
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.setHeader('Cache-Control', 'no-store')
          res.end(JSON.stringify(payload))
        } catch (err) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ live: false, error: String(err?.message || err), ts: Date.now() }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), liveApiDevPlugin()],
})
