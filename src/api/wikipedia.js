const EN_SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/summary'
const PT_SUMMARY = 'https://pt.wikipedia.org/api/rest_v1/page/summary'
const EN_LANGLINKS = 'https://en.wikipedia.org/w/api.php'

// Fetches driver photo (EN Wikipedia, Wikimedia Commons) + bio extract in PT-BR.
// wikiUrl comes from Jolpica driver.url field (always EN Wikipedia).
export async function getWikipediaDriverData(wikiUrl) {
  if (!wikiUrl) return null
  const enTitle = decodeURIComponent(wikiUrl.split('/wiki/')[1] ?? '')
  if (!enTitle) return null

  try {
    // Parallel: EN summary (photo) + langlinks to find PT article title
    const [enRes, langRes] = await Promise.allSettled([
      fetch(`${EN_SUMMARY}/${encodeURIComponent(enTitle)}`, { signal: AbortSignal.timeout(6000) }),
      fetch(`${EN_LANGLINKS}?action=query&titles=${encodeURIComponent(enTitle)}&prop=langlinks&lllang=pt&format=json&origin=*`, { signal: AbortSignal.timeout(5000) }),
    ])

    const enData = enRes.status === 'fulfilled' && enRes.value.ok
      ? await enRes.value.json() : null

    const photo = enData?.thumbnail?.source ?? null
    const photoOriginal = enData?.originalimage?.source ?? null
    let extract = null

    // Try PT-BR Wikipedia for bio text
    if (langRes.status === 'fulfilled' && langRes.value.ok) {
      const langData = await langRes.value.json()
      const pages = Object.values(langData.query?.pages ?? {})
      const ptTitle = pages[0]?.langlinks?.[0]?.['*']
      if (ptTitle) {
        try {
          const ptRes = await fetch(`${PT_SUMMARY}/${encodeURIComponent(ptTitle)}`, { signal: AbortSignal.timeout(5000) })
          if (ptRes.ok) {
            const ptData = await ptRes.json()
            extract = ptData.extract ?? null
          }
        } catch { /* no PT article, use EN fallback below */ }
      }
    }

    // Fallback to EN extract if no PT found
    if (!extract) extract = enData?.extract ?? null

    if (!photo && !extract) return null
    return { photo, photoOriginal, extract }
  } catch {
    return null
  }
}

