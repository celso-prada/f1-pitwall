# Fontes de Dados — F1 Pitwall

Mapa de **onde cada tipo de dado vem**, a ordem de **fallback** (redundância) e
por quê. Princípio: nenhuma fonte é confiável sozinha, então quase tudo tem um
plano B. Atualize este arquivo ao mexer em qualquer fonte.

> Substitui o snapshot de status de 2026-06-01. A arquitetura mudou: o ao vivo
> agora roda sobre o **feed oficial** (não mais OpenF1, que bloqueia ao vivo).

## Resumo por tipo de dado

| Dado | Fonte primária | Fallback(s) | Onde no código |
|---|---|---|---|
| **Ao vivo (timing)** | Feed oficial `signalrcore` (serverless `/api/live`) | — (OpenF1 bloqueia ao vivo) | `api/_f1live.mjs`, `api/live.js`, `src/api/livetiming.js` |
| **Classificação / calendário / resultados** | Jolpica (Ergast) | f1api.dev | `src/api/jolpica.js` (`withFallback`) |
| **Resultados por circuito** | Jolpica | Wikipedia (reconstrói vencedores) | `src/api/jolpica.js` + `src/api/wikipedia.js` |
| **Stats de carreira do piloto** | Jolpica | infobox da Wikipedia | `src/api/jolpica.js`, `src/api/wikipedia.js` |
| **Foto/bio de piloto e equipe** | Wikipedia (EN foto + PT-BR bio) | foto do feed oficial (`HeadshotUrl`) | `src/api/wikipedia.js`, `src/hooks/useDriverPhotos.js` |
| **Telemetria pós-sessão** | OpenF1 (`car_data`/`laps`) | arquivo oficial (ver 4.1) | `src/api/telemetry.js` |
| **Notícias** | Google News / Motorsport via RSS2JSON | — | `src/api/news.js` |
| **Saúde das fontes** | `/api/health` (probes server-side) | — | `api/_health.mjs`, página `/status` |

## A camada de fallback (o "resolver")

A consolidação da estratégia vive em **`src/api/jolpica.js → withFallback()`**,
o resolver usado por todas as leituras de dados históricos. Três camadas:

1. **Breaker aberto** → pula a Jolpica e vai direto ao f1api.dev (instantâneo).
   A Jolpica fica "marcada como fora" por 10 min (persistido em `localStorage`),
   então uma queda não faz cada navegação pagar o timeout.
2. **Breaker fechado** → tenta a Jolpica, mas se ela não responder em
   `HEDGE_MS` (1,5s), dispara o f1api.dev em paralelo e usa quem terminar antes
   (preferindo a Jolpica, mais rica, se ela ganhar a corrida).
3. **Erro da Jolpica** → marca como fora e usa o f1api.dev.

Quando o f1api.dev também não cobre (ex.: resultados por circuito), o fallback
final reconstrói o dado da **Wikipedia**. A página **`/status`** mostra a saúde
de cada upstream em tempo real.

## Ao vivo: por que o feed oficial

O **OpenF1 bloqueia o acesso durante a sessão ao vivo** (exige chave paga) e
tanto ele quanto a Jolpica são instáveis. A única fonte gratuita em tempo real é
o **feed oficial da F1** (`livetiming.formula1.com/signalrcore`). O browser não
consegue consumi-lo direto (negotiate sem CORS + a WebSocket API não deixa
enviar Cookie/headers), então o trabalho roda no servidor: a cada poll, abre o
SignalR, captura o **snapshot completo** (mensagem `type 3` do `Subscribe`),
fecha em ~1-2s e devolve JSON ao cliente. Cache de borda curto (`s-maxage=3`)
faz muitos espectadores compartilharem uma captura. Em dev, o mesmo core é
servido por um plugin do Vite (não precisa de `vercel dev`).

## Arquivo estático oficial (pós-sessão) — VERIFICADO (2026-06)

Base: `https://livetiming.formula1.com/static/{Path}`, onde `Path` vem do
`Index.json` do ano (`.../static/{ano}/Index.json`). Após a sessão, os tópicos
ficam disponíveis como arquivos `*.jsonStream` (sem rate-limit, sem o lockout do
ao vivo). **Confirmado acessível** (probe na corrida de Abu Dhabi 2025):

| Arquivo | Conteúdo | Tamanho típico |
|---|---|---|
| `TimingData.jsonStream` | timing completo: posição, gaps, setores, melhores voltas | ~6,5 MB |
| `TimingAppData.jsonStream` | stints, pneu, grid | ~95 KB |
| `TimingDataF1.jsonStream` | timing alternativo | ~4 MB |
| `SessionInfo.jsonStream` | metadados da sessão | ~2 KB |
| `CarData.z.jsonStream` | telemetria (speed/throttle/brake/gear/rpm/drs), base64+deflate | ~7,5 MB |
| `Position.z.jsonStream` | posição X/Y/Z (mapa de pista), base64+deflate | ~8 MB |

- `Laps.jsonStream` retorna **403** — dados de volta vêm dentro do `TimingData`.
- **Formato:** linhas separadas por `\r\n`, cada uma `HH:MM:SS.mmm{json-delta}`.
  O estado final é a aplicação em ordem de todos os deltas (mesmo modelo do feed
  ao vivo), então o parser do `normalizeLive` é reaproveitável após o merge. Os
  timestamps por linha são a base natural para o **replay** (3.1).
- **Implicação 4.1:** `CarData.z`/`Position.z` **ficam acessíveis no estático
  após a sessão** (no ao vivo, não). Logo dá pra ter telemetria de todos +
  mapa de pista sem depender do OpenF1.

## Referência rápida — OpenF1 (pós-sessão / telemetria)

`api.openf1.org/v1` (3 req/s, 30 req/min no free; bloqueia AO VIVO):
`/sessions`, `/drivers` (headshot + team_colour), `/session_result`, `/position`,
`/stints`, `/pit`, `/weather`, `/race_control`, `/team_radio`, `/car_data`,
`/intervals`, `/laps`. Usado hoje em `/telemetria` e no modo histórico do `/live`.

## Pendências relacionadas (ROADMAP)

- **1.2** — usar `TimingData/TimingAppData` do estático como primária dos
  resultados pós-sessão (OpenF1/Jolpica viram fallback). Formato já verificado.
- **4.1** — telemetria pós-sessão pelo `CarData.z`/`Position.z` do estático.
- **3.1** — replay (timeline scrub) lendo o stream com timestamps por delta.
