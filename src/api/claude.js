// Claude API client for the AI Chat panel
// Uses Anthropic's API via direct fetch (browser-side, requires API key)

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

const SYSTEM_PROMPT = `Você é o PITWALL AI, assistente especializado em Fórmula 1. Responda sempre em português brasileiro de forma concisa e direta, como um analista esportivo experiente.

Você tem acesso aos dados mais recentes fornecidos no contexto do usuário — standings, próxima corrida, sessão ao vivo. Use esses dados para responder com precisão.

Para dados históricos que você não tem no contexto (recordes de carreira, vitórias históricas, estatísticas antigas), use seu conhecimento treinado até sua data de corte.

Seja factual, entusiasmado e use terminologia técnica de F1 quando apropriado. Respostas curtas e objetivas (2-4 linhas) a menos que seja pedido detalhamento.`

export async function askClaude(messages, context = {}) {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('NO_API_KEY')

  const contextText = buildContext(context)

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
      system: SYSTEM_PROMPT + (contextText ? `\n\n## Dados atuais da temporada:\n${contextText}` : ''),
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

function buildContext({ standings, session, nextRace }) {
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

  if (session) {
    parts.push(`Última/atual sessão: ${session.country_name} ${session.session_name} (${session.date_start?.slice(0, 10)})`)
  }

  return parts.join('\n')
}
