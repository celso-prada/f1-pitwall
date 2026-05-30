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
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    const pages = Object.values(data.query?.pages ?? {})
    const rev = pages[0]?.revisions?.[0]
    const wikitext = rev?.slots?.main?.['*'] ?? rev?.['*'] ?? ''
    if (!wikitext) return null

    // Extract a plain integer from an infobox field line (handles commas like 1,566)
    const num = (key) => {
      const m = wikitext.match(new RegExp(`\\|\\s*${key}\\s*=\\s*([\\d,]+)`))
      return m ? parseInt(m[1].replace(/,/g, ''), 10) : null
    }

    // Championships: parse count (single/double digit) and optional year list
    const champLine = wikitext.match(/\|\s*championships\s*=([^\n|]+)/)
    let championships = null
    let championshipYears = []
    if (champLine) {
      const line = champLine[1]
      const countM = line.match(/\b(\d{1,2})\b/)
      championships = countM ? parseInt(countM[1], 10) : null
      championshipYears = [...line.matchAll(/\b(19\d{2}|20\d{2})\b/g)].map(m => m[1])
    }

    return {
      wins: num('wins'),
      poles: num('poles'),
      podiums: num('podiums'),
      championships,
      championshipYears,
    }
  } catch {
    return null
  }
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
