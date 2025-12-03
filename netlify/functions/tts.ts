import { Handler } from '@netlify/functions';
import { EdgeTTS } from 'node-edge-tts';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

const handler: Handler = async (event, context) => {
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: 'Method Not Allowed',
            headers: { 'Allow': 'POST' }
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

        // Map language to voice
        let voice = 'hi-IN-MadhurNeural'; // Default to Hindi (good for Sanskrit)
        if (lang === 'knda') {
            voice = 'kn-IN-GaganNeural';
        } else if (lang === 'tel') {
            voice = 'te-IN-MohanNeural';
        } else if (lang === 'tam') {
            voice = 'ta-IN-ValluvarNeural';
        }

        // Adjust rate based on granularity (approximate, as Edge TTS uses percentage)
        // +0% is normal. -20% is slower.
        let rate = '+0%';
        if (granularity === 'verse') {
            rate = '-20%';
        } else if (granularity === 'line') {
            rate = '-10%';
        }

        const tts = new EdgeTTS({
            voice: voice,
            lang: 'en-US', // Default lang, voice overrides it
            outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
        });

        // Generate audio to a temp file
        const tmpDir = os.tmpdir();
        const tmpFile = path.join(tmpDir, `tts-${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`);

        await tts.ttsPromise(text, tmpFile);

        // Read file
        const audioBuffer = fs.readFileSync(tmpFile);

        // Clean up
        fs.unlinkSync(tmpFile);

        // Return as base64 encoded string
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Access-Control-Allow-Origin': '*', // CORS
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: audioBuffer.toString('base64'),
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
