#!/usr/bin/env bash
# One-time script to force-refresh corrupted TTS cache for
# Sri Venkateshwara Stotram verses 1-2.
# Run after deploying the updated Netlify TTS function with force support.
#
# Usage: bash scripts/clear-tts-cache.sh [BASE_URL]
#   BASE_URL defaults to https://avabodhak.netlify.app

set -euo pipefail

BASE_URL="${1:-https://avabodhak.netlify.app}"
ENDPOINT="${BASE_URL}/api/tts"

echo "=== Clearing TTS cache for Venkateshwara verses 1-2 ==="
echo "Endpoint: ${ENDPOINT}"
echo ""

# Verse 1 (line index 2 in venkateshwara.lines.json)
VERSE1="ವೇಂಕಟೇಶೋ ವಾಸುದೇವಃ ಪ್ರದ್ಯುಮ್ನೋಽಮಿತವಿಕ್ರಮಃ ಸಂಕರ್ಷಣೋಽನಿರುದ್ಧಶ್ಚ ಶೇಷಾದ್ರಿಪತಿರೇವ ಚ"

# Verse 2 (line index 3 in venkateshwara.lines.json)
VERSE2="ಜನಾರ್ದನಃ ಪದ್ಮನಾಭೋ ವೇಂಕಟಾಚಲವಾಸನಃ ಸೃಷ್ಟಿಕರ್ತಾ ಜಗನ್ನಾಥೋ ಮಾಧವೋ ಭಕ್ತವತ್ಸಲಃ"

echo "Force-refreshing verse 1..."
curl -s -o /dev/null -w "HTTP %{http_code} (%{size_download} bytes)\n" \
  -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg text "$VERSE1" --arg lang "knda" '{text: $text, lang: $lang, force: true}')"

echo "Force-refreshing verse 2..."
curl -s -o /dev/null -w "HTTP %{http_code} (%{size_download} bytes)\n" \
  -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg text "$VERSE2" --arg lang "knda" '{text: $text, lang: $lang, force: true}')"

echo ""
echo "Done. Verify by playing verses 1-2 in the app."
