// Service worker do F1 Pitwall (ROADMAP 2.3) — shell offline para a "segunda
// tela". Escrito à mão (sem Workbox) para ter controle total sobre o que NÃO
// pode ser cacheado: os endpoints /api/* são dados ao vivo e precisam ir sempre
// à rede; cachear timing ao vivo seria pior que não ter SW.
//
// Estratégias:
//   /api/*           → network-only (nunca cacheia; live data)
//   navegação (SPA)  → network-first, cai no index.html do cache offline
//   assets same-origin (JS/CSS/PNG/SVG hashados) → cache-first (imutáveis)
//   cross-origin     → ignora (deixa o browser/queries cuidarem)
const VERSION = 'pitwall-v1'
const SHELL = `${VERSION}-shell`
const ASSETS = `${VERSION}-assets`
const SHELL_URLS = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(SHELL_URLS)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  const sameOrigin = url.origin === self.location.origin

  // Dados ao vivo: nunca tocar no cache.
  if (sameOrigin && url.pathname.startsWith('/api/')) return

  // Navegação SPA: rede primeiro (deploy novo ganha), index.html offline como rede falha.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html').then((r) => r || caches.match('/'))),
    )
    return
  }

  if (!sameOrigin) return

  // Assets hashados são imutáveis → cache-first, populando no primeiro acesso.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((resp) => {
        if (resp.ok && (resp.type === 'basic' || resp.type === 'default')) {
          const copy = resp.clone()
          caches.open(ASSETS).then((c) => c.put(request, copy))
        }
        return resp
      })
    }),
  )
})
