// ============================================================
// ZaraOS Voice Engine — Alpha 0.7
//
// Two recording paths, selected automatically:
//
//   Tauri (native OS):
//     getUserMedia() → MediaRecorder → audio blob
//     → POST /v1/audio/transcriptions (Ollama whisper)
//     → text result fired to subscribers
//     No internet. No Chrome. No cloud speech service.
//     Requires: ollama pull whisper (done once)
//
//   Browser (Replit preview / Chrome / Edge):
//     Web Speech API (SpeechRecognition) — real-time streaming
//     Requires Chrome or Edge.
//
// Both paths share the same subscriber interface (onResult, onStateChange)
// so callers never need to care which path is active.
//
// Usage:
//   voiceEngine.startListening()  — begin capture
//   voiceEngine.stopListening()   — stop capture (Tauri: triggers transcription)
//   voiceEngine.abort()           — discard and reset
//   voiceEngine.onResult(cb)      — (text, isFinal) callbacks
//   voiceEngine.onStateChange(cb) — VoiceState transitions
// ============================================================

export type VoiceState =
  | "idle"
  | "listening"
  | "transcribing"
  | "error"
  | "unsupported";

export type VoiceResultCallback  = (text: string, isFinal: boolean) => void;
export type VoiceStateCallback   = (state: VoiceState, errorMessage?: string) => void;

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): { readonly transcript: string; readonly confidence: number };
  [index: number]: { readonly transcript: string; readonly confidence: number };
}
interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart:  ((ev: Event) => void) | null;
  onend:    ((ev: Event) => void) | null;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror:  ((ev: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

const WEB_SPEECH_ERRORS: Record<string, string> = {
  "no-speech":              "No speech detected. Tap the mic and speak clearly.",
  "audio-capture":          "Microphone not accessible. Check your device settings.",
  "not-allowed":            "Microphone access denied.",
  "service-not-allowed":    "Speech recognition not allowed in this context.",
  "network":                "Voice requires the native app for offline use. Run `cargo tauri dev` on the Dell to activate Whisper.",
  "aborted":                "",
  "language-not-supported": "Language not supported by this browser's speech engine.",
};

class VoiceEngine {
  private recognition:   SpeechRecognitionInstance | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream:   MediaStream   | null = null;
  private autoStopTimer: ReturnType<typeof setTimeout> | null = null;

  private _state: VoiceState = "idle";
  private _errorMessage = "";
  private _simInterval: ReturnType<typeof setInterval> | null = null;

  private resultSubs:   Set<VoiceResultCallback>         = new Set();
  private stateSubs:    Set<VoiceStateCallback>           = new Set();
  private speakingSubs: Set<(speaking: boolean) => void>  = new Set();

  // ── Wake word state ───────────────────────────────────────────────────────
  private _wakeWordActive = false;
  private _wakeWordSubs:  Set<() => void> = new Set();

  // ── Capability detection ──────────────────────────────────────────────────

  private get _isTauriRuntime(): boolean {
    return (
      typeof window !== "undefined" &&
      ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
    );
  }

  private get _hasSpeechRecognition(): boolean {
    return (
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    );
  }

  // Voice is always "supported" in Tauri mode (we use our own recorder).
  // In the browser we need the Web Speech API.
  get isSupported(): boolean {
    return this._isTauriRuntime || this._hasSpeechRecognition;
  }

  get isListening(): boolean {
    return this._state === "listening" || this._state === "transcribing";
  }

  get isWakeWordActive(): boolean { return this._wakeWordActive; }

  // Subscribe to wake word detection events (fires each time "Zara" is heard)
  onWakeWord(cb: () => void): () => void {
    this._wakeWordSubs.add(cb);
    return () => this._wakeWordSubs.delete(cb);
  }

  // ── Wake word public API ──────────────────────────────────────────────────

  startWakeWordListening(): void {
    if (this._wakeWordActive) return;
    this._wakeWordActive = true;
    void this._wakeWordLoop();
  }

  stopWakeWordListening(): void {
    this._wakeWordActive = false;
    // Each _recordChunk opens and closes its own stream, so nothing to release here.
    // The loop exits cleanly on the next iteration when _wakeWordActive is false.
  }

  get state(): VoiceState { return this._state; }
  get lastError(): string { return this._errorMessage; }

  // ── Subscriptions ────────────────────────────────────────────────────────

  onResult(cb: VoiceResultCallback): () => void {
    this.resultSubs.add(cb);
    return () => this.resultSubs.delete(cb);
  }

  onStateChange(cb: VoiceStateCallback): () => void {
    this.stateSubs.add(cb);
    return () => this.stateSubs.delete(cb);
  }

  // ── Permission pre-warm ───────────────────────────────────────────────────

  async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch {
      return false;
    }
  }

  // ── Start listening ───────────────────────────────────────────────────────

  startListening(options?: { lang?: string }): void {
    if (this._state === "listening" || this._state === "transcribing") return;

    if (!this.isSupported) {
      this.setState("unsupported", "Voice input is not supported in this environment.");
      return;
    }

    if (this._isTauriRuntime) {
      void this._startTauriRecording();
    } else {
      this._startWebSpeech(options);
    }
  }

  // ── Tauri recording path ──────────────────────────────────────────────────
  // getUserMedia() → MediaRecorder → blob → base64 → /tmp → python3 whisper

  private async _startTauriRecording(): Promise<void> {
    // 1. Capture microphone stream
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const isDenied = err instanceof DOMException && err.name === "NotAllowedError";
      this.setState(
        "error",
        isDenied
          ? "Microphone access denied. Check the Privacy panel and try again."
          : `Microphone unavailable: ${err instanceof Error ? err.message : "unknown error"}`
      );
      return;
    }

    // 2. Pick a MIME type supported by WebKitGTK (webm → ogg fallback)
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
      ? "audio/ogg;codecs=opus"
      : "";

    const chunks: Blob[] = [];
    this.mediaRecorder = new MediaRecorder(
      this.mediaStream,
      mimeType ? { mimeType } : {}
    );
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

      // 3. When recording stops, transcribe via local Python whisper
    this.mediaRecorder.onstop = async () => {
      this._releaseMediaStream();
      if (chunks.length === 0) {
        this.setState("idle");
        return;
      }
      this.setState("transcribing");

      const audioBlob = new Blob(chunks, {
        type: mimeType || "audio/webm",
      });

      await this._transcribeWithWhisper(audioBlob);
    };

    this.mediaRecorder.start(200);
    this.setState("listening");

    // Auto-stop after 12 s so the user isn't stuck
    this.autoStopTimer = setTimeout(() => {
      this.stopListening();
    }, 12_000);
  }

  // ── Local Whisper transcription (openai-whisper Python package) ──────────
  // Flow: Blob → base64 → /tmp/zaraos-voice.b64  (via Tauri FS)
  //       python3 -c "decode + whisper.transcribe" → stdout text
  //
  // Install once on the Dell:
  //   pip3 install openai-whisper
  //   sudo apt install ffmpeg          (needed by whisper to decode webm/ogg)
  // First transcription auto-downloads the 'tiny' model (~150 MB, ~1-2 min).

  // ── Shared transcription kernel ───────────────────────────────────────────
  // Returns: text | "NO_SPEECH" | "INSTALL_NEEDED" | "WHISPER_ERROR:<msg>"
  private async _transcribeBlob(audioBlob: Blob): Promise<string> {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
      reader.onerror = () => reject(new Error("FileReader failed"));
      reader.readAsDataURL(audioBlob);
    });
    if (!base64) return "NO_SPEECH";

    const { fsWriteText, shellExec } = await import("@/core/tauri/tauri-fs");
    await fsWriteText("/tmp/zaraos-voice.b64", base64);

    const pyScript = [
      "import base64, os, warnings",
      "warnings.filterwarnings('ignore')",
      "os.environ['CUDA_VISIBLE_DEVICES'] = ''",
      "audio = base64.b64decode(open('/tmp/zaraos-voice.b64').read())",
      "open('/tmp/zaraos-voice.webm', 'wb').write(audio)",
      "try:",
      "    import whisper",
      "    m = whisper.load_model('tiny', download_root='/tmp/.zaraos-whisper', device='cpu')",
      "    r = m.transcribe('/tmp/zaraos-voice.webm', language='en', fp16=False)['text'].strip()",
      "    print(r if r else 'NO_SPEECH')",
      "except ImportError:",
      "    print('INSTALL_NEEDED')",
      "except Exception as e:",
      "    print('WHISPER_ERROR:' + str(e)[:120])",
    ].join("\n");

    const result = await shellExec("python3", ["-c", pyScript]);
    return result.stdout.trim() || "NO_SPEECH";
  }

  private async _transcribeWithWhisper(audioBlob: Blob): Promise<void> {
    try {
      const out = await this._transcribeBlob(audioBlob);

      if (out === "INSTALL_NEEDED") {
        this.setState("error", "Run: pip3 install openai-whisper && sudo apt install ffmpeg");
        return;
      }
      if (out.startsWith("WHISPER_ERROR:")) {
        this.setState("error", out.replace("WHISPER_ERROR:", "Whisper error: ").slice(0, 120));
        return;
      }
      if (out === "NO_SPEECH" || !out) {
        this.setState("error", "No speech detected. Try speaking more clearly.");
        return;
      }

      this.resultSubs.forEach((cb) => cb(out, true));
      this.setState("idle");
    } catch (err) {
      this.setState("error", `Transcription failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── Wake word helpers ─────────────────────────────────────────────────────

  private _pickMimeType(): string {
    return MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
      : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus") ? "audio/ogg;codecs=opus"
      : "";
  }

  // Record a fixed-length audio chunk using a FRESH mic stream each call.
  // Opening a new stream every iteration avoids the WebKit2GTK bug where
  // MediaRecorder silently produces 0-byte blobs when reused from a shared stream.
  private async _recordChunk(durationMs: number): Promise<Blob | null> {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return null;
    }

    return new Promise((resolve) => {
      const mimeType = this._pickMimeType();
      const chunks: Blob[] = [];
      let rec: MediaRecorder;
      try {
        rec = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      } catch {
        stream.getTracks().forEach((t) => t.stop());
        resolve(null);
        return;
      }

      rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop()); // always release mic
        const blob = new Blob(chunks, { type: mimeType || "audio/webm" });
        resolve(blob.size > 100 ? blob : null);
      };
      rec.start(200);
      setTimeout(() => { if (rec.state !== "inactive") rec.stop(); }, durationMs);
    });
  }

  // Whisper tiny often mishears "Zara" as "Sara", "Sarah", "Zarah", "Zero", etc.
  // Plain indexOf is more reliable than regex — immune to punctuation/quote artifacts
  // that Whisper adds around proper nouns which break \b word-boundary matching.
  private static readonly WAKE_VARIANTS = [
    "zara", "zarah", "zorah",   // correct + near-correct spellings
    "sara", "sarah",             // most common Whisper mishearing
    "czara", "czar",             // phonetic variants
    "zahara", "xara", "zare",    // longer/alternate forms
  ];

  // Continuous loop: record short chunks, check each for the wake word "Zara".
  // If found in same utterance → dispatch immediately.
  // If just "Zara" → record a follow-up command chunk, then dispatch.
  private async _wakeWordLoop(): Promise<void> {
    // Verify mic access on first chunk — _recordChunk opens a fresh stream each time
    const testBlob = await this._recordChunk(300);
    if (testBlob === null && !this._wakeWordActive) return;

    while (this._wakeWordActive) {
      try {
        // Record 3 s detection window (longer = more complete phrase in one chunk)
        const blob = await this._recordChunk(3000);
        if (!this._wakeWordActive) break;
        if (!blob) continue;

        // Show user what is being processed
        this.resultSubs.forEach((cb) => cb("", false)); // clears stale interim

        const text = await this._transcribeBlob(blob);
        if (!this._wakeWordActive) break;

        // Skip errors / silence — emit interim so UI shows "last heard"
        if (!text || text === "NO_SPEECH") continue;
        if (text === "INSTALL_NEEDED") {
          this.setState("error", "Run: pip3 install openai-whisper && sudo apt install ffmpeg");
          break;
        }
        if (text.startsWith("WHISPER_ERROR:") || text.startsWith("ERROR:")) continue;

        // Show what was heard as interim text (useful for debugging)
        this.resultSubs.forEach((cb) => cb(text, false));

        // Check for wake word using indexOf — covers all Whisper mishearings of "Zara"
        // and is immune to punctuation/quote artifacts that break regex \b matching.
        const lower = text.toLowerCase();
        let wakeIdx = -1;
        let wakeLen = 0;
        for (const v of VoiceEngine.WAKE_VARIANTS) {
          const i = lower.indexOf(v);
          if (i !== -1 && (wakeIdx === -1 || i < wakeIdx)) {
            wakeIdx = i;
            wakeLen = v.length;
          }
        }
        if (wakeIdx === -1) continue;

        // Notify UI of wake word detection (triggers visual flash)
        this._wakeWordSubs.forEach((cb) => cb());

        // Strip trailing punctuation/spaces right after the wake word
        let afterWakeRaw = text.slice(wakeIdx + wakeLen);
        afterWakeRaw = afterWakeRaw.replace(/^[,.\s]+/, "").trim();
        const afterWake = afterWakeRaw;

        if (afterWake.length > 1) {
          // Command in same utterance: "Zara, open settings"
          this.resultSubs.forEach((cb) => cb(afterWake, true));
        } else {
          // Just "Zara" — record a follow-up command (up to 8 s)
          this.setState("listening");
          const cmdBlob = await this._recordChunk(8000);
          if (!this._wakeWordActive) { this.setState("idle"); break; }
          if (cmdBlob) {
            this.setState("transcribing");
            const cmd = await this._transcribeBlob(cmdBlob);
            if (cmd && cmd !== "NO_SPEECH"
                && !cmd.startsWith("WHISPER_ERROR:") && !cmd.startsWith("ERROR:")) {
              this.resultSubs.forEach((cb) => cb(cmd, true));
            }
          }
          this.setState("idle");
        }
      } catch (err) {
        // Never let a single iteration crash the whole loop
        console.warn("[VoiceEngine] wake word loop error:", err);
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    // Each chunk opened and closed its own stream — nothing to release here.
  }

  private _releaseMediaStream(): void {
    if (this.autoStopTimer !== null) {
      clearTimeout(this.autoStopTimer);
      this.autoStopTimer = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    this.mediaRecorder = null;
  }

  // ── Web Speech API path (browser) ────────────────────────────────────────

  private _startWebSpeech(options?: { lang?: string }): void {
    const Ctor =
      (window as unknown as Record<string, unknown>)["SpeechRecognition"] as
        (new () => SpeechRecognitionInstance) | undefined ??
      (window as unknown as Record<string, unknown>)["webkitSpeechRecognition"] as
        (new () => SpeechRecognitionInstance) | undefined;

    if (!Ctor) {
      this.setState("unsupported", "Speech recognition not available.");
      return;
    }

    const rec = new Ctor();
    rec.continuous      = false;
    rec.interimResults  = true;
    rec.lang            = options?.lang ?? "en-US";
    rec.maxAlternatives = 1;

    rec.onstart  = () => this.setState("listening");
    rec.onend    = () => {
      if (this._state === "listening") this.setState("idle");
      this.recognition = null;
    };
    rec.onerror  = (ev: SpeechRecognitionErrorEvent) => {
      const msg = WEB_SPEECH_ERRORS[ev.error] ?? `Voice error: ${ev.error}`;
      if (ev.error === "aborted") {
        this.setState("idle");
      } else {
        this.setState("error", msg);
      }
      this.recognition = null;
    };
    rec.onresult = (ev: SpeechRecognitionEvent) => {
      let interim = "";
      let final_  = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        const t = r[0]?.transcript ?? "";
        if (r.isFinal) final_ += t; else interim += t;
      }
      if (interim) this.resultSubs.forEach((cb) => cb(interim, false));
      if (final_)  this.resultSubs.forEach((cb) => cb(final_.trim(), true));
    };

    try {
      rec.start();
      this.recognition = rec;
    } catch {
      this.setState("error", "Could not start voice recognition. Is the microphone in use?");
    }
  }

  // ── Stop / Abort ─────────────────────────────────────────────────────────

  stopListening(): void {
    if (this._isTauriRuntime) {
      // Stopping the MediaRecorder fires onstop → transcription
      if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
        this.mediaRecorder.stop();
      } else {
        this._releaseMediaStream();
        this.setState("idle");
      }
    } else {
      if (this.recognition && this._state === "listening") {
        this.recognition.stop();
      }
    }
  }

  abort(): void {
    if (this._simInterval !== null) {
      clearInterval(this._simInterval);
      this._simInterval = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.ondataavailable = null;
      this.mediaRecorder.onstop = null;
      this.mediaRecorder.stop();
    }
    this._releaseMediaStream();
    if (this.recognition) {
      this.recognition.abort();
      this.recognition = null;
    }
    this.setState("idle");
  }

  // ── Simulation (dev/testing) ──────────────────────────────────────────────

  simulateVoiceInput(text: string): void {
    if (this._state !== "listening") return;
    let i = 0;
    this._simInterval = setInterval(() => {
      i += 3;
      if (i < text.length) {
        this.resultSubs.forEach((cb) => cb(text.slice(0, i), false));
      } else {
        if (this._simInterval !== null) {
          clearInterval(this._simInterval);
          this._simInterval = null;
        }
        this.resultSubs.forEach((cb) => cb(text, true));
        this.setState("idle");
      }
    }, 60);
  }

  // ── Text-to-Speech (SpeechSynthesis — works in WebKitGTK) ────────────────

  get isTTSSupported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  get isSpeaking(): boolean {
    return typeof window !== "undefined" && window.speechSynthesis?.speaking === true;
  }

  speak(text: string, options?: { rate?: number; pitch?: number; volume?: number }): void {
    if (!this.isTTSSupported) return;
    window.speechSynthesis.cancel();

    const clean = text
      .replace(/```[\s\S]*?```/g, "code block omitted")
      .replace(/`[^`]+`/g, "")
      .replace(/[*_#~>]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 800);

    if (!clean) return;

    // WebKit2GTK needs a small pause after cancel() before the next speak()
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate   = options?.rate   ?? 1.05;
      utterance.pitch  = options?.pitch  ?? 1.0;
      utterance.volume = options?.volume ?? 1.0;
      utterance.lang   = "en-US";

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const preferred =
          voices.find((v) =>
            v.lang.startsWith("en") &&
            /female|woman|zira|hazel|samantha|karen|victoria|moira|tessa|fiona/i.test(v.name)
          ) ??
          voices.find((v) => v.lang.startsWith("en")) ??
          null;
        if (preferred) utterance.voice = preferred;
      }

      this.speakingSubs.forEach((cb) => cb(true));
      const done = () => this.speakingSubs.forEach((cb) => cb(false));
      utterance.addEventListener("end",   done, { once: true });
      utterance.addEventListener("error", done, { once: true });

      const wordCount   = clean.split(" ").length;
      const safeguardMs = Math.max(8000, wordCount * 500 + 5000);
      const safeguard   = setTimeout(() => this.speakingSubs.forEach((cb) => cb(false)), safeguardMs);
      utterance.addEventListener("end",   () => clearTimeout(safeguard), { once: true });
      utterance.addEventListener("error", () => clearTimeout(safeguard), { once: true });

      window.speechSynthesis.speak(utterance);
    }, 80);
  }

  stopSpeaking(): void {
    if (this.isTTSSupported) window.speechSynthesis.cancel();
    this.speakingSubs.forEach((cb) => cb(false));
  }

  onSpeakingChange(cb: (speaking: boolean) => void): () => void {
    this.speakingSubs.add(cb);
    return () => this.speakingSubs.delete(cb);
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private setState(state: VoiceState, errorMessage = ""): void {
    this._state        = state;
    this._errorMessage = errorMessage;
    this.stateSubs.forEach((cb) => cb(state, errorMessage || undefined));
  }
}

export const voiceEngine = new VoiceEngine();
