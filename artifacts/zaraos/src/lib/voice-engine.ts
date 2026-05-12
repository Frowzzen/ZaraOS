// ============================================================
// ZaraOS Voice Engine — Alpha 0.4
//
// Real voice input via the Web Speech API (SpeechRecognition).
//
// Browser support:
//   Chrome 33+     — full support (webkitSpeechRecognition)
//   Edge 79+       — full support (SpeechRecognition)
//   Safari iOS 14+ — partial support (webkitSpeechRecognition)
//   Firefox        — NOT supported (no SpeechRecognition)
//   Node / SSR     — NOT supported (browser-only API)
//
// When not supported, the engine degrades gracefully:
//   isSupported = false, startListening() emits a state change
//   to "unsupported" — the UI can show a helpful message.
//
// How it works:
//   1. User clicks the mic button → startListening() called
//   2. Browser requests microphone permission automatically
//   3. Interim results stream in → onResult fires with isFinal=false
//   4. User stops speaking → onResult fires with isFinal=true
//   5. Recognition ends → state returns to "idle"
//
// Subscribers (UI components) use onResult() and onStateChange()
// which return unsubscribe functions — safe to use in useEffect.
//
// Alpha 0.5+ plan:
//   Replace SpeechRecognition with Whisper.cpp via Tauri subprocess
//   for offline-only, higher accuracy transcription. The engine
//   interface stays identical — only the internals change.
// ============================================================

// ── Types ─────────────────────────────────────────────────

export type VoiceState =
  | "idle"
  | "listening"
  | "error"
  | "unsupported";

export type VoiceResultCallback  = (text: string, isFinal: boolean) => void;
export type VoiceStateCallback   = (state: VoiceState, errorMessage?: string) => void;

// Internal SpeechRecognition types — not in all TS lib versions
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
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

// ── Error messages ─────────────────────────────────────────

const ERROR_MESSAGES: Record<string, string> = {
  "no-speech":           "No speech detected. Tap the mic and speak clearly.",
  "audio-capture":       "Microphone not accessible. Check your device settings.",
  "not-allowed":         "Microphone access denied. Allow it in your browser's site permissions.",
  "service-not-allowed": "Speech recognition service is not allowed in this context.",
  "network":             "Network error — voice recognition requires an internet connection in this browser.",
  "aborted":             "", // user-initiated stop, not shown
  "language-not-supported": "Language not supported by this browser's speech engine.",
};

// ── Engine ────────────────────────────────────────────────

class VoiceEngine {
  private recognition: SpeechRecognitionInstance | null = null;
  private _state: VoiceState = "idle";
  private _errorMessage = "";
  private _isSupported: boolean;
  private _simInterval: ReturnType<typeof setInterval> | null = null;

  private resultSubs:   Set<VoiceResultCallback> = new Set();
  private stateSubs:    Set<VoiceStateCallback>  = new Set();
  private speakingSubs: Set<(speaking: boolean) => void> = new Set();

  constructor() {
    // SpeechRecognition is NOT available in WebKit2GTK (Tauri on Linux).
    // Voice input via microphone will be added in Alpha 0.7 via Whisper.cpp / Rust IPC.
    this._isSupported =
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  }

  // Returns true when running inside the Tauri native app.
  // Used to show accurate "coming soon" messages instead of "use Chrome/Edge".
  get isTauriMode(): boolean {
    return typeof window !== "undefined" && "__TAURI__" in window;
  }

  // ── Public state ───────────────────────────────────────

  get isSupported(): boolean { return this._isSupported; }
  get isListening(): boolean { return this._state === "listening"; }
  get state(): VoiceState    { return this._state; }
  get lastError(): string    { return this._errorMessage; }

  // ── Subscriptions ──────────────────────────────────────
  // Both return an unsubscribe function — use them inside useEffect.

  onResult(cb: VoiceResultCallback): () => void {
    this.resultSubs.add(cb);
    return () => this.resultSubs.delete(cb);
  }

  onStateChange(cb: VoiceStateCallback): () => void {
    this.stateSubs.add(cb);
    return () => this.stateSubs.delete(cb);
  }

  // ── Permission ─────────────────────────────────────────
  // Speech recognition requests mic permission automatically when started.
  // Call this explicitly only if you want to pre-warm the permission prompt.

