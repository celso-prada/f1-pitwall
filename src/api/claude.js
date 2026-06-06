// Claude API client for the AI Chat panel
// Uses Anthropic's API via direct fetch (browser-side, requires API key)
import { computeSessionBests } from './livetiming'
import { extractPenalties } from '../utils/live'

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'

function getApiKey() {
  return import.meta.env.VITE_CLAUDE_API_KEY || localStorage.getItem('f1_claude_key') || null
}

export function setApiKey(key) {
  localStorage.setItem('f1_claude_key', key)
}

export function hasApiKey() {
  return !!getApiKey()
}

const SYSTEM_PROMPT = `Você é o PITWALL AI, assistente especializado em Fórmula 1. Responda sempre em português brasileiro de forma concisa e direta, como um engenheiro de pista/analista experiente.

Você recebe no contexto os dados MAIS RECENTES — standings, próxima corrida e, quando há sessão AO VIVO, a cronometragem completa: posições, gaps, pneus e idade, última/melhor volta, melhores setores por piloto, donos de cada setor, clima, bandeiras e punições. Use SEMPRE esses dados ao vivo para perguntas como "quem é mais rápido no setor 2?", "quem está na janela de undercut?", "quem tem pneu mais novo?" — raciocine sobre os números fornecidos.

Para dados históricos fora do contexto (recordes de carreira, estatísticas antigas), use seu conhecimento treinado.

Seja factual, entusiasmado e técnico. Respostas curtas (2-4 linhas) salvo se pedirem detalhe.`

export async function askClaude(messages, context = {}) {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('NO_API_KEY')

  const contextText = buildContext(context)

  // system como blocos: o prompt estático ganha cache_control (prompt caching),
  // então em conversas de vários turnos só o contexto dinâmico é reprocessado.
  const system = [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }]
  if (contextText) system.push({ type: 'text', text: `## Dados atuais:\n${contextText}` })

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system,
      messages,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message ?? `HTTP ${res.status}`)
  }

  const data = await res.json()
  return data.content[0]?.text ?? ''
}

// `live` é o snapshot normalizado (normalizeLive): { session, drivers[], weather,
// raceControl, ... }. Quando presente, vira o grosso do contexto.
function buildContext({ standings, session, nextRace, live }) {
  const parts = []

  if (standings?.length) {
    const top5 = standings.slice(0, 5).map(s =>
      `P${s.position} ${s.Driver.familyName} (${s.Constructors?.[0]?.name}) - ${s.points}pts`
    ).join(', ')
    parts.push(`Top 5 campeonato: ${top5}`)
  }

  if (nextRace) {
    parts.push(`Próxima corrida: ${nextRace.raceName} em ${nextRace.Circuit?.Location?.locality} - ${nextRace.date}`)
  }

  if (live?.drivers?.length) {
    parts.push(buildLiveContext(live))
  } else if (session) {
    parts.push(`Última/atual sessão: ${session.country_name} ${session.session_name} (${session.date_start?.slice(0, 10)})`)
  }

  return parts.join('\n')
}

function buildLiveContext(live) {
  const s = live.session || {}
  const lines = ['## SESSÃO AO VIVO AGORA']
  lines.push(`${s.gp} — ${s.name} (${s.type}). Bandeira: ${s.track?.label || '—'}.${s.lap != null ? ` Volta ${s.lap}/${s.totalLaps ?? '?'}.` : ''}${s.remaining ? ` Tempo restante: ${s.remaining}.` : ''}`)

  const w = live.weather || {}
  if (w.airTemp != null || w.trackTemp != null) {
    lines.push(`Clima: ar ${w.airTemp ?? '?'}°C, pista ${w.trackTemp ?? '?'}°C, chuva ${w.rainfall ? 'sim' : 'não'}, vento ${w.windSpeed ?? '?'} m/s.`)
  }

  // Donos de cada setor + volta ideal (reaproveita o helper da torre).
  const { sectorOwners, ideal } = computeSessionBests(live.drivers)
  const owners = sectorOwners.map((o, i) => o ? `S${i + 1}: ${o.tla} ${o.value}` : null).filter(Boolean).join(' | ')
  if (owners) lines.push(`Donos dos setores → ${owners}${ideal ? ` | Volta ideal: ${ideal}` : ''}`)

  lines.push('Cronometragem (P | piloto | gap líder | int | pneu(idade) | última | melhor | bestS1/S2/S3):')
  for (const d of live.drivers.slice(0, 12)) {
    const tyre = d.tyre ? `${d.tyre[0]}${d.tyreAge != null ? `(${d.tyreAge}v)` : ''}` : '—'
    const bs = (d.bestSectors || []).map(x => x || '—').join('/')
    lines.push(`P${d.pos} ${d.tla} | ${d.gapToLeader || 'LÍDER'} | ${d.gapToAhead || '—'} | ${tyre} | ${d.lastLap?.value || '—'} | ${d.bestLap || '—'} | ${bs}${d.inPit ? ' [BOX]' : ''}${d.retired ? ' [OUT]' : ''}`)
  }

  const pens = extractPenalties(live.raceControl).slice(0, 4)
  if (pens.length) {
    lines.push('Punições recentes: ' + pens.map(p => `${p.car ? `#${p.car} ` : ''}${p.type}`).join('; '))
  }

  return lines.join('\n')
}
