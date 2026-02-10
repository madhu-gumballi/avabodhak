# TTS Migration: Google Cloud TTS → Sarvam.ai + Multi-Layer Caching

## Status: Implementation Complete — Awaiting Testing

---

## What Changed

### Overview
Replaced Google Cloud Text-to-Speech with [Sarvam.ai](https://www.sarvam.ai/) Bulbul v3 across all backends. Added three layers of caching so each unique stotra line is only synthesized once.

### Sarvam.ai Configuration
- **Model**: `bulbul:v3` (latest, launched Feb 2026)
- **Voice**: `amit` (one of 30+ available speakers)
- **Output**: MP3
- **Max text**: 2500 characters (up from 800 with Google)
- **API endpoint**: `https://api.sarvam.ai/text-to-speech`
- **Auth header**: `api-subscription-key: <SARVAM_API_KEY>`

---

## Files Modified (5 files)

### 1. `scripts/tts-server.js` — Node.js dev backend
- **Removed**: `getVoiceName()`, `escapeXml()`, all SSML/mark tag logic, JSON-with-timepoints response, `v1`/`v1beta1` version branching
- **Added**: Sarvam.ai API integration, in-memory `Map` cache for dev
- **Env var**: `SARVAM_API_KEY` (was `GCLOUD_TTS_API_KEY`)
- **Cache**: In-memory `Map<"lang/text", Buffer>` — persists for lifetime of dev server process
- **Headers**: `X-TTS-Cache: hit|miss` indicates cache status

### 2. `src/lib/tts.ts` — Frontend TTS client
- **Added**: Browser Cache API infrastructure (`tts-sarvam-v1` cache name)
  - `getCachedAudio(lang, text)` — checks browser cache
  - `putCachedAudio(lang, text, response)` — stores response clone
  - All cache ops wrapped in try/catch (graceful fallback if Cache API unavailable)
- **Added**: `estimateTimepoints(words, duration)` — distributes audio duration across words by character weight (replaces Google's SSML `<mark>` timepoints)
- **Changed**: `playLine()` checks cache before fetch, logs "cache hit"/"cache miss"
- **Removed**: `words` from request body, JSON-with-timepoints response branch

### 3. `netlify/functions/tts.ts` — Netlify production backend
- **Removed**: `getVoiceName()`, Google Cloud TTS integration
- **Added**: Sarvam.ai API integration
- **Added**: Netlify Blob caching (`@netlify/blobs` package)
  - Uses `connectLambda(event)` for v1 function compatibility
  - Store name: `tts-cache`
  - Cache key: `{lang}/{text}`
  - Check blob on every request; store on cache miss
  - Graceful fallback if blob read/write fails
- **Headers**: `X-TTS-Cache: hit|miss` indicates server-side cache status

### 4. `tts-service/main.go` — Go alternative backend
- **Removed**: `synthesizeWithGoogleTTS()`, `gcloudVoiceParams()`
- **Added**: `synthesizeWithSarvam()`, `sarvamLangCode()`
- **Changed**: `handleTTS` checks `provider == "sarvam"` (was `"gcloud"`)
- **Changed**: Removed `dec.DisallowUnknownFields()` (tolerates extra fields)
- **Changed**: Max text 2500, timeout 15s
- espeak-ng and macOS `say` providers remain unchanged

### 5. `.env.example` — Config template
- `SARVAM_API_KEY` replaces `GCLOUD_TTS_API_KEY`
- Removed `GCLOUD_TTS_VOICE_NAME`
- Added `TTS_PROVIDER=sarvam` comment for Go backend

### New dependency
- `@netlify/blobs` (devDependency) — for server-side caching in Netlify functions

---

## Caching Architecture (3 layers)

```
Request flow for a stotra line:

Browser Cache API          Server Cache              Sarvam API
(tts-sarvam-v1)      (Netlify Blob / in-memory)    (bulbul:v3)
      │                        │                        │
      ▼                        │                        │
  cache.match()                │                        │
      │                        │                        │
  HIT? ──yes──► play audio     │                        │
      │                        │                        │
   no ▼                        │                        │
  fetch /api/tts ─────────► blob.get()                  │
                               │                        │
                           HIT? ──yes──► return MP3     │
                               │                        │
                            no ▼                        │
                          Sarvam API call ◄─────────────┘
                               │
                           blob.set() ◄── store in server cache
                               │
                  ◄────────── return MP3
      │
  cache.put() ◄── store in browser cache
      │
  play audio
```

**Result**: Each unique (lang, text) pair hits Sarvam exactly once _globally_ (across all users). Repeat plays are free at both server and client level.

### Cache TTL
- **Browser Cache API**: Indefinite (no TTL mechanism; persists until user clears data or storage pressure)
- **Netlify Blobs**: Indefinite (persists across deploys)
- **Dev server in-memory**: Lifetime of the process (cleared on restart)

### Cache invalidation
- **Browser**: Bump `TTS_CACHE_NAME` from `tts-sarvam-v1` to `v2` (old entries orphaned)
- **Netlify Blobs**: Manual via Netlify dashboard or `store.delete(key)` / `store.deleteAll()`
- **Dev server**: Restart the process

---

## Testing Checklist

### Local dev server
- [ ] Set `SARVAM_API_KEY` in `.env`
- [ ] `npm run tts:dev` — confirm "Sarvam.ai TTS server listening" log
- [ ] `curl -X POST http://localhost:8081/api/tts -H 'Content-Type: application/json' -d '{"text":"नमस्ते","lang":"deva"}' --output test.mp3` — valid MP3
- [ ] Repeat same curl — console shows "TTS cache hit" (not calling Sarvam again)

### Frontend
- [ ] `npm run dev` — play a stotra line
- [ ] Audio plays correctly
- [ ] Word highlighting advances through the line
- [ ] Console shows "LineTTS: cache miss" on first play
- [ ] Console shows "LineTTS: cache hit" on second play of same line
- [ ] DevTools → Application → Cache Storage → `tts-sarvam-v1` shows entries

### Cross-language
- [ ] Test: deva, knda, tel, tam, iast

### Netlify deploy
- [ ] Deploy to Netlify preview branch
- [ ] First play of a line works (blob cache miss → Sarvam call)
- [ ] Second play (even from different browser) is faster (blob cache hit)
- [ ] Check `X-TTS-Cache` response header in DevTools Network tab

---

## Environment Variables

| Variable | Required | Used by | Description |
|---|---|---|---|
| `SARVAM_API_KEY` | Yes | All backends | Sarvam.ai API subscription key |
| `TTS_PROVIDER` | No | Go backend only | Set to `sarvam` to use Sarvam (default: mac/espeak) |
| `VITE_FEATURE_TTS` | Yes | Frontend | Set to `true` to enable TTS UI |

---

## Not Changed
- `vite.config.ts` — proxy `/api/tts` → `localhost:8081` unchanged
- `netlify.toml` — redirect rule unchanged
- `src/components/VSNViewer.tsx` — still passes `flow.tokens` to `playLine()`
- `src/hooks/useWordFlow.ts`, `src/lib/tokenize.ts` — untouched
- `package.json` scripts — unchanged (only added `@netlify/blobs` devDependency)
