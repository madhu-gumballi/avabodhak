import { Handler } from '@netlify/functions';
import { connectLambda, getStore } from '@netlify/blobs';

const TTS_BLOB_STORE = 'tts-cache';

// Map language codes to BCP-47 language codes for Sarvam.ai
function getLanguageCode(lang: string): string {
    const langMap: Record<string, string> = {
        'deva': 'hi-IN',   // Devanagari → Hindi
        'iast': 'en-IN',   // IAST transliteration → English (India)
        'knda': 'kn-IN',   // Kannada
        'tel': 'te-IN',    // Telugu
        'tam': 'ta-IN',    // Tamil
        'guj': 'gu-IN',    // Gujarati
        'pan': 'pa-IN',    // Punjabi
        'mr': 'mr-IN',     // Marathi
        'ben': 'bn-IN',    // Bengali
        'mal': 'ml-IN',    // Malayalam
    };
    return langMap[lang] || 'hi-IN';
}

// Build a cache key from language + text
function blobCacheKey(lang: string, text: string): string {
    return `${lang}/${text}`;
}

const handler: Handler = async (event, context) => {
    // Initialize Netlify Blobs for Lambda-compatible functions
    connectLambda(event);

    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: 'Method Not Allowed',
            headers: { 'Allow': 'POST' }
        };
    }

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
            },
            body: '',
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { text, lang } = body;

        if (!text) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Text is required' })
            };
        }

        if (text.length > 2500) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Text too long (max 2500 characters)' })
            };
        }

        const apiKey = process.env.SARVAM_API_KEY;
        if (!apiKey) {
            console.error('SARVAM_API_KEY not set');
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'TTS service not configured' })
            };
        }

        const languageCode = getLanguageCode(lang);
        const cacheKey = blobCacheKey(lang, text);

        // Check Netlify Blob cache first
        let audioBase64: string | undefined;
        try {
            const store = getStore(TTS_BLOB_STORE);
            const cached = await store.get(cacheKey);
            if (cached) {
                console.log(`TTS blob cache hit: ${cacheKey.substring(0, 40)}`);
                audioBase64 = cached;
            }
        } catch (err) {
            console.warn('Blob cache read error (proceeding without cache):', err);
        }

        // Cache miss — call Sarvam API
        if (!audioBase64) {
            console.log(`TTS blob cache miss: ${cacheKey.substring(0, 40)}`);

            const sarvamBody = {
                text,
                target_language_code: languageCode,
                model: 'bulbul:v3',
                speaker: 'amit',
                output_audio_codec: 'mp3',
            };

            const response = await fetch('https://api.sarvam.ai/text-to-speech', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-subscription-key': apiKey,
                },
                body: JSON.stringify(sarvamBody),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Sarvam TTS error: ${response.status} - ${errorText}`);
                return {
                    statusCode: 500,
                    body: JSON.stringify({ error: 'TTS synthesis failed' })
                };
            }

            const data = await response.json() as { audios?: string[] };

            if (!data.audios?.[0]) {
                console.error('Sarvam TTS returned empty audios');
                return {
                    statusCode: 500,
                    body: JSON.stringify({ error: 'TTS returned no audio' })
                };
            }

            audioBase64 = data.audios[0];

            // Store in Netlify Blob cache (fire-and-forget, don't block response)
            try {
                const store = getStore(TTS_BLOB_STORE);
                await store.set(cacheKey, audioBase64);
                console.log(`TTS blob cache stored: ${cacheKey.substring(0, 40)}`);
            } catch (err) {
                console.warn('Blob cache write error:', err);
            }
        }

        // Return base64-encoded MP3 audio
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'X-TTS-Provider': 'sarvam',
                'X-TTS-Lang': languageCode,
                'X-TTS-Cache': audioBase64 === undefined ? 'miss' : 'hit',
            },
            body: audioBase64,
            isBase64Encoded: true
        };

    } catch (error) {
        console.error('TTS Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to generate speech' })
        };
    }
};

export { handler };