// Parses Wikipedia infobox wikitext to extract structured F1 driver career stats.
// Used as fallback when Jolpica/Ergast API has incomplete historical data.
export async function getWikipediaDriverStats(wikiUrl) {
  if (!wikiUrl) return null
  const enTitle = decodeURIComponent(wikiUrl.split('/wiki/')[1] ?? '')
  if (!enTitle) return null

  try {
    const res = await fetch(
      `${EN_LANGLINKS}?action=query&titles=${encodeURIComponent(enTitle)}&prop=revisions&rvprop=content&rvsection=0&format=json&origin=*`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    const pages = Object.values(data.query?.pages ?? {})
    const rev = pages[0]?.revisions?.[0]
    const wikitext = rev?.slots?.main?.['*'] ?? rev?.['*'] ?? ''
    if (!wikitext) return null

    // Extract integer from an infobox field.
    // Handles: |key = 103  |key=103  |key = {{tpl}} 103  |key = 1,234
    const num = (key) => {
      // Exact match — most common case
      let m = wikitext.match(new RegExp(`\\|\\s*${key}\\s*=\\s*([\\d,]+)`))
      if (m) {
        const n = parseInt(m[1].replace(/,/g, ''), 10)
        if (!isNaN(n)) return n
      }
      // Fallback — skip over templates/markup then grab first number on the field line
      m = wikitext.match(new RegExp(`\\|\\s*${key}\\s*=[^|\\n]*?\\b([\\d,]+)\\b`))
      if (m) {
        const n = parseInt(m[1].replace(/,/g, ''), 10)
        if (!isNaN(n)) return n
      }
      return null
    }

    // Championships: parse count and optional year list
    const champLine = wikitext.match(/\|\s*championships\s*=([^\n|]+)/)
    let championships = null
    let championshipYears = []
    if (champLine) {
      const line = champLine[1]
      const countM = line.match(/\b(\d{1,2})\b/)
      championships = countM ? parseInt(countM[1], 10) : null
      championshipYears = [...line.matchAll(/\b(19\d{2}|20\d{2})\b/g)].map(m => m[1])
    }

    const wins    = num('wins')
    const poles   = num('poles')
    const podiums = num('podiums')

    // Return null only if absolutely nothing was found
    if (wins == null && poles == null && championships == null) return null

    return { wins, poles, podiums, championships, championshipYears }
  } catch {
    return null
  }
}

// --- Circuit all-time winners (alternative route for getCircuitResults) ------
// Jolpica's per-circuit results are dead with no equivalent on f1api.dev, so we
// reconstruct the winner-by-year list from the Grand Prix article on Wikipedia,
// exactly the kind of wiki fallback already used for driver photos/bios.

const WIKI_PARSE = 'https://en.wikipedia.org/w/api.php'

// circuitId → Grand Prix article title(s). Circuits that hosted differently
// named races (Imola = San Marino + Emilia Romagna, Interlagos = Brazilian +
// São Paulo) merge several articles. Keys cover both Ergast and f1api id spellings.
const CIRCUIT_GP_TITLES = {
  bahrain: ['Bahrain Grand Prix'], bahrein: ['Bahrain Grand Prix'],
  jeddah: ['Saudi Arabian Grand Prix'],
  albert_park: ['Australian Grand Prix'],
  suzuka: ['Japanese Grand Prix'],
  shanghai: ['Chinese Grand Prix'],
  miami: ['Miami Grand Prix'],
  imola: ['Emilia Romagna Grand Prix', 'San Marino Grand Prix'],
  monaco: ['Monaco Grand Prix'],
  villeneuve: ['Canadian Grand Prix'], gilles_villeneuve: ['Canadian Grand Prix'],
  catalunya: ['Spanish Grand Prix'], montmelo: ['Spanish Grand Prix'],
  madrid: ['Spanish Grand Prix'],
  red_bull_ring: ['Austrian Grand Prix'],
  silverstone: ['British Grand Prix'],
  hungaroring: ['Hungarian Grand Prix'],
  spa: ['Belgian Grand Prix'],
  zandvoort: ['Dutch Grand Prix'],
  monza: ['Italian Grand Prix'],
  baku: ['Azerbaijan Grand Prix'],
  marina_bay: ['Singapore Grand Prix'],
  americas: ['United States Grand Prix'], austin: ['United States Grand Prix'],
  rodriguez: ['Mexican Grand Prix', 'Mexico City Grand Prix'],
  hermanos_rodriguez: ['Mexican Grand Prix', 'Mexico City Grand Prix'],
  interlagos: ['São Paulo Grand Prix', 'Brazilian Grand Prix'],
  losail: ['Qatar Grand Prix'], lusail: ['Qatar Grand Prix'],
  yas_marina: ['Abu Dhabi Grand Prix'],
  vegas: ['Las Vegas Grand Prix'],
}

// IOC (flagicon) 3-letter codes → nationality demonym used by DRIVER_NAT_CODE.
const IOC_DEMONYM = {
  GBR: 'British', NED: 'Dutch', ESP: 'Spanish', MON: 'Monegasque', MEX: 'Mexican',
  AUS: 'Australian', CAN: 'Canadian', BRA: 'Brazilian', FRA: 'French', GER: 'German',
  FIN: 'Finnish', JPN: 'Japanese', USA: 'American', CHN: 'Chinese', THA: 'Thai',
  DEN: 'Danish', ITA: 'Italian', AUT: 'Austrian', ARG: 'Argentine', SUI: 'Swiss',
  NZL: 'New Zealander', POL: 'Polish', SWE: 'Swedish', BEL: 'Belgian', RSA: 'South African',
  COL: 'Colombian', VEN: 'Venezuelan', CZE: 'Czech', POR: 'Portuguese', IRL: 'Irish',
}

const deburr = s => s.normalize('NFD').replace(/\p{Diacritic}/gu, '')

const cleanConstructor = name => {
  if (!name) return null
  let n = name.replace(' in Formula One', '').replace(/^Scuderia /, '').replace(/^Team /, '').trim()
  const MAP = { 'Mercedes-Benz': 'Mercedes', 'Red Bull Racing': 'Red Bull', 'Team Lotus': 'Lotus' }
  return MAP[n] ?? n
}

// Parse the "By year" winners table out of a GP article's wikitext.
function parseWinners(text) {
  const out = {}
  for (const row of text.split('\n|-')) {
    if (/background:#(fcc|ff9|fc9)/.test(row)) continue // non-championship / pre-war
    // Year must come from a table header cell (`!`), otherwise the article
    // lead/infobox (which links the "first race" year and mentions record
    // winners by name) is mis-read as a winner row — e.g. Monaco 1950 → Senna.
    const ym = row.match(/!\s*\{\{F1\|(\d{4})\}\}/) || row.match(/!\s*\[\[(\d{4})\b/)
    const fm = row.match(/\{\{flagicon\|([A-Za-z]{2,3})/)
    if (!ym || !fm) continue
    const year = parseInt(ym[1], 10)
    if (year < 1950 || out[year]) continue
    const after = row.slice(row.indexOf(fm[0]) + fm[0].length)
    const dm = after.match(/\[\[([^\]|]+?)(?:\|[^\]]*)?\]\]/)
    if (!dm) continue
    const driver = dm[1].replace(/\s*\([^)]*\)\s*$/, '').trim()
    let constructor = null
    for (const m of row.matchAll(/\n\|\s*\[\[([^\]|]+?)(?:\|[^\]]*)?\]\]/g)) {
      const c = m[1]
      if (/Report/.test(c) || /\d{4}/.test(c)) continue
      constructor = cleanConstructor(c); break
    }
    out[year] = { year, ioc: fm[1].toUpperCase(), driver, constructor }
  }
  return out
}

async function fetchWikitext(title) {
  const url = `${WIKI_PARSE}?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json&redirects=1&origin=*`
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) return ''
  const data = await res.json()
  return data.parse?.wikitext?.['*'] ?? ''
}

