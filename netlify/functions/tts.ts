import { Handler } from '@netlify/functions';

// Map language codes to Google Cloud TTS language codes
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

// Get voice name for better quality
function getVoiceName(lang: string): string {
    // Google Cloud TTS WaveNet voices for higher quality
    const voiceMap: Record<string, string> = {
        'deva': 'hi-IN-Wavenet-A',
        'knda': 'kn-IN-Wavenet-A',
        'tel': 'te-IN-Standard-A',
        'tam': 'ta-IN-Wavenet-A',
        'guj': 'gu-IN-Wavenet-A',
        'pan': 'pa-IN-Wavenet-A',
        'mr': 'mr-IN-Wavenet-A',
        'ben': 'bn-IN-Wavenet-A',
        'mal': 'ml-IN-Wavenet-A',
        'iast': 'en-IN-Wavenet-A',
    };
    return process.env.GCLOUD_TTS_VOICE_NAME || voiceMap[lang] || '';
}

const handler: Handler = async (event, context) => {
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
        const { text, lang, granularity } = body;

        if (!text) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Text is required' })
            };
        }

        if (text.length > 800) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Text too long (max 800 characters)' })
            };
        }

        const apiKey = process.env.GCLOUD_TTS_API_KEY;
        if (!apiKey) {
            console.error('GCLOUD_TTS_API_KEY not set');
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'TTS service not configured' })
            };
        }

        const languageCode = getLanguageCode(lang);
        const voiceName = getVoiceName(lang);

        // Build request body for Google Cloud TTS
        const requestBody: {
            input: { text: string };
            voice: { languageCode: string; name?: string };
            audioConfig: { audioEncoding: string; speakingRate: number };
        } = {
            input: { text },
            voice: {
                languageCode,
            },
            audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: granularity === 'verse' ? 0.85 : granularity === 'line' ? 0.9 : 1.0,
            },
        };

        // Add specific voice name if available
        if (voiceName) {
            requestBody.voice.name = voiceName;
        }

        // Call Google Cloud TTS REST API
        const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Google TTS error: ${response.status} - ${errorText}`);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'TTS synthesis failed' })
            };
        }

        const data = await response.json() as { audioContent?: string };

        if (!data.audioContent) {
            console.error('Google TTS returned empty audioContent');
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'TTS returned no audio' })
            };
        }

        // Return base64-encoded audio
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'X-TTS-Provider': 'gcloud',
                'X-TTS-Lang': languageCode,
            },
            body: data.audioContent,
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
