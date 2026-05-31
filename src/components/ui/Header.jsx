import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getCalendar } from '../../api/jolpica'
import { getLatestSession } from '../../api/openf1'
import { useCountdown } from '../../hooks/useCountdown'
import { getNextRace, isToday } from '../../utils/format'
import { TickerBar } from '../live/TickerBar'
import { Radio, BarChart2, Calendar, Home, Headphones } from 'lucide-react'

function CountdownUnit({ value, label }) {
  return (
    <div className="flex flex-col items-center min-w-[26px]">
      <span className="num text-sm font-bold text-text tabular-nums leading-tight">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[7px] text-text-mute uppercase tracking-widest leading-none">{label}</span>
    </div>
  )
}

function NextRaceCountdown() {
  const navigate = useNavigate()
  const { data: races } = useQuery({
    queryKey: ['calendar', 'current'],
    queryFn: () => getCalendar('current'),
    staleTime: 3_600_000,
  })

  const nextRace = getNextRace(races ?? [])
  const raceDateTime = nextRace ? `${nextRace.date}T${nextRace.time ?? '00:00:00'}` : null
  const countdown = useCountdown(raceDateTime)

  if (!nextRace || !countdown) return null

  const raceDay = isToday(nextRace.date)
  const handleClick = () => {
    if (raceDay) navigate('/live')
    else navigate(`/circuit/${nextRace.Circuit.circuitId}`)
  }

  return (
    <button
      onClick={handleClick}
      aria-label={raceDay ? 'Sessão ao vivo — acompanhar' : `Ver circuito — ${nextRace.raceName.replace(' Grand Prix', ' GP')}`}
      className="hidden sm:flex items-center gap-3 hover:opacity-80 transition-opacity"
    >
      <div className="hidden md:flex flex-col text-right leading-tight">
        <span className="text-[9px] text-text-mute uppercase tracking-wider">Próxima corrida</span>
        <span className="text-xs font-bold text-text">{nextRace.raceName.replace(' Grand Prix', ' GP')}</span>
      </div>
      <div className="flex items-center gap-1 px-3 py-2 rounded-lg"
        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-strong)' }}>
        <CountdownUnit value={countdown.d} label="d" />
        <span className="text-text-mute font-bold text-xs num self-center pb-2">:</span>
        <CountdownUnit value={countdown.h} label="h" />
        <span className="text-text-mute font-bold text-xs num self-center pb-2">:</span>
        <CountdownUnit value={countdown.m} label="m" />
        <span className="text-text-mute font-bold text-xs num self-center pb-2">:</span>
        <CountdownUnit value={countdown.s} label="s" />
      </div>
    </button>
  )
}

function LiveSessionBadge() {
  const { data: session } = useQuery({
    queryKey: ['latestSession'],
    queryFn: getLatestSession,
    staleTime: 60_000,
  })

  const navigate = useNavigate()
  const now = new Date()
  const isLive = session &&
    new Date(session.date_start) <= now &&
    new Date(session.date_end) >= now

  if (!isLive) return null

  return (
    <button
      onClick={() => navigate('/live')}
      aria-label="Sessão ao vivo — acompanhar"
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-colors hover:border-red-500/60"
      style={{ background: 'rgba(225,6,0,0.08)', borderColor: 'rgba(225,6,0,0.3)' }}
    >
      <div className="w-1.5 h-1.5 rounded-full bg-red-500 live-dot" />
      <span className="text-red-400 text-[10px] font-bold tracking-wider hidden sm:block">AO VIVO</span>
    </button>
  )
}

const NAV = [
  { path: '/',           label: 'Home',        icon: Home },
  { path: '/live',       label: 'Ao Vivo',     icon: Radio },
  { path: '/standings',  label: 'Classificação', icon: BarChart2 },
  { path: '/calendar',   label: 'Calendário',  icon: Calendar },
  { path: '/radio',      label: 'Rádio',       icon: Headphones },
]

export function Header() {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  return (
    <>
      {/* ── Top header ── */}
      <header className="sticky top-0 z-50" style={{ background: 'var(--color-bg)' }}>
        <TickerBar />

        <div className="glass border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="w-full max-w-[1800px] mx-auto flex items-center gap-4 px-4 lg:px-6 h-14">
            {/* Logo */}
            <button
              onClick={() => navigate('/')}
              aria-label="F1 Pitwall — início"
              className="flex items-center gap-2.5 flex-shrink-0 group"
            >
              <div
                className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 transition-opacity group-hover:opacity-85"
                style={{ background: 'var(--color-f1)' }}
              >
                <span className="text-white font-black text-[11px] font-display tracking-tight">F1</span>
              </div>
              <span className="font-display font-bold text-text text-sm tracking-widest uppercase hidden sm:block">
                PITWALL
              </span>
            </button>

            {/* Divider — desktop only */}
            <div className="w-px h-5 hidden md:block" style={{ background: 'var(--color-border-strong)' }} />

            {/* Nav — desktop only (mobile uses bottom bar) */}
            <nav className="hidden md:flex items-center gap-1" role="navigation" aria-label="Navegação principal">
              {NAV.map(({ path, label, icon: Icon }) => {
                const active = isActive(path)
                return (
                  <button
                    key={path}
                    onClick={() => navigate(path)}
                    aria-current={active ? 'page' : undefined}
                    className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      active ? '' : 'hover:bg-[#141414]'
                    }`}
                    style={{
                      color: active ? 'var(--color-f1)' : 'var(--color-text-dim)',
                      background: active ? 'rgba(225,6,0,0.08)' : 'transparent',
                    }}
                  >
                    <Icon size={15} strokeWidth={active ? 2.2 : 1.8} aria-hidden />
                    <span>{label}</span>
                    {active && (
                      <span
                        className="absolute bottom-0 left-3 right-3 h-px rounded-full"
                        style={{ background: 'var(--color-f1)', opacity: 0.7 }}
                      />
                    )}
                  </button>
                )
              })}
            </nav>

            <div className="flex-1" />
            <LiveSessionBadge />
            <NextRaceCountdown />
          </div>

          <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--color-f1) 50%, transparent)' }} />
        </div>
      </header>

      {/* ── Bottom navigation bar — mobile only ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t"
        style={{ background: 'rgba(8,8,8,0.98)', borderColor: 'var(--color-border)', backdropFilter: 'blur(20px)', height: 64 }}
        role="navigation"
        aria-label="Navegação principal"
      >
        {NAV.map(({ path, label, icon: Icon }) => {
          const active = isActive(path)
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              aria-current={active ? 'page' : undefined}
              className="relative flex-1 flex flex-col items-center justify-center gap-1 h-full transition-all duration-200 active:scale-95"
              style={{ color: active ? 'var(--color-f1)' : 'var(--color-text-mute)' }}
            >
              {/* Top accent line */}
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full transition-all duration-300"
                style={{
                  width: active ? 28 : 0,
                  height: 2,
                  background: 'var(--color-f1)',
                  opacity: active ? 1 : 0,
                }}
              />

              {/* Icon with pill background */}
              <div
                className="flex items-center justify-center rounded-xl transition-all duration-200"
                style={{
                  width: 40,
                  height: 28,
                  background: active ? 'rgba(225,6,0,0.12)' : 'transparent',
                }}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} aria-hidden />
              </div>

              <span
                className="text-[10px] font-semibold leading-none tracking-wide transition-all duration-200"
                style={{ opacity: active ? 1 : 0.55 }}
              >
                {label}
              </span>
            </button>
          )
        })}
      </nav>
    </>
  )
}
