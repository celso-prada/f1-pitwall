import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Em produção o /api/live é uma função serverless do Vercel. Em dev (`npm run
// dev`) o Vite não roda funções serverless, então este plugin serve o MESMO
// endpoint a partir do core compartilhado — o feed ao vivo funciona local
// (assistir ao lado da TV) sem precisar de `vercel dev`.
function liveApiDevPlugin() {
  return {
    name: 'f1-live-api-dev',
    async configureServer(server) {
      server.middlewares.use('/api/live', async (req, res) => {
        try {
          const { buildLiveResponse } = await server.ssrLoadModule('/api/_f1live.mjs')
          const payload = await buildLiveResponse()
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(payload))
        } catch (err) {
          res.statusCode = 502
          res.end(JSON.stringify({ live: false, error: String(err?.message || err), ts: Date.now() }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), liveApiDevPlugin()],
})
