const BASE = 'https://en.wikipedia.org/api/rest_v1/page/summary'

export async function getWikipediaImage(wikiUrl) {
  if (!wikiUrl) return null
  const title = wikiUrl.split('/wiki/')[1]
  if (!title) return null
  try {
    const res = await fetch(`${BASE}/${title}`, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return null
    const data = await res.json()
    return data.thumbnail?.source ?? null
  } catch {
    return null
  }
}
