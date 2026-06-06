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
//
// O /api/health (saúde das fontes) segue a mesma estratégia, a partir do seu
// próprio core, para que a página /status funcione em dev sem `vercel dev`.
function serverlessApiDevPlugin() {
  const liveUrl = new URL('./api/_f1live.mjs', import.meta.url)
  const healthUrl = new URL('./api/_health.mjs', import.meta.url)
  return {
    name: 'f1-serverless-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = (req.url || '').split('?')[0]
        const sendJson = (payload) => {
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.setHeader('Cache-Control', 'no-store')
          res.end(JSON.stringify(payload))
        }
        if (path === '/api/live') {
          try {
            const { buildLiveResponse } = await import(liveUrl.href)
            sendJson(await buildLiveResponse())
          } catch (err) {
            res.statusCode = 502
            sendJson({ live: false, error: String(err?.message || err), ts: Date.now() })
          }
          return
        }
        if (path === '/api/health') {
          try {
            const { buildHealthResponse } = await import(healthUrl.href)
            sendJson(await buildHealthResponse())
          } catch (err) {
            res.statusCode = 502
            sendJson({ overall: 'down', error: String(err?.message || err), ts: Date.now() })
          }
          return
        }
        return next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serverlessApiDevPlugin()],
  build: {
    rollupOptions: {
      output: {
        // Recharts é pesado e usado por VÁRIAS rotas lazy (/live, /telemetria,
        // /race). Sem isto, o bundler duplicaria o código dele em cada chunk de
        // rota. Num chunk próprio ele baixa uma vez e fica em cache do browser
        // entre as rotas. framer-motion segue a mesma lógica. (Rolldown/Vite 8
        // exige manualChunks como função, não objeto.)
        manualChunks(id) {
          if (id.includes('node_modules/recharts/')) return 'recharts'
          if (id.includes('node_modules/framer-motion/')) return 'motion'
        },
      },
    },
  },
})
