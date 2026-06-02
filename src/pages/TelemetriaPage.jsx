import { useState, useEffect, useMemo } from 'react'
import { Gauge, Activity, Timer, ChevronDown } from 'lucide-react'
import { Panel } from '../components/ui/Panel'
import { Skeleton } from '../components/ui/Skeleton'
import { TelemetryChart } from '../components/telemetry/TelemetryChart'
import { PaceChart } from '../components/telemetry/PaceChart'
import { LapStatsCard } from '../components/telemetry/LapStatsCard'
import { getTeamColor } from '../utils/teamColors'
import { fastestLap, lapStats } from '../api/telemetry'
import {
  useSeasonSessions, useSessionDriversList, useDriversLaps, useLapTelemetry,
} from '../hooks/useTelemetry'

const MAX_DRIVERS = 5 // pace chart; telemetry overlay uses the first 2

function sessionLabel(s) {
  return `${s.meeting_name ?? s.country_name ?? 'GP'} · ${s.session_name ?? s.session_type}`
}

function driverMeta(d) {
  return {
    number: d.driver_number,
    acronym: d.name_acronym ?? `#${d.driver_number}`,
    full_name: d.full_name ?? d.broadcast_name ?? d.name_acronym,
    team_name: d.team_name ?? '',
    color: getTeamColor(d.team_name, d.team_colour),
    headshot: d.headshot_url ?? null,
  }
}

