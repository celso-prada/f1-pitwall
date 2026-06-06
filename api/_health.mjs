// Núcleo compartilhado do endpoint de saúde das fontes (ROADMAP 7.3).
// Faz um ping leve em cada upstream que o Pitwall consome e devolve status +
// latência de cada um. Roda no servidor (função serverless do Vercel em prod,
// plugin do Vite em dev) para evitar CORS e centralizar timeouts.
//
// Classificação:
//   ok       — respondeu 2xx dentro do orçamento de tempo
//   degraded — respondeu, mas com erro HTTP (4xx/5xx) ou perto do timeout
//   down     — não respondeu (timeout, DNS, recusa de conexão)

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126 Safari/537.36'
const YEAR = new Date().getFullYear()

// Cada fonte: timeout próprio (f1api.dev é reconhecidamente lenta) e um limite
// `slowMs` acima do qual marcamos "degraded" mesmo respondendo 200.
const SOURCES = [
  {
    id: 'official-live',
    label: 'Feed oficial (ao vivo)',
    desc: 'livetiming.formula1.com — SignalR / timing em tempo real',
    url: 'https://livetiming.formula1.com/static/StreamingStatus.json',
    timeout: 6000, slowMs: 2500,
  },
  {
    id: 'official-static',
    label: 'Arquivo estático oficial',
    desc: 'livetiming.formula1.com — Index.json (resultados pós-sessão)',
    url: `https://livetiming.formula1.com/static/${YEAR}/Index.json`,
    timeout: 6000, slowMs: 2500,
  },
  {
    id: 'jolpica',
    label: 'Jolpica / Ergast',
    desc: 'api.jolpi.ca — classificação, calendário, resultados históricos',
    url: 'https://api.jolpi.ca/ergast/f1/current/last/results.json?limit=1',
    timeout: 5000, slowMs: 2500,
  },
  {
    id: 'f1api',
    label: 'f1api.dev',
    desc: 'Fallback de dados históricos (lento por natureza)',
    url: 'https://f1api.dev/api/current',
    timeout: 12000, slowMs: 6000,
  },
  {
    id: 'openf1',
    label: 'OpenF1',
    desc: 'api.openf1.org — telemetria/sessões (bloqueia durante o ao vivo)',
    url: `https://api.openf1.org/v1/sessions?year=${YEAR}`,
    timeout: 8000, slowMs: 4000,
  },
  {
    id: 'wikipedia',
    label: 'Wikipedia',
    desc: 'REST API — fotos e biografias de pilotos',
    url: 'https://en.wikipedia.org/api/rest_v1/page/summary/Formula_One',
    timeout: 6000, slowMs: 2500,
  },
  {
    id: 'news',
    label: 'Notícias (RSS2JSON)',
    desc: 'api.rss2json.com — feed de notícias PT-BR',
    url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fbr.motorsport.com%2Frss%2Ff1%2Fnews%2F',
    timeout: 8000, slowMs: 4000,
  },
]

async function probe(src) {
  const started = Date.now()
  try {
    const res = await fetch(src.url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(src.timeout),
    })
    // Drena o corpo para fechar a conexão e medir tempo real de resposta útil.
    await res.text().catch(() => {})
    const ms = Date.now() - started
    let status = 'ok'
    if (!res.ok) status = 'degraded'
    else if (ms >= src.slowMs) status = 'degraded'
    return { id: src.id, label: src.label, desc: src.desc, status, code: res.status, ms }
  } catch (err) {
    const ms = Date.now() - started
    const timedOut = /timeout|aborted/i.test(String(err?.name || err?.message || ''))
    return {
      id: src.id, label: src.label, desc: src.desc,
      status: 'down', code: 0, ms,
      error: timedOut ? `timeout (${src.timeout}ms)` : String(err?.message || err),
    }
  }
}

export async function buildHealthResponse() {
  const sources = await Promise.all(SOURCES.map(probe))

  const counts = sources.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1
    return acc
  }, {})
  // Saúde geral: down se algo caiu, degraded se algo está mal, senão ok.
  const overall = counts.down ? 'down' : counts.degraded ? 'degraded' : 'ok'

  return { overall, counts, sources, ts: Date.now() }
}
