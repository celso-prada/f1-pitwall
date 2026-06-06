import { useCallback, useEffect, useState } from 'react'

// "Modo TV" (ROADMAP 2.3): tela cheia de verdade na segunda tela. Encapsula a
// Fullscreen API (com o prefixo webkit do Safari/iPad) e expõe o estado atual
// para o botão alternar o rótulo/ícone.
function fsElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null
}

export function useFullscreen() {
  const [active, setActive] = useState(!!fsElement())

  useEffect(() => {
    const onChange = () => setActive(!!fsElement())
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
    }
  }, [])

  const enter = useCallback(() => {
    const el = document.documentElement
    const req = el.requestFullscreen || el.webkitRequestFullscreen
    if (req) req.call(el).catch(() => {})
  }, [])

  const exit = useCallback(() => {
    const ex = document.exitFullscreen || document.webkitExitFullscreen
    if (ex) ex.call(document).catch(() => {})
  }, [])

  const toggle = useCallback(() => {
    if (fsElement()) exit()
    else enter()
  }, [enter, exit])

  // iOS Safari (iPhone) não expõe a Fullscreen API; escondemos o botão lá.
  const supported = !!(
    document.documentElement.requestFullscreen ||
    document.documentElement.webkitRequestFullscreen
  )

  return { active, toggle, supported }
}
