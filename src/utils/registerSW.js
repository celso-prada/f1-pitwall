// Registro do service worker (ROADMAP 2.3). Só em produção e quando o browser
// suporta — em dev o SW atrapalharia o HMR do Vite. Quando uma versão nova é
// detectada, ativamos na hora (skipWaiting) e recarregamos uma única vez, para
// o app instalado nunca ficar preso numa versão antiga.
export function registerSW() {
  if (import.meta.env.DEV) return
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing
        if (!sw) return
        sw.addEventListener('statechange', () => {
          // Há controller anterior → é atualização (não a 1ª instalação).
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            sw.postMessage('skipWaiting')
          }
        })
      })
    }).catch(() => { /* registro falhou: app segue normal, só sem offline */ })

    let reloaded = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return
      reloaded = true
      window.location.reload()
    })
  })
}