// Returns winners newest-first in the Ergast race shape CircuitPage consumes.
export async function getCircuitWinners(circuitId, country) {
  const titles = CIRCUIT_GP_TITLES[circuitId]
    ?? (country ? [`${country} Grand Prix`] : [])
  if (!titles.length) return []

  const texts = await Promise.allSettled(titles.map(fetchWikitext))
  const merged = {}
  for (const t of texts) {
    if (t.status !== 'fulfilled' || !t.value) continue
    const rows = parseWinners(t.value)
    for (const [year, w] of Object.entries(rows)) {
      if (!merged[year]) merged[year] = w
    }
  }

  return Object.values(merged)
    .sort((a, b) => b.year - a.year)
    .map(w => {
      const parts = w.driver.split(' ')
      const familyName = parts.length > 1 ? parts.slice(1).join(' ') : w.driver
      const givenName = parts.length > 1 ? parts[0] : ''
      const driverId = deburr(parts.at(-1) ?? w.driver).toLowerCase().replace(/[^a-z]/g, '')
      return {
        season: String(w.year),
        Results: [{
          position: '1',
          Driver: { driverId, givenName, familyName, nationality: IOC_DEMONYM[w.ioc] ?? null },
          Constructor: { name: w.constructor ?? '—' },
        }],
      }
    })
}

// Generic image fetch (circuits, teams) — kept simple
export async function getWikipediaImage(wikiUrl) {
  if (!wikiUrl) return null
  const title = wikiUrl.split('/wiki/')[1]
  if (!title) return null
  try {
    const res = await fetch(`${EN_SUMMARY}/${encodeURIComponent(title)}`, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return null
    const data = await res.json()
    return data.thumbnail?.source ?? null
  } catch {
    return null
  }
}
