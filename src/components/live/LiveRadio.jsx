import { useRef, useState } from 'react'
import { Play, Pause } from 'lucide-react'

function hhmm(utc) {
  if (!utc) return ''
  const d = new Date(utc)
  return isNaN(d) ? '' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function LiveRadio({ captures }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(null)

  if (!captures?.length) return <div className="text-text-mute text-sm">Sem rádios ainda.</div>

  const toggle = (cap, i) => {
    const a = audioRef.current
    if (!a) return
    if (playing === i) { a.pause(); setPlaying(null); return }
    a.src = cap.url
    a.play().then(() => setPlaying(i)).catch(() => setPlaying(null))
  }

  return (
    <>
      <audio ref={audioRef} onEnded={() => setPlaying(null)} className="hidden" />
      <ul className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
        {captures.slice(0, 20).map((c, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            <button
              onClick={() => toggle(c, i)}
              className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors"
              style={{ background: `${c.color}22`, color: c.color, border: `1px solid ${c.color}40` }}
              aria-label={playing === i ? 'Pausar' : 'Tocar'}
            >
              {playing === i ? <Pause size={12} /> : <Play size={12} />}
            </button>
            <span className="font-display font-bold text-text w-9" style={{ color: c.color }}>{c.tla}</span>
            <span className="num text-text-mute tabular-nums ml-auto">{hhmm(c.utc)}</span>
          </li>
        ))}
      </ul>
    </>
  )
}
