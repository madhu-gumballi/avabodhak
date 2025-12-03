package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"time"
)

type ttsRequest struct {
	Text        string `json:"text"`
	Granularity string `json:"granularity"`
	Lang        string `json:"lang"`
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/tts", handleTTS)

	// Simple CORS middleware for all routes
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Requested-With")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		// Fallback to not-found
		http.NotFound(w, r)
	})

	port := os.Getenv("TTS_PORT")
	if port == "" {
		port = "8081"
	}

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("tts-service listening on :%s", port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
}

func handleTTS(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers for this endpoint
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ttsRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	text := req.Text
	if len([]rune(text)) == 0 {
		http.Error(w, "text is required", http.StatusBadRequest)
		return
	}

	if len([]rune(text)) > 800 {
		http.Error(w, "text too long", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	// Common informational headers
	if reqID := r.Header.Get("X-Request-Id"); reqID != "" {
		w.Header().Set("X-Request-Id", reqID)
	}
	w.Header().Set("X-TTS-Lang", req.Lang)
	w.Header().Set("X-TTS-Granularity", req.Granularity)

	provider := os.Getenv("TTS_PROVIDER")
	if provider == "gcloud" {
		w.Header().Set("X-TTS-Provider", "gcloud")
		if err := synthesizeWithGoogleTTS(ctx, w, text, req); err != nil {
			log.Printf("google tts error: %v", err)
			http.Error(w, "tts error", http.StatusInternalServerError)
		}
		return
	}

	// Default provider: espeak-ng
	// On macOS, default to 'mac' provider if not specified
	if provider == "" && isMacOS() {
		provider = "mac"
	}

	if provider == "mac" {
		w.Header().Set("X-TTS-Provider", "mac")
		if err := synthesizeWithMac(ctx, w, text, req); err != nil {
			log.Printf("mac tts error: %v", err)
			http.Error(w, "tts error", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("X-TTS-Provider", "espeak")
	if err := synthesizeWithEspeak(ctx, w, text, req); err != nil {
		log.Printf("espeak-ng tts error: %v", err)
		http.Error(w, "tts error", http.StatusInternalServerError)
	}
}

func isMacOS() bool {
	// Check if 'say' command exists
	_, err := exec.LookPath("say")
	return err == nil
}

// synthesizeWithEspeak streams audio using local espeak-ng. It writes the response directly.
func synthesizeWithEspeak(ctx context.Context, w http.ResponseWriter, text string, req ttsRequest) error {
	voice := os.Getenv("TTS_VOICE")
	if voice == "" {
		// Derive a reasonable espeak-ng voice from the primary UI language.
		// IAST/English falls back to Hindi by default.
		switch req.Lang {
		case "deva":
			voice = "hi" // Devanagari → Hindi voice (closest available)
		case "iast":
			voice = "hi" // Latin transliteration treated as Sanskrit/Hindi
		case "knda":
			voice = "kn" // Kannada → kn
		case "tel":
			voice = "te" // Telugu → te
		case "tam":
			voice = "ta" // Tamil → ta
		case "guj":
			voice = "gu" // Gujarati → gu
		case "pan":
			voice = "pa" // Punjabi → pa
		case "mr":
			voice = "mr" // Marathi → mr
		case "ben":
			voice = "bn" // Bengali → bn
		case "mal":
			voice = "ml" // Malayalam → ml
		default:
			// Unknown or missing lang – fall back to Hindi as a generic Indic voice
			voice = "hi"
		}
	}
	args := []string{"--stdout", text}
	if voice != "" {
		args = []string{"-v", voice, "--stdout", text}
	}
	log.Printf("tts[espeak]: len=%d, voice=%q", len([]rune(text)), voice)

	cmd := exec.CommandContext(ctx, "espeak-ng", args...)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		log.Printf("espeak stdout pipe error: %v", err)
		return err
	}

	if err := cmd.Start(); err != nil {
		log.Printf("espeak command start error: %v", err)
		return err
	}
	w.Header().Set("Content-Type", "audio/wav")
	if n, err := io.Copy(w, stdout); err != nil {
		log.Printf("espeak streaming error after %s bytes: %v", strconv.FormatInt(n, 10), err)
	}

	if err := cmd.Wait(); err != nil {
		log.Printf("espeak-ng exited with error: %v", err)
		return err
	}
	return nil
}

// synthesizeWithMac uses the macOS 'say' command.
func synthesizeWithMac(ctx context.Context, w http.ResponseWriter, text string, req ttsRequest) error {
	// Determine voice
	voice := "Lekha" // Default to Lekha (Hindi) which is good for Sanskrit
	if req.Lang == "iast" {
		voice = "Rishi" // Indian English for IAST
	}

	// Determine rate
	rate := "180" // Default
	switch req.Granularity {
	case "verse":
		rate = "140" // Slower for verses
	case "line":
		rate = "160"
	case "word":
		rate = "180"
	}

	// Create temp AIFF file
	tmpAiff, err := os.CreateTemp("", "tts-*.aiff")
	if err != nil {
		return err
	}
	aiffPath := tmpAiff.Name()
	tmpAiff.Close()
	defer os.Remove(aiffPath)

	// Use say to generate AIFF
	args := []string{"-v", voice, "-r", rate, "-o", aiffPath, text}
	log.Printf("tts[mac]: cmd=say %v", args)
	cmd := exec.CommandContext(ctx, "say", args...)
	if output, err := cmd.CombinedOutput(); err != nil {
		log.Printf("mac tts error: %v, output: %s", err, string(output))
		return err
	}

	// Convert AIFF to WAV using afconvert
	tmpWav, err := os.CreateTemp("", "tts-*.wav")
	if err != nil {
		return err
	}
	wavPath := tmpWav.Name()
	tmpWav.Close()
	defer os.Remove(wavPath)

	convCmd := exec.CommandContext(ctx, "afconvert", "-f", "WAVE", "-d", "LEI16@44100", aiffPath, wavPath)
	if out, err := convCmd.CombinedOutput(); err != nil {
		log.Printf("afconvert error: %v, output: %s", err, string(out))
		return err
	}

	// Read back the WAV file
	data, err := os.ReadFile(wavPath)
	if err != nil {
		return err
	}

	w.Header().Set("Content-Type", "audio/wav")
	w.Header().Set("Content-Length", strconv.Itoa(len(data)))
	if _, err := w.Write(data); err != nil {
		return err
	}

	return nil
}

// synthesizeWithGoogleTTS uses Google Cloud Text-to-Speech via REST.
// It expects GCLOUD_TTS_API_KEY to be set and writes an MP3 audio response.
func synthesizeWithGoogleTTS(ctx context.Context, w http.ResponseWriter, text string, req ttsRequest) error {
	apiKey := os.Getenv("GCLOUD_TTS_API_KEY")
	if apiKey == "" {
		return fmt.Errorf("GCLOUD_TTS_API_KEY not set")
	}

	langCode, defaultVoiceName := gcloudVoiceParams(req.Lang)

	voiceName := os.Getenv("GCLOUD_TTS_VOICE_NAME")
	if voiceName == "" {
		voiceName = defaultVoiceName
	}

	body := map[string]any{
		"input": map[string]any{
			"text": text,
		},
		"voice": map[string]any{
			"languageCode": langCode,
		},
		"audioConfig": map[string]any{
			"audioEncoding": "MP3",
		},
	}
	if voiceName != "" {
		if v, ok := body["voice"].(map[string]any); ok {
			v["name"] = voiceName
		}
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return err
	}

	url := "https://texttospeech.googleapis.com/v1/text:synthesize?key=" + apiKey
	reqHTTP, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	reqHTTP.Header.Set("Content-Type", "application/json; charset=utf-8")

	resp, err := http.DefaultClient.Do(reqHTTP)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("gcloud tts http status %d", resp.StatusCode)
		return fmt.Errorf("gcloud tts status %d", resp.StatusCode)
	}

	var respBody struct {
		AudioContent string `json:"audioContent"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&respBody); err != nil {
		return err
	}

	if respBody.AudioContent == "" {
		return fmt.Errorf("gcloud tts empty audioContent")
	}

	data, err := base64.StdEncoding.DecodeString(respBody.AudioContent)
	if err != nil {
		return err
	}

	w.Header().Set("Content-Type", "audio/mpeg")
	if _, err := w.Write(data); err != nil {
		return err
	}

	log.Printf("tts[gcloud]: len=%d, lang=%q, voice=%q, bytes=%d", len([]rune(text)), req.Lang, voiceName, len(data))
	return nil
}

// gcloudVoiceParams maps our primary language codes to Google Cloud TTS language codes / voices.
func gcloudVoiceParams(lang string) (languageCode, voiceName string) {
	switch lang {
	case "deva":
		return "hi-IN", ""
	case "iast":
		return "en-IN", "" // English (India) for transliteration
	case "knda":
		return "kn-IN", ""
	case "tel":
		return "te-IN", ""
	case "tam":
		return "ta-IN", ""
	case "guj":
		return "gu-IN", ""
	case "pan":
		return "pa-IN", ""
	case "mr":
		return "mr-IN", ""
	case "ben":
		return "bn-IN", ""
	case "mal":
		return "ml-IN", ""
	default:
		return "hi-IN", ""
	}
}
