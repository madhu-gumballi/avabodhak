import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const port = process.env.TTS_PORT || 8081;

app.use(cors());
app.use(express.json());

// In-memory cache: Map<"lang/text", Buffer>
// Persists for the lifetime of the dev server process
const audioCache = new Map();

// Map language codes to BCP-47 language codes for Sarvam.ai
function getLanguageCode(lang) {
    const langMap = {
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

app.post('/api/tts', async (req, res) => {
    try {
        const { text, lang } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        if (text.length > 2500) {
            return res.status(400).json({ error: 'Text too long (max 2500 characters)' });
        }

        const apiKey = process.env.SARVAM_API_KEY;
        if (!apiKey) {
            console.error('SARVAM_API_KEY not set');
            return res.status(500).json({ error: 'TTS service not configured' });
        }

        const languageCode = getLanguageCode(lang);
        const cacheKey = `${lang}/${text}`;

        // Check in-memory cache
        const cached = audioCache.get(cacheKey);
        if (cached) {
            console.log(`TTS cache hit: "${text.substring(0, 30)}..." (${cached.length} bytes)`);
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Length', cached.length);
            res.setHeader('X-TTS-Provider', 'sarvam');
            res.setHeader('X-TTS-Lang', languageCode);
            res.setHeader('X-TTS-Cache', 'hit');
            res.send(cached);
            return;
        }

        console.log(`TTS cache miss: text="${text.substring(0, 30)}...", lang=${lang}, languageCode=${languageCode}`);

        // Build Sarvam.ai TTS request
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
            return res.status(500).json({ error: 'TTS synthesis failed' });
        }

        const data = await response.json();

        if (!data.audios || !data.audios[0]) {
            console.error('Sarvam TTS returned empty audios');
            return res.status(500).json({ error: 'TTS returned no audio' });
        }

        // Decode base64 audio and send as MP3
        const audioBuffer = Buffer.from(data.audios[0], 'base64');

        // Store in memory cache
        audioCache.set(cacheKey, audioBuffer);
        console.log(`TTS cache stored: "${text.substring(0, 30)}..." (cache size: ${audioCache.size})`);

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', audioBuffer.length);
        res.setHeader('X-TTS-Provider', 'sarvam');
        res.setHeader('X-TTS-Lang', languageCode);
        res.setHeader('X-TTS-Cache', 'miss');
        res.send(audioBuffer);
        console.log(`TTS Success: ${audioBuffer.length} bytes`);

    } catch (error) {
        console.error('TTS Error:', error);
        res.status(500).json({ error: 'Failed to generate speech' });
    }
});

app.listen(port, () => {
    console.log(`Sarvam.ai TTS server listening on port ${port}`);
    if (!process.env.SARVAM_API_KEY) {
        console.warn('⚠️  Warning: SARVAM_API_KEY not set. TTS requests will fail.');
        console.warn('   Set it in your .env file or environment.');
    }
});