// ── Session dropdown ─────────────────────────────────────────────────────────
function SessionSelect({ sessions, value, onChange }) {
  return (
    <div className="relative">
      <select
        value={value ?? ''}
        onChange={e => onChange(Number(e.target.value))}
        className="appearance-none num text-xs font-semibold text-text pl-3 pr-9 py-2.5 rounded-lg cursor-pointer focus:outline-none"
        style={{ background: '#0d0d0d', border: '1px solid var(--color-border-strong)', minWidth: 260 }}
      >
        {sessions.map(s => (
          <option key={s.session_key} value={s.session_key} style={{ background: '#0d0d0d' }}>
            {sessionLabel(s)}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500" />
    </div>
  )
}

// ── Driver chips ─────────────────────────────────────────────────────────────
function DriverPicker({ drivers, selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {drivers.map(d => {
        const m = driverMeta(d)
        const on = selected.includes(m.number)
        const idx = selected.indexOf(m.number)
        return (
          <button
            key={m.number}
            onClick={() => onToggle(m.number)}
            className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all"
            style={{
              background: on ? m.color + '20' : '#101010',
              color: on ? m.color : 'var(--color-text-mute)',
              border: `1px solid ${on ? m.color + '70' : 'transparent'}`,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: on ? m.color : '#333' }} />
            {m.acronym}
            {/* show 1/2 badge for the telemetry comparison pair */}
            {on && idx < 2 && (
              <span className="num text-[8px] px-1 rounded" style={{ background: m.color, color: '#000' }}>
                {idx + 1}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function TelemetriaPage() {
  const { data: sessions, isLoading: sessionsLoading } = useSeasonSessions()
  const [sessionKey, setSessionKey] = useState(null)
  const [selected, setSelected] = useState([])

  // Default to the most recent session once loaded.
  useEffect(() => {
    if (sessionKey == null && sessions?.length) setSessionKey(sessions[0].session_key)
  }, [sessions, sessionKey])

  const { data: drivers, isLoading: driversLoading } = useSessionDriversList(sessionKey)

  // Reset/seed the selection whenever the session changes.
  useEffect(() => {
    if (drivers?.length) setSelected(drivers.slice(0, 2).map(d => d.driver_number))
  }, [drivers])

  const toggle = (num) => {
    setSelected(prev => {
      if (prev.includes(num)) return prev.filter(n => n !== num)
      if (prev.length >= MAX_DRIVERS) return [...prev.slice(1), num]
      return [...prev, num]
    })
  }

  const driverByNum = useMemo(
    () => Object.fromEntries((drivers ?? []).map(d => [d.driver_number, driverMeta(d)])),
    [drivers],
  )

  const { byDriver: lapsByDriver, isLoading: lapsLoading } = useDriversLaps(sessionKey, selected)

  // Telemetry comparison pair = first two selected drivers.
  const [a, b] = selected
  const telA = useLapTelemetry(sessionKey, a, lapsByDriver[a])
  const telB = useLapTelemetry(sessionKey, b, lapsByDriver[b])

  const session = sessions?.find(s => s.session_key === sessionKey)

  // Build the entries the charts/cards consume.
  const pairEntries = [
    { num: a, tel: telA },
    { num: b, tel: telB },
  ]
    .filter(x => x.num != null && driverByNum[x.num])
    .map(({ num, tel }) => {
      const meta = driverByNum[num]
      const fl = fastestLap(lapsByDriver[num] ?? [])
      return {
        ...meta,
        samples: tel.data ?? [],
        lapTime: fl?.lap_duration ?? null,
        stats: lapStats(tel.data ?? []),
      }
    })

  const paceEntries = selected
    .filter(n => driverByNum[n])
    .map(n => ({ ...driverByNum[n], laps: lapsByDriver[n] ?? [] }))

  if (sessionsLoading) {
    return (
      <div className="w-full max-w-[1800px] mx-auto px-4 lg:px-6 py-6 space-y-4">
        <Skeleton height={40} width={320} />
        <Skeleton height={300} rounded={12} />
      </div>
    )
  }

  if (!sessions?.length) {
    return (
      <div className="w-full max-w-[1800px] mx-auto px-4 lg:px-6 py-20 text-center text-neutral-600">
        <Gauge size={32} className="mx-auto mb-3 text-neutral-700" />
        <p className="text-sm">Nenhuma sessão com telemetria disponível</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[1800px] mx-auto px-4 lg:px-6 py-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Gauge size={22} style={{ color: 'var(--color-f1)' }} />
            <h1 className="text-2xl font-display font-bold text-text tracking-wide uppercase">Telemetria</h1>
          </div>
          <p className="text-xs text-neutral-500 ml-9">
            Volta rápida, ritmo e dados de carro · fonte OpenF1 (2023+)
          </p>
        </div>
        <SessionSelect sessions={sessions} value={sessionKey} onChange={setSessionKey} />
      </div>

      {/* Driver picker */}
      <Panel title="Pilotos" icon={<Activity size={12} aria-hidden />} padding="p-3"
        right={<span className="text-[9px] text-neutral-600 uppercase tracking-widest">1 e 2 = comparação de telemetria · até {MAX_DRIVERS} no ritmo</span>}>
        {driversLoading
          ? <Skeleton height={32} />
          : <DriverPicker drivers={drivers ?? []} selected={selected} onToggle={toggle} />}
      </Panel>

      {/* Telemetry overlay */}
      <Panel title="Comparação — Volta Mais Rápida" icon={<Gauge size={12} aria-hidden />} padding="p-4">
        {(telA.isLoading || telB.isLoading) && selected.length
          ? <Skeleton height={300} rounded={8} />
          : <TelemetryChart drivers={pairEntries} />}
      </Panel>

      {/* Stats + pace */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <Panel title="Ritmo de Corrida" icon={<Timer size={12} aria-hidden />} padding="p-4">
            {lapsLoading
              ? <Skeleton height={260} rounded={8} />
              : <PaceChart drivers={paceEntries} />}
          </Panel>
        </div>
        <div className="space-y-4">
          {pairEntries.length
            ? pairEntries.map(d => <LapStatsCard key={d.number} driver={d} />)
            : <div className="card p-6 text-center text-xs text-neutral-600">Selecione pilotos para ver o resumo</div>}
        </div>
      </div>

      {session && (
        <p className="text-[10px] text-neutral-600 text-center pt-2">
          {sessionLabel(session)} · {new Date(session.date_start).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      )}
    </div>
  )
}
