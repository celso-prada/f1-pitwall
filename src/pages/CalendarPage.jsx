import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { getCalendar } from '../api/jolpica'
import { RaceCalendar } from '../components/standings/RaceCalendar'
import { PageShell } from '../components/ui/PageShell'
import { Panel } from '../components/ui/Panel'
import { Calendar } from 'lucide-react'

export function CalendarPage() {
  const { data: races } = useQuery({
    queryKey: ['calendar', 'current'],
    queryFn: () => getCalendar('current'),
    staleTime: 3_600_000,
  })

  const season = races?.[0]?.season ?? 'atual'
  const total = races?.length ?? 0
  const now = new Date()
  const pastCount = (races ?? []).filter(r => new Date(r.date) < now).length
  const nextCount = total - pastCount

  return (
    <PageShell
      title="Calendário"
      subtitle={`Temporada ${season} · ${total} corridas · ${pastCount} realizadas · ${nextCount} restantes — clique em corridas passadas para ver o resultado`}
    >
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Panel title="Todas as Corridas" icon={<Calendar size={13} aria-hidden />}>
          <RaceCalendar season="current" compact={false} />
        </Panel>
      </motion.div>
    </PageShell>
  )
}
