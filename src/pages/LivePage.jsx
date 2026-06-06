import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { PITWALL_BG } from '../utils/images'
import { useLiveTiming } from '../hooks/useLiveTiming'
import { LiveSessionBar } from '../components/live/LiveSessionBar'
import { OfficialTower } from '../components/live/OfficialTower'
import { LiveConditions } from '../components/live/LiveConditions'
import { LiveRaceControl } from '../components/live/LiveRaceControl'
import { LiveRadio } from '../components/live/LiveRadio'
import { HistoricLive } from './HistoricLive'
import { NewsFeed } from '../components/news/NewsFeed'
import { Panel } from '../components/ui/Panel'
import { Activity, Cloud, Radio, Newspaper, ChevronRight } from 'lucide-react'

function DriverQuickInfo({ d, onClose, navigate }) {
  if (!d) return null
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
      className="card p-4 relative" style={{ border: `1px solid ${d.color}40` }}
    >
      <button onClick={onClose} aria-label="Fechar" className="absolute top-3 right-3 text-text-mute hover:text-text text-lg leading-none">×</button>
      <div className="flex items-center gap-3 mb-3">
        {d.headshot && <img src={d.headshot} alt={d.name} className="w-12 h-12 rounded-full object-cover" style={{ border: `2px solid ${d.color}60` }} onError={e => { e.target.style.display = 'none' }} />}
        <div>
          <div className="font-display font-bold text-text uppercase tracking-wide">{d.name}</div>
          <div className="text-sm" style={{ color: d.color }}>{d.team}</div>
          <div className="num text-xs text-text-mute">#{d.num}</div>
        </div>
      </div>
      <button
        onClick={() => navigate(`/driver/${d.tla?.toLowerCase()}`)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-semibold"
        style={{ background: d.color + '18', color: d.color, border: `1px solid ${d.color}28` }}
      >
        Ver perfil completo <ChevronRight size={12} className="ml-auto" aria-hidden />
      </button>
    </motion.div>
  )
}

// Tela AO VIVO sobre o feed oficial da F1 (timing tower com minisetores, gaps,
// pneus, bandeiras, relógio, race control e rádio em tempo real).
function LiveOfficial({ data }) {
  const navigate = useNavigate()
  const [selected, setSelected] = useState(null)

  return (
    <div className="relative">
      <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: `url(${PITWALL_BG})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.05, zIndex: 0 }} aria-hidden />

      <div className="relative z-10 w-full max-w-[1800px] mx-auto px-4 lg:px-6 py-4 space-y-3">
        <LiveSessionBar session={data.session} />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          <div className="xl:col-span-2 space-y-3">
            <Panel title="Cronometragem" icon={<Activity size={12} aria-hidden />} padding="p-2">
              <OfficialTower drivers={data.drivers} onSelect={setSelected} />
            </Panel>
            <AnimatePresence>
              {selected && <DriverQuickInfo d={selected} onClose={() => setSelected(null)} navigate={navigate} />}
            </AnimatePresence>
          </div>

          <div className="xl:col-span-1 space-y-3">
            <Panel title="Condições" icon={<Cloud size={12} aria-hidden />} padding="p-3">
              <LiveConditions weather={data.weather} />
            </Panel>
            <Panel title="Race Control" icon={<Radio size={12} aria-hidden />} padding="p-3">
              <LiveRaceControl messages={data.raceControl} />
            </Panel>
            <Panel title="Team Radio" icon={<Radio size={12} aria-hidden />} padding="p-3">
              <LiveRadio captures={data.teamRadio} />
            </Panel>
            <Panel title="Notícias" icon={<Newspaper size={12} aria-hidden />} padding="p-3">
              <NewsFeed limit={4} />
            </Panel>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LivePage() {
  const { data: live, isLoading } = useLiveTiming()

  // Enquanto o 1º poll do /api/live não resolve, mostramos um placeholder leve
  // em vez de cair no HistoricLive — assim o OpenF1 (bloqueado durante o ao
  // vivo) não é chamado à toa, evitando erros de CORS e um flash de tela.
  if (isLoading && !live) {
    return (
      <div className="w-full max-w-[1800px] mx-auto px-4 lg:px-6 py-10">
        <div className="card p-6 animate-pulse text-text-mute font-display uppercase tracking-widest text-sm">
          Conectando ao feed ao vivo…
        </div>
      </div>
    )
  }

  // Há sessão transmitindo agora → feed oficial. Senão, consulta histórica
  // (OpenF1), que volta a responder quando não há sessão ao vivo.
  if (live?.live && live.data?.drivers?.length) return <LiveOfficial data={live.data} />
  return <HistoricLive />
}
