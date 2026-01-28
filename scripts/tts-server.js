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

// Map language codes to Google Cloud TTS language codes
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

// Get voice name for better quality (optional override)
function getVoiceName(lang) {
    // Google Cloud TTS WaveNet voices for higher quality
    // Leave empty to use default standard voices
    const voiceMap = {
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

app.post('/api/tts', async (req, res) => {
    try {
        const { text, lang, granularity, words } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        if (text.length > 800) {
            return res.status(400).json({ error: 'Text too long (max 800 characters)' });
        }

        const apiKey = process.env.GCLOUD_TTS_API_KEY;
        if (!apiKey) {
            console.error('GCLOUD_TTS_API_KEY not set');
            return res.status(500).json({ error: 'TTS service not configured' });
        }

        const languageCode = getLanguageCode(lang);
        const voiceName = getVoiceName(lang);

        // If words array provided, use SSML with marks for word-level timing
        const useWordTiming = Array.isArray(words) && words.length > 0;
        let inputConfig;

        if (useWordTiming) {
            // Build SSML with <mark> tags for each word
            const ssmlParts = words.map((word, i) => `<mark name="w${i}"/>${escapeXml(word)}`);
            const ssml = `<speak>${ssmlParts.join(' ')}</speak>`;
            inputConfig = { ssml };
            console.log(`TTS Request (SSML): ${words.length} words, lang=${lang}, languageCode=${languageCode}`);
        } else {
            inputConfig = { text };
            console.log(`TTS Request: text="${text.substring(0, 30)}...", lang=${lang}, languageCode=${languageCode}, voice=${voiceName || 'default'}`);
        }

        // Build request body for Google Cloud TTS
        const requestBody = {
            input: inputConfig,
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

        // Request timepoints if using word timing
        if (useWordTiming) {
            requestBody.enableTimePointing = ['SSML_MARK'];
        }

        // Call Google Cloud TTS REST API
        // Use v1beta1 for enableTimePointing support, v1 otherwise
        const apiVersion = useWordTiming ? 'v1beta1' : 'v1';
        const url = `https://texttospeech.googleapis.com/${apiVersion}/text:synthesize?key=${apiKey}`;
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
            return res.status(500).json({ error: 'TTS synthesis failed' });
        }

        const data = await response.json();

        if (!data.audioContent) {
            console.error('Google TTS returned empty audioContent');
            return res.status(500).json({ error: 'TTS returned no audio' });
        }

        // If word timing requested, return JSON with audio and timepoints
        if (useWordTiming) {
            const timepoints = (data.timepoints || []).map(tp => ({
                word: parseInt(tp.markName.replace('w', ''), 10),
                time: parseFloat(tp.timeSeconds)
            }));
            console.log(`TTS Success (with timing): ${timepoints.length} timepoints`);
            res.json({
                audio: data.audioContent, // base64
                timepoints
            });
        } else {
            // Decode base64 audio and send as MP3
            const audioBuffer = Buffer.from(data.audioContent, 'base64');
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Length', audioBuffer.length);
            res.setHeader('X-TTS-Provider', 'gcloud');
            res.setHeader('X-TTS-Lang', languageCode);
            res.send(audioBuffer);
            console.log(`TTS Success: ${audioBuffer.length} bytes`);
        }

    } catch (error) {
        console.error('TTS Error:', error);
        res.status(500).json({ error: 'Failed to generate speech' });
    }
});

// Escape XML special characters for SSML
function escapeXml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

app.listen(port, () => {
    console.log(`Google Cloud TTS server listening on port ${port}`);
    if (!process.env.GCLOUD_TTS_API_KEY) {
        console.warn('⚠️  Warning: GCLOUD_TTS_API_KEY not set. TTS requests will fail.');
        console.warn('   Set it in your .env file or environment.');
    }
});
