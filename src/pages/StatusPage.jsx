import { useQuery } from '@tanstack/react-query'
import { Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react'
import { PageShell } from '../components/ui/PageShell'
import { Skeleton } from '../components/ui/Skeleton'

// Saúde das fontes (ROADMAP 7.3). Consome /api/health, que faz o ping de cada
// upstream no servidor (sem CORS, com timeouts próprios). Útil quando algo na
// página parece "travado": dá pra ver na hora qual fonte está fora.

const STATUS_META = {
  ok:       { label: 'Operacional', color: '#22c55e', Icon: CheckCircle2 },
  degraded: { label: 'Instável',    color: '#eab308', Icon: AlertTriangle },
  down:     { label: 'Fora do ar',  color: '#ef4444', Icon: XCircle },
}

function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await fetch('/api/health')
      if (!res.ok) throw new Error(`health ${res.status}`)
      return res.json()
    },
    staleTime: 20_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}

function StatusDot({ status }) {
  const meta = STATUS_META[status] ?? STATUS_META.down
  return (
    <span className="inline-flex items-center gap-1.5 flex-shrink-0">
      <span
        className="w-2 h-2 rounded-full"
        style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}` }}
      />
      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: meta.color }}>
        {meta.label}
      </span>
    </span>
  )
}

function SourceRow({ source }) {
  const meta = STATUS_META[source.status] ?? STATUS_META.down
  return (
    <div
      className="flex items-center gap-3 px-3.5 py-3 rounded-lg"
      style={{ background: '#111', border: `1px solid ${meta.color}22` }}
    >
      <meta.Icon size={18} style={{ color: meta.color }} className="flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-text truncate">{source.label}</span>
          {source.code > 0 && (
            <span className="text-[9px] tabular-nums text-neutral-600 flex-shrink-0">HTTP {source.code}</span>
          )}
        </div>
        <p className="text-[11px] text-neutral-500 truncate">{source.desc}</p>
        {source.error && (
          <p className="text-[10px] mt-0.5 truncate" style={{ color: meta.color }}>{source.error}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <StatusDot status={source.status} />
        <span className="text-[10px] tabular-nums text-neutral-500">{source.ms} ms</span>
      </div>
    </div>
  )
}

export function StatusPage() {
  const { data, isLoading, isError, isFetching, refetch, dataUpdatedAt } = useHealth()

  const overall = data?.overall ?? (isError ? 'down' : 'ok')
  const meta = STATUS_META[overall] ?? STATUS_META.down
  const updated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null

  return (
    <PageShell>
      {/* Cabeçalho da página */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <Activity size={20} style={{ color: 'var(--color-f1)' }} />
          <div>
            <h1 className="text-xl font-display font-bold text-text tracking-wide uppercase leading-tight">
              Saúde das Fontes
            </h1>
            <p className="text-xs text-neutral-500">Status em tempo real de cada upstream de dados</p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          aria-label="Atualizar agora"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors hover:bg-[#1a1a1a]"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-strong)', color: 'var(--color-text-dim)' }}
        >
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Atualizar</span>
        </button>
      </div>

      {/* Resumo geral */}
      {!isLoading && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: `${meta.color}10`, border: `1px solid ${meta.color}33` }}
        >
          <meta.Icon size={22} style={{ color: meta.color }} />
          <div className="flex-1">
            <span className="text-sm font-bold" style={{ color: meta.color }}>
              {overall === 'ok' ? 'Todos os sistemas operacionais'
                : overall === 'degraded' ? 'Algumas fontes instáveis'
                : 'Há fontes fora do ar'}
            </span>
            {data?.counts && (
              <p className="text-[11px] text-neutral-500">
                {data.counts.ok ?? 0} ok · {data.counts.degraded ?? 0} instável · {data.counts.down ?? 0} fora
              </p>
            )}
          </div>
          {updated && <span className="text-[10px] text-neutral-600 flex-shrink-0">Atualizado {updated}</span>}
        </div>
      )}

      {/* Lista de fontes */}
      <div className="space-y-2 mt-2">
        {isLoading ? (
          Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} height={64} rounded={8} />)
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-neutral-600">
            <XCircle size={24} />
            <span className="text-sm">Não foi possível consultar a saúde das fontes</span>
          </div>
        ) : (
          data.sources.map(s => <SourceRow key={s.id} source={s} />)
        )}
      </div>

      <p className="text-[10px] text-neutral-600 mt-4">
        Os tempos são medidos no servidor (Vercel). "Instável" = respondeu com erro
        HTTP ou perto do limite de tempo; "Fora do ar" = sem resposta dentro do timeout.
      </p>
    </PageShell>
  )
}
