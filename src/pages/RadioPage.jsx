import { useState, useEffect } from 'react'
import { Headphones, Radio, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRaceSessions, useSessionRadio } from '../hooks/useLiveRace'
import { getTeamColor } from '../utils/teamColors'
import { Skeleton } from '../components/ui/Skeleton'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function RaceList({ sessions, selectedKey, onSelect, loading }) {
  if (loading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} height={52} rounded={8} />
        ))}
      </div>
    )
  }

  if (!sessions?.length) {
    return (
      <div className="text-xs text-neutral-600 py-4 text-center">
        Nenhuma corrida encontrada
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {sessions.map(s => {
        const active = s.session_key === selectedKey
        return (
          <button
            key={s.session_key}
            onClick={() => onSelect(s.session_key)}
            className="w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 transition-all duration-150"
            style={{
              background: active ? 'rgba(225,6,0,0.10)' : '#111',
              border: `1px solid ${active ? 'rgba(225,6,0,0.35)' : 'transparent'}`,
              color: active ? 'var(--color-f1)' : 'var(--color-text-dim)',
            }}
          >
            <span className="text-[10px] tabular-nums text-neutral-600 w-10 flex-shrink-0">
              {formatDate(s.date_start)}
            </span>
            <span className="text-xs font-semibold flex-1 truncate">
              {s.meeting_name ?? s.country_name}
            </span>
            {active && <ChevronRight size={12} className="flex-shrink-0" style={{ color: 'var(--color-f1)' }} />}
          </button>
        )
      })}
    </div>
  )
}

function RadioMessageSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3 px-3 py-2.5 rounded-lg" style={{ background: '#111' }}>
          <Skeleton height={32} width={32} rounded={16} />
          <div className="flex-1 space-y-2">
            <Skeleton height={10} width="40%" />
            <Skeleton height={32} width="100%" rounded={6} />
          </div>
        </div>
      ))}
    </div>
  )
}

function RadioMessage({ msg, driver }) {
  const color = driver ? getTeamColor(driver.team_name, driver.team_colour) : '#555'
  const acronym = driver?.name_acronym ?? `#${msg.driver_number}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 px-3 py-2.5 rounded-lg"
      style={{ background: '#111' }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
        style={{ background: color + '20', color, border: `1px solid ${color}40` }}
      >
        {acronym.slice(0, 3)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[11px] font-bold" style={{ color }}>{acronym}</span>
          {driver?.team_name && (
            <span className="text-[9px] text-neutral-600 truncate">{driver.team_name}</span>
          )}
          <span className="text-[9px] text-neutral-700 ml-auto flex-shrink-0">{formatTime(msg.date)}</span>
        </div>
        <audio
          controls
          preload="none"
          src={msg.recording_url}
          className="w-full"
          style={{ height: 32, accentColor: color }}
        >
          Seu navegador não suporta áudio.
        </audio>
      </div>
    </motion.div>
  )
}

function RadioFeed({ sessionKey }) {
  const { data, isLoading, isError } = useSessionRadio(sessionKey)

  if (isLoading) return <RadioMessageSkeleton />

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-neutral-600 gap-2">
        <Radio size={20} />
        <span className="text-xs">Erro ao carregar rádio</span>
      </div>
    )
  }

  const { radio = [], drivers = [] } = data ?? {}
  const driversMap = Object.fromEntries(drivers.map(d => [d.driver_number, d]))
  const sorted = [...radio].sort((a, b) => new Date(b.date) - new Date(a.date))

  if (!sorted.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-neutral-600 gap-2">
        <Radio size={20} />
        <span className="text-xs">Nenhum rádio disponível para esta corrida</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-neutral-600 mb-3">
        {sorted.length} mensagem{sorted.length !== 1 ? 's' : ''} — mais recentes primeiro
      </p>
      <AnimatePresence initial={false}>
        {sorted.map(msg => (
          <RadioMessage
            key={`${msg.date}-${msg.driver_number}`}
            msg={msg}
            driver={driversMap[msg.driver_number]}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

export function RadioPage() {
  const [selectedKey, setSelectedKey] = useState(null)
  const { data: sessions, isLoading: sessionsLoading } = useRaceSessions()

  // Auto-select the most recent race so the freshest radios show immediately.
  useEffect(() => {
    if (!selectedKey && sessions?.length) setSelectedKey(sessions[0].session_key)
  }, [sessions, selectedKey])

  const selectedSession = sessions?.find(s => s.session_key === selectedKey)
  const seasonLabel = sessions?.[0]?.date_start
    ? new Date(sessions[0].date_start).getFullYear()
    : new Date().getFullYear()

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 lg:px-6 py-6">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Headphones size={20} style={{ color: 'var(--color-f1)' }} />
          <h1 className="text-xl font-display font-bold text-text tracking-wide uppercase">
            Rádio das Equipes
          </h1>
        </div>
        <p className="text-xs text-neutral-500 ml-8">Temporada {seasonLabel} — selecione uma corrida para ouvir os rádios</p>
      </div>

      <div className="flex gap-4 items-start">
        {/* Race list — left column */}
        <aside
          className="w-52 flex-shrink-0 rounded-xl p-3 sticky top-20"
          style={{ background: '#0d0d0d', border: '1px solid var(--color-border)' }}
        >
          <p className="text-[9px] text-neutral-600 uppercase tracking-widest font-semibold mb-2 px-1">
            Corridas {seasonLabel}
          </p>
          <RaceList
            sessions={sessions}
            selectedKey={selectedKey}
            onSelect={setSelectedKey}
            loading={sessionsLoading}
          />
        </aside>

        {/* Radio messages — main area */}
        <main className="flex-1 min-w-0">
          {!selectedKey ? (
            <div
              className="rounded-xl flex flex-col items-center justify-center py-20 gap-3"
              style={{ background: '#0d0d0d', border: '1px solid var(--color-border)' }}
            >
              <Headphones size={32} className="text-neutral-700" />
              <p className="text-sm text-neutral-600">Selecione uma corrida à esquerda</p>
            </div>
          ) : (
            <div
              className="rounded-xl p-4"
              style={{ background: '#0d0d0d', border: '1px solid var(--color-border)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Radio size={14} style={{ color: 'var(--color-f1)' }} />
                <h2 className="text-sm font-bold text-text">
                  {selectedSession?.meeting_name ?? selectedSession?.country_name ?? 'Corrida'}
                </h2>
                {selectedSession?.date_start && (
                  <span className="text-[10px] text-neutral-600 ml-auto">
                    {new Date(selectedSession.date_start).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: 'long', year: 'numeric'
                    })}
                  </span>
                )}
              </div>
              <RadioFeed sessionKey={selectedKey} />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
