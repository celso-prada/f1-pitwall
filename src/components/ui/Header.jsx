import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getCalendar } from '../../api/jolpica'
import { getLatestSession } from '../../api/openf1'
import { useCountdown } from '../../hooks/useCountdown'
import { getNextRace } from '../../utils/format'
import { TickerBar } from '../live/TickerBar'
import { Radio, BarChart2, Calendar, Home } from 'lucide-react'

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
  const { data: races } = useQuery({
    queryKey: ['calendar', 'current'],
    queryFn: () => getCalendar('current'),
    staleTime: 3_600_000,
  })

  const nextRace = getNextRace(races ?? [])
  const raceDateTime = nextRace ? `${nextRace.date}T${nextRace.time ?? '00:00:00'}` : null
  const countdown = useCountdown(raceDateTime)

  if (!nextRace || !countdown) return null

  return (
    <div className="hidden sm:flex items-center gap-3">
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
    </div>
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
            <nav className="hidden md:flex items-center gap-0.5" role="navigation" aria-label="Navegação principal">
              {NAV.map(({ path, label, icon: Icon }) => {
                const active = isActive(path)
                return (
                  <button
                    key={path}
                    onClick={() => navigate(path)}
                    aria-current={active ? 'page' : undefined}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      color: active ? '#fff' : 'var(--color-text-mute)',
                      background: active ? 'var(--color-f1)' : 'transparent',
                    }}
                  >
                    <Icon size={13} aria-hidden />
                    <span className="hidden lg:block">{label}</span>
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
        style={{ background: 'rgba(10,10,10,0.97)', borderColor: 'var(--color-border)', backdropFilter: 'blur(12px)', height: 64 }}
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
              className="flex-1 flex flex-col items-center justify-center gap-1 h-full transition-all active:scale-95"
              style={{ color: active ? 'var(--color-f1)' : 'var(--color-text-mute)' }}
            >
              <div
                className="flex items-center justify-center w-10 h-7 rounded-xl transition-all"
                style={{ background: active ? 'rgba(225,6,0,0.15)' : 'transparent' }}
              >
                <Icon size={active ? 20 : 18} aria-hidden />
              </div>
              <span className="text-[10px] font-semibold leading-none">{label}</span>
            </button>
          )
        })}
      </nav>
    </>
  )
}
