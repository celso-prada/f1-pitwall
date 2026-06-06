// Núcleo compartilhado do feed AO VIVO oficial da F1 (livetiming.formula1.com).
//
// O OpenF1 passou a BLOQUEAR todo acesso durante sessões ao vivo (exige chave
// paga). A única fonte gratuita com dados em tempo real é o feed oficial via
// SignalR Core. O browser não consegue consumi-lo direto (negotiate sem CORS +
// a WebSocket API do navegador não deixa enviar Cookie/headers), então este
// código roda no servidor (função serverless do Vercel em prod, plugin do Vite
// em dev) e devolve um snapshot JSON ao cliente.
//
// Truque que torna isso compatível com Vercel: ao conectar, o método `Subscribe`
// do SignalR responde com o ESTADO ATUAL COMPLETO da sessão (mensagem type 3).
// Não é preciso manter o socket aberto — cada poll abre, pega o snapshot e
// fecha em ~1-2s, dentro do limite de uma função serverless.
import WebSocket from 'ws'
import zlib from 'node:zlib'

const HUB = 'https://livetiming.formula1.com/signalrcore'
const STATUS_URL = 'https://livetiming.formula1.com/static/StreamingStatus.json'
const RS = String.fromCharCode(0x1e) // record separator do SignalR Core
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126 Safari/537.36'

// Tópicos do feed. CarData.z/Position.z são best-effort (nem sempre chegam no
// snapshot inicial); o resto forma a tela de timing completa.
const TOPICS = [
  'Heartbeat', 'ExtrapolatedClock', 'TopThree', 'TimingStats', 'TimingAppData',
  'WeatherData', 'TrackStatus', 'DriverList', 'RaceControlMessages', 'SessionInfo',
  'SessionData', 'LapCount', 'TimingData', 'TeamRadio', 'PitLaneTimeCollection',
  'TyreStintSeries', 'SessionStatus', 'CarData.z', 'Position.z',
]

function inflate(b64) {
  try { return JSON.parse(zlib.inflateRawSync(Buffer.from(b64, 'base64')).toString()) }
  catch { return null }
}

// Há sessão transmitindo agora? StreamingStatus.json é minúsculo e público.
export async function getStreamingStatus() {
  try {
    const r = await fetch(STATUS_URL, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(6000) })
    const txt = (await r.text()).replace(/^﻿/, '') // tira BOM
    return JSON.parse(txt)?.Status || 'Offline'
  } catch { return 'Offline' }
}

// Abre o feed, captura o snapshot inicial e fecha. Resolve em ~1-2s.
export async function fetchLiveSnapshot({ timeoutMs = 8000 } = {}) {
  const neg = await fetch(`${HUB}/negotiate?negotiateVersion=1`, {
    method: 'POST', headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(6000),
  })
  if (!neg.ok) throw new Error(`negotiate ${neg.status}`)
  const setCookie = neg.headers.get('set-cookie') || ''
  const cookie = setCookie.split(',').map(c => c.split(';')[0].trim()).filter(Boolean).join('; ')
  const { connectionToken } = await neg.json()
  if (!connectionToken) throw new Error('sem connectionToken')

  const url = `wss://livetiming.formula1.com/signalrcore?id=${encodeURIComponent(connectionToken)}`
  const ws = new WebSocket(url, {
    headers: { 'User-Agent': UA, Cookie: cookie, Origin: 'https://livetiming.formula1.com' },
  })

  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { try { ws.terminate() } catch {} ; reject(new Error('timeout')) }, timeoutMs)
    const done = (fn, arg) => { clearTimeout(timer); try { ws.close() } catch {} ; fn(arg) }

    ws.on('open', () => {
      ws.send(JSON.stringify({ protocol: 'json', version: 1 }) + RS)
      ws.send(JSON.stringify({ type: 1, target: 'Subscribe', arguments: [TOPICS], invocationId: '0' }) + RS)
    })
    ws.on('message', (data) => {
      for (const part of data.toString().split(RS).filter(Boolean)) {
        let m; try { m = JSON.parse(part) } catch { continue }
        if (m.type === 3 && m.result) {
          const snap = { ...m.result }
          if (snap['CarData.z']) { snap.CarData = inflate(snap['CarData.z']); delete snap['CarData.z'] }
          if (snap['Position.z']) { snap.Position = inflate(snap['Position.z']); delete snap['Position.z'] }
          done(resolve, snap)
          return
        }
      }
    })
    ws.on('error', (e) => done(reject, e instanceof Error ? e : new Error('ws error')))
    ws.on('close', () => { clearTimeout(timer) })
  })
}

// Resposta unificada usada pelos dois handlers (serverless + vite dev).
export async function buildLiveResponse() {
  const status = await getStreamingStatus()
  if (status !== 'Available') return { live: false, status, ts: Date.now() }
  try {
    const snapshot = await fetchLiveSnapshot()
    return { live: true, status, snapshot, ts: Date.now() }
  } catch (err) {
    // Streaming disse "Available" mas a captura falhou — reporta como não-live
    // para o cliente cair no fallback (OpenF1/última sessão) sem travar.
    return { live: false, status, error: String(err?.message || err), ts: Date.now() }
  }
}
