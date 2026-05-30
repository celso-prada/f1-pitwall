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
