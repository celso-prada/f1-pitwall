import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useDriverStandings } from '../hooks/useStandings'
import { DriverStandings } from '../components/standings/DriverStandings'
import { ConstructorStandings } from '../components/standings/ConstructorStandings'
import { PageShell } from '../components/ui/PageShell'
import { Users, Building2, Swords, Trophy } from 'lucide-react'

export function StandingsPage() {
  const [tab, setTab] = useState('drivers')
  const navigate = useNavigate()

  const { data: standings } = useDriverStandings('current')

  const season = standings?.[0]?.Driver ? standings[0].season ?? 'atual' : 'atual'

  return (
    <PageShell
      title="Classificação"
      subtitle={`Temporada ${season}`}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/recordes')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors hover:bg-[#1a1a1a]"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-strong)', color: 'var(--color-text-dim)' }}
          >
            <Trophy size={13} aria-hidden /> Recordes
          </button>
          <button
            onClick={() => navigate('/comparar')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors hover:bg-[#1a1a1a]"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-strong)', color: 'var(--color-text-dim)' }}
          >
            <Swords size={13} aria-hidden /> Head to Head
          </button>
        </div>
      }
    >
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Tab selector */}
        <div
          className="flex gap-1 mb-4 p-1 rounded-xl w-full max-w-xs"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-strong)' }}
          role="tablist"
          aria-label="Campeonatos"
        >
          {[
            { id: 'drivers',      label: 'Pilotos',      icon: Users },
            { id: 'constructors', label: 'Construtores', icon: Building2 },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: tab === id ? 'var(--color-f1)' : 'transparent',
                color:      tab === id ? 'white' : 'var(--color-text-mute)',
              }}
            >
              <Icon size={14} aria-hidden />
              {label}
            </button>
          ))}
        </div>

        {/* Content — full width, 2-column on larger screens */}
        <div role="tabpanel" aria-label={tab === 'drivers' ? 'Pilotos' : 'Construtores'}>
          {tab === 'drivers' ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="card p-4">
                <DriverStandings season="current" />
              </div>
              {/* Right panel: top 3 info or placeholder for future content */}
              <div className="hidden xl:flex flex-col gap-4">
                <div className="card p-4">
                  <ConstructorStandings season="current" />
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-4 max-w-2xl">
              <ConstructorStandings season="current" />
            </div>
          )}
        </div>
      </motion.div>
    </PageShell>
  )
}
