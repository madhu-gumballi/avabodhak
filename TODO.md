# Avabodhak TODO

## Completed

- [x] Remove word-by-word TTS and pace slider (simplified to line-level TTS only)
- [x] Switch to Google Cloud TTS
  - Updated `scripts/tts-server.js` to use Google Cloud TTS REST API
  - Updated `netlify/functions/tts.ts` for production deployment
  - Removed `node-edge-tts` dependency from `package.json`
  - Added `GCLOUD_TTS_API_KEY` to `.env` and `.env.example`
  - Configured WaveNet voices for all supported languages (deva, knda, tel, tam, pan, guj, mr, ben, mal, iast)
- [x] Enrich stotra data files
  - Added enhanced metadata to all three stotra files:
    - `vs.lines.new.json`: Added stotraType, composerInfo, chandas (Anushtup), credits, commentaries
    - `hari.lines.json`: Added stotraType, chandas (Shardula Vikridita), poeticDevices, rasa, gunaCategories
    - `keshava.lines.json`: Added stotraType, sampradaya, musicalInfo, namaReferences, regionalGlossary
  - Added sample line-level enrichment:
    - Sri Hari Stotram verse 1: compound breakdowns (samasaVibhaga) for all 7 compounds
    - Keshava Nama verse 1: namaAnalysis with etymology for Keshava and Shrisha

## Testing Checklist

### 1. TTS Testing (Google Cloud)
- [ ] Set `GCLOUD_TTS_API_KEY` in `.env` (get from Google Cloud Console)
- [ ] Run `npm run dev` and verify TTS server starts on port 8081
- [ ] Test line-level TTS in all supported languages:
  - [ ] Hindi (deva) - should use `hi-IN-Wavenet-A`
  - [ ] Kannada (knda) - should use `kn-IN-Wavenet-A`
  - [ ] Telugu (tel) - should use `te-IN-Standard-A`
  - [ ] Tamil (tam) - should use `ta-IN-Wavenet-A`
  - [ ] Gujarati (guj) - should use `gu-IN-Wavenet-A`
  - [ ] Punjabi (pan) - should use `pa-IN-Wavenet-A`
  - [ ] Marathi (mr) - should use `mr-IN-Wavenet-A`
  - [ ] Bengali (ben) - should use `bn-IN-Wavenet-A`
  - [ ] Malayalam (mal) - should use `ml-IN-Wavenet-A`
  - [ ] IAST (iast) - should use `en-IN-Wavenet-A`
- [ ] Verify audio quality is better than Edge TTS
- [ ] Test error handling when API key is missing

### 2. Navigation Testing
- [ ] Arrow keys (left/right) navigate between lines
- [ ] Arrow keys (up/down) for chapter navigation if available
- [ ] Swipe gestures work on mobile (left/right)
- [ ] Timeline/progress bar allows jumping to specific lines
- [ ] Chapter dropdown navigates to correct chapter start

### 3. Settings Menu Testing
- [ ] Pronunciation helper toggle works
- [ ] Artwork toggle shows/hides images
- [ ] Language selector changes display script
- [ ] Settings persist across page reloads (localStorage)

### 4. Chapter Navigation
- [ ] Chapter headers display correctly
- [ ] Jumping to chapters works via menu
- [ ] Chapter indicator shows current position

### 5. Mobile Device Testing
- [ ] Test on iOS Safari
- [ ] Test on Android Chrome
- [ ] Touch interactions work (tap to play, swipe to navigate)
- [ ] TTS plays correctly (Safari audio unlock workaround)
- [ ] UI is responsive and readable

### 6. Production Deployment (Netlify)
- [ ] Set `GCLOUD_TTS_API_KEY` in Netlify environment variables
- [ ] Deploy and test TTS function works in production
- [ ] Verify CORS headers are correct

## Future Enhancements

### Data Enrichment (Ongoing)
- [ ] Add more line-level etymologies to VSN nama section
- [ ] Add translations/meanings to remaining lines
- [ ] Add avatar references where applicable
- [ ] Add commentary excerpts from major acharyas
