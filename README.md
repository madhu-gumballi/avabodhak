# Avabodhak - Stotra Maala

Modern, mobile-friendly reader for Vishnu Sahasranama with segmented word flow, search, pronunciation help, and optional TTS.

## Tech
- React 18 + TypeScript, Vite 5
- Tailwind CSS 3
- Vitest + Testing Library

## Run locally
Requirements: Node.js ≥ 18, npm.

```bash
npm install

# Optional: copy env and enable features as needed
cp .env.example .env

# Start app + local TTS dev server
npm run dev
```

App: http://localhost:5173

## Text-to-speech
- Frontend calls `POST /api/tts` (see `src/lib/tts.ts`).
- Dev: Node TTS server (`scripts/tts-server.js`) on `TTS_PORT` (default 8081).
- Feature flag: set `VITE_FEATURE_TTS=true` in `.env`.
- Supported UI languages: `deva`, `knda`, `tel`, `tam`, `eng`, `guj`, `pun`

## Build & deploy
```bash
npm run build
npm run preview
```

- Output: static files in `dist/`.
