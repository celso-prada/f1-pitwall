const RSS2JSON = 'https://api.rss2json.com/v1/api.json?rss_url='

const SIX_MONTHS_AGO = (() => {
  const d = new Date()
  d.setMonth(d.getMonth() - 6)
  return d.toISOString().slice(0, 10)
})()

function gnews(q) {
  return `https://news.google.com/rss/search?q=${q}&hl=pt-BR&gl=BR&ceid=BR:pt-419`
}

const FEEDS = [
  { url: 'https://br.motorsport.com/rss/f1/news/', source: 'Motorsport BR' },
  { url: gnews(`Formula+1+F1+after:${SIX_MONTHS_AGO}`), source: 'Google News' },
  { url: gnews(`F1+GP+corrida+after:${SIX_MONTHS_AGO}`), source: 'Google News' },
  { url: gnews(`Formula1+piloto+equipe+after:${SIX_MONTHS_AGO}`), source: 'Google News' },
  { url: gnews(`F1+campeonato+resultado+after:${SIX_MONTHS_AGO}`), source: 'Google News' },
]

function parseItems(data, source) {
  return (data.items || []).map(item => {
    const image = item.thumbnail
      || item.enclosure?.link
      || item.content?.match(/https?:\/\/[^"'\s]+\.(jpg|jpeg|png|webp)/i)?.[0]

    const description = item.description
      ?.replace(/<[^>]+>/g, '')
      ?.replace(/&[a-z]+;/g, ' ')
      ?.trim()
      ?.slice(0, 120)

    return {
      title: item.title?.trim(),
      link: item.link?.trim(),
      pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
      source,
      description,
      image,
    }
  }).filter(i => i.title && i.link)
}

async function fetchFeed(feed) {
  try {
    const encoded = encodeURIComponent(feed.url)
    const res = await fetch(`${RSS2JSON}${encoded}`, { signal: AbortSignal.timeout(8000) })
    const data = await res.json()
    if (data.status !== 'ok') return []
    return parseItems(data, feed.source)
  } catch {
    return []
  }
}

export async function getF1News() {
  const results = await Promise.allSettled(FEEDS.map(fetchFeed))
  const all = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value)
    .sort((a, b) => b.pubDate - a.pubDate)

  const seen = new Set()
  return all.filter(item => {
    const key = item.title?.toLowerCase().slice(0, 40)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