  async requestPermission(): Promise<boolean> {
    if (!this._isSupported) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop()); // release immediately
      return true;
    } catch {
      return false;
    }
  }

  // ── Start listening ────────────────────────────────────

  startListening(options?: { lang?: string }): void {
    if (!this._isSupported) {
      const msg = this.isTauriMode
        ? "Voice input via microphone is coming in Alpha 0.7 (Whisper.cpp). Use the keyboard to talk to Zara for now."
        : "Voice input is not supported in this browser. Use Chrome or Edge.";
      this.setState("unsupported", msg);
      return;
    }

    if (this._state === "listening") return;

    // Construct SpeechRecognition instance
    const SpeechRecognitionCtor =
      (window as unknown as Record<string, unknown>)["SpeechRecognition"] as
        (new () => SpeechRecognitionInstance) | undefined ??
      (window as unknown as Record<string, unknown>)["webkitSpeechRecognition"] as
        (new () => SpeechRecognitionInstance) | undefined;

    if (!SpeechRecognitionCtor) {
      this.setState("unsupported", "Speech recognition constructor not found.");
      return;
    }

    const rec = new SpeechRecognitionCtor();
    rec.continuous     = false;       // stops after one utterance — good UX for commands
    rec.interimResults = true;        // stream partial results to input box
    rec.lang           = options?.lang ?? "en-US";
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      this.setState("listening");
    };

    rec.onresult = (ev: SpeechRecognitionEvent) => {
      let interim = "";
      let final_  = "";

      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const result = ev.results[i];
        const text   = result[0]?.transcript ?? "";
        if (result.isFinal) {
          final_ += text;
        } else {
          interim += text;
        }
      }

      if (interim) {
        this.resultSubs.forEach((cb) => cb(interim, false));
      }
      if (final_) {
        this.resultSubs.forEach((cb) => cb(final_.trim(), true));
      }
    };

    rec.onend = () => {
      // Only transition to idle if we weren't already moved to error/unsupported
      if (this._state === "listening") {
        this.setState("idle");
      }
      this.recognition = null;
    };

    rec.onerror = (ev: SpeechRecognitionErrorEvent) => {
      const msg = ERROR_MESSAGES[ev.error] ?? `Voice recognition error: ${ev.error}`;
      if (ev.error === "aborted") {
        // User-initiated stop — not an error state
        this.setState("idle");
      } else {
        this.setState("error", msg);
      }
      this.recognition = null;
    };

    try {
      rec.start();
      this.recognition = rec;
    } catch {
      this.setState("error", "Could not start voice recognition. Is the microphone in use?");
    }
  }

  // ── Stop / Abort ───────────────────────────────────────

  // stopListening — waits for the current utterance to finish naturally
  stopListening(): void {
    if (this.recognition && this._state === "listening") {
      this.recognition.stop();
    }
  }

  // abort — immediately cancels without firing onresult
  abort(): void {
    // Cancel any in-progress simulation so it stops streaming after abort.
    if (this._simInterval !== null) {
      clearInterval(this._simInterval);
      this._simInterval = null;
    }
    if (this.recognition) {
      this.recognition.abort();
      this.recognition = null;
    }
    this.setState("idle");
  }

  // ── Testing / Demo ─────────────────────────────────────
  // Fires callbacks as if a real voice result arrived.
  // Kept for dev/testing — allows voice simulation without a real mic.

  simulateVoiceInput(text: string): void {
    if (this._state !== "listening") return;
    // Simulate streaming characters as interim. Store ID so abort() can cancel.
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

  // ── Text-to-Speech ─────────────────────────────────────
  // Uses the browser's built-in SpeechSynthesis API.
  // Supported in WebKit2GTK (Tauri on Linux) — no network needed.

  get isTTSSupported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  get isSpeaking(): boolean {
    return typeof window !== "undefined" && window.speechSynthesis?.speaking === true;
  }

  speak(text: string, options?: { rate?: number; pitch?: number; volume?: number }): void {
    if (!this.isTTSSupported) return;

    // Cancel any in-progress speech before starting new
    window.speechSynthesis.cancel();

    // Strip markdown so it reads naturally
    const clean = text
      .replace(/```[\s\S]*?```/g, "code block omitted")
      .replace(/`[^`]+`/g, "")
      .replace(/[*_#~>]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 800);

    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate   = options?.rate   ?? 1.05;
    utterance.pitch  = options?.pitch  ?? 1.0;
    utterance.volume = options?.volume ?? 1.0;
    utterance.lang   = "en-US";

    // Pick a voice — getVoices() may be empty on first call; that's OK,
    // the browser will use its default voice.
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const preferred = voices.find((v) =>
        v.lang.startsWith("en") && /female|woman|zira|hazel|samantha|karen|victoria|moira|tessa|fiona/i.test(v.name)
      ) ?? voices.find((v) => v.lang.startsWith("en")) ?? null;
      if (preferred) utterance.voice = preferred;
    }

    // Notify subscribers that speech is starting
    this.speakingSubs.forEach((cb) => cb(true));

    const done = () => this.speakingSubs.forEach((cb) => cb(false));

    // Use addEventListener (more reliable than property assignment on WebKit2GTK)
    utterance.addEventListener("end",   done, { once: true });
    utterance.addEventListener("error", done, { once: true });

    // Safety fallback: if onend never fires (WebKit2GTK quirk), reset after
    // a generous timeout (word count × ~500ms + 5s buffer).
    const wordCount  = clean.split(" ").length;
    const safeguardMs = Math.max(8000, wordCount * 500 + 5000);
    const safeguard  = setTimeout(() => {
      this.speakingSubs.forEach((cb) => cb(false));
    }, safeguardMs);
    utterance.addEventListener("end",   () => clearTimeout(safeguard), { once: true });
    utterance.addEventListener("error", () => clearTimeout(safeguard), { once: true });

    window.speechSynthesis.speak(utterance);
  }

  stopSpeaking(): void {
    if (this.isTTSSupported) window.speechSynthesis.cancel();
    this.speakingSubs.forEach((cb) => cb(false));
  }

  onSpeakingChange(cb: (speaking: boolean) => void): () => void {
    this.speakingSubs.add(cb);
    return () => this.speakingSubs.delete(cb);
  }

  // ── Internal ───────────────────────────────────────────

  private setState(state: VoiceState, errorMessage = ""): void {
    this._state        = state;
    this._errorMessage = errorMessage;
    this.stateSubs.forEach((cb) => cb(state, errorMessage || undefined));
  }
}

// Singleton — one voice engine for the entire OS session.
export const voiceEngine = new VoiceEngine();
