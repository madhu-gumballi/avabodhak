import express from 'express';
import { EdgeTTS } from 'node-edge-tts';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.TTS_PORT || 8081;

app.use(cors());
app.use(express.json());

app.post('/api/tts', async (req, res) => {
    try {
        const { text, lang, granularity } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        console.log(`TTS Request: text="${text.substring(0, 20)}...", lang=${lang}, granularity=${granularity}`);

        // Map language to voice
        let voice = 'hi-IN-MadhurNeural'; // Default to Hindi (good for Sanskrit)
        if (lang === 'knda') {
            voice = 'kn-IN-GaganNeural';
        } else if (lang === 'tel') {
            voice = 'te-IN-MohanNeural';
        } else if (lang === 'tam') {
            voice = 'ta-IN-ValluvarNeural';
        }
        // Fallback for others (eng, iast, guj, pan) is 'hi-IN-MadhurNeural'

        // Adjust rate based on granularity
        let rate = '+0%';
        if (granularity === 'verse') {
            rate = '-20%';
        } else if (granularity === 'line') {
            rate = '-10%';
        }

        const tts = new EdgeTTS({
            voice: voice,
            lang: 'en-US',
            outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
        });

        // Generate audio to a temp file
        const tmpDir = os.tmpdir();
        const tmpFile = path.join(tmpDir, `tts-${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`);

        await tts.ttsPromise(text, tmpFile);

        // Stream file back
        res.setHeader('Content-Type', 'audio/mpeg');
        const stream = fs.createReadStream(tmpFile);
        stream.pipe(res);

        stream.on('end', () => {
            fs.unlink(tmpFile, (err) => {
                if (err) console.error('Failed to delete temp file:', err);
            });
        });

    } catch (error) {
        console.error('TTS Error:', error);
        res.status(500).json({ error: 'Failed to generate speech' });
    }
});

app.listen(port, () => {
    console.log(`Local TTS server listening on port ${port}`);
});
