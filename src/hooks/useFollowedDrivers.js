import { useCallback, useSyncExternalStore } from 'react'

// Modo "seguir piloto" (ROADMAP 2.4). Fixa 1–2 pilotos no topo da torre, mesmo
// que escorreguem para o fim do grid. A escolha persiste no localStorage e é
// compartilhada entre componentes via useSyncExternalStore (sem prop drilling e
// sem Context) — o badge "seguindo" e a torre veem sempre o mesmo estado.
const KEY = 'followed_drivers'
const MAX = 2

const listeners = new Set()
function emit() { for (const l of listeners) l() }

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(raw) ? raw.map(String) : []
  } catch { return [] }
}

// Cache do snapshot: useSyncExternalStore exige referência estável enquanto nada
// muda, senão entra em loop de render. Atualizamos a ref só no toggle.
let snapshot = read()

function write(next) {
  snapshot = next.slice(0, MAX)
  try { localStorage.setItem(KEY, JSON.stringify(snapshot)) } catch { /* ignore */ }
  emit()
}

function subscribe(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useFollowedDrivers() {
  const followed = useSyncExternalStore(subscribe, () => snapshot, () => snapshot)

  const toggle = useCallback((num) => {
    const n = String(num)
    const cur = read()
    if (cur.includes(n)) write(cur.filter(x => x !== n))
    // Ao passar do limite, descarta o mais antigo (FIFO) e fixa o novo.
    else write([...cur, n].slice(-MAX))
  }, [])

  const isFollowed = useCallback((num) => followed.includes(String(num)), [followed])

  return { followed, toggle, isFollowed, max: MAX }
}
