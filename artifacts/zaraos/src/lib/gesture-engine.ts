// ============================================================
// ZaraOS Gesture Engine — Alpha 0.6
//
// Replaces the Alpha 0.5 simulation stubs with a real
// MediaPipe HandLandmarker pipeline:
//
//   getUserMedia() → HTMLVideoElement → HandLandmarker.detectForVideo()
//     → gesture-classifier.classifyGesture() → dispatchGesture()
//
// Architecture notes:
//  - HandLandmarker is lazily initialized on first startTracking() call.
//    The WASM bundle (~8 MB) is loaded from CDN; first call takes ~2-4 s.
//  - The camera stream is stored as a MediaStream and exposed via
//    getMediaStream() so GestureOverlay can display the camera feed
//    without sharing DOM elements with the engine.
//  - Landmarks are broadcast to onLandmarks() subscribers so
//    GestureOverlay can draw the hand skeleton without polling.
//  - simulateGesture() is retained for Settings test buttons.
//  - All recognized gestures still flow through dispatchGesture()
//    which debounces, maps to a command string via gesture-mapper.ts,
//    and fires gestureSubs — nothing else in the app changes.
// ============================================================

import type { GestureType } from "@/core/types";
import { gestureToCommand, GESTURE_LABELS } from "./gesture-mapper";
import { classifyGesture } from "./gesture-classifier";
import type { Landmark } from "./gesture-classifier";

// ── Types ────────────────────────────────────────────────────
type GestureCallback     = (gesture: GestureType, command: string) => void;
type GestureStatusCallback = (isTracking: boolean) => void;
type LandmarksCallback   = (landmarks: Landmark[][] | null) => void;
type CameraErrorCallback = (error: string) => void;

// ── MediaPipe local URLs ──────────────────────────────────────
// WASM bundle and model are bundled in public/mediapipe/ so gesture
// tracking works completely offline (no CDN dependency).
// import.meta.env.BASE_URL includes the trailing slash (e.g. "/" or "/zaraos/").
const WASM_BUNDLE_URL  = `${import.meta.env.BASE_URL}mediapipe`;
const HAND_MODEL_URL   = `${import.meta.env.BASE_URL}mediapipe/hand_landmarker.task`;

class GestureEngine {
  // ── State ─────────────────────────────────────────────────
  private isTracking          = false;
  private currentPath         = "/";
  private lastGesture?:        GestureType;
  private lastGestureAt        = 0;
  private readonly DEBOUNCE_MS = 600;

  // ── MediaPipe state ───────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handLandmarker:     any | null = null; // HandLandmarker
  private handLandmarkerReady = false;
  private handLandmarkerLoading = false;
  private mediaStream:        MediaStream | null = null;
  private videoEl:            HTMLVideoElement | null = null;
  private frameCanvas:        HTMLCanvasElement | null = null; // for WebKit2GTK compat
  private rafId:              number | null = null;

  // ── Subscriber sets ───────────────────────────────────────
  private gestureSubs:  Set<GestureCallback>      = new Set();
  private statusSubs:   Set<GestureStatusCallback> = new Set();
  private landmarksSubs: Set<LandmarksCallback>   = new Set();
  private errorSubs:    Set<CameraErrorCallback>  = new Set();

  // ── Camera permission ─────────────────────────────────────
  public async requestCameraPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch {
      return false;
    }
  }

  // ── MediaPipe initialization ──────────────────────────────
  // Lazily loads the WASM bundle and hand model on first use.
  // Subsequent calls return the cached instance immediately.
  private async ensureHandLandmarker(): Promise<boolean> {
    if (this.handLandmarkerReady) return true;
    if (this.handLandmarkerLoading) {
      // Poll until resolved rather than creating duplicate instances
      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (!this.handLandmarkerLoading) {
            clearInterval(check);
            resolve(this.handLandmarkerReady);
          }
        }, 100);
      });
    }

    this.handLandmarkerLoading = true;
    try {
      const { HandLandmarker, FilesetResolver } = await import(
        "@mediapipe/tasks-vision"
      );
      const vision = await FilesetResolver.forVisionTasks(WASM_BUNDLE_URL);
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: HAND_MODEL_URL,
          delegate: "CPU",
        },
        // IMAGE mode + canvas-based detect() works reliably in WebKit2GTK.
        // VIDEO mode + detectForVideo() has frame-format issues on Linux/Tauri.
        runningMode: "IMAGE",
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence:     0.5,
      });
      this.handLandmarkerReady = true;
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.errorSubs.forEach((cb) =>
        cb(`MediaPipe init failed: ${msg}. Check network connection.`)
      );
      return false;
    } finally {
      this.handLandmarkerLoading = false;
    }
  }

  // ── Tracking control ──────────────────────────────────────
  public async startTracking(initialPath = "/"): Promise<void> {
    if (this.isTracking) return;
    this.currentPath = initialPath;

    // 1. Request camera stream
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
          frameRate: { ideal: 30 },
        },
      });
    } catch (err) {
      const isDenied =
        err instanceof DOMException && err.name === "NotAllowedError";
      this.errorSubs.forEach((cb) =>
        cb(
          isDenied
            ? "Camera permission denied. Enable it in your browser settings, then try again."
            : `Camera unavailable: ${err instanceof Error ? err.message : "unknown error"}`
        )
      );
      return;
    }

    // 2. Wire stream to a video element used for detection.
    // WebKitGTK does NOT deliver MediaStream frames to detached video elements —
    // readyState stays at 0 and no frames ever arrive.  We append the element to
    // document.body (hidden, 1×1 px, off-screen) so the browser delivers frames,
    // then remove it in stopTracking().
    this.videoEl = document.createElement("video");
    this.videoEl.srcObject = this.mediaStream;
    this.videoEl.playsInline = true;
    this.videoEl.muted = true;
    this.videoEl.setAttribute("aria-hidden", "true");
    Object.assign(this.videoEl.style, {
      position:      "fixed",
      top:           "-9999px",
      left:          "-9999px",
      width:         "1px",
      height:        "1px",
      opacity:       "0",
      pointerEvents: "none",
    });
    document.body.appendChild(this.videoEl);
    try {
      await this.videoEl.play();
    } catch {
      // Tolerated — frames will arrive once readyState advances.
    }

    // 3. Load MediaPipe (WASM) — may take 2-4 s on first call
    const ready = await this.ensureHandLandmarker();
    if (!ready) {
      this.stopTracking();
      return;
    }

    // 4. Create offscreen canvas for frame extraction (IMAGE mode, WebKit2GTK compat)
    this.frameCanvas = document.createElement("canvas");
    this.frameCanvas.width  = 640;
    this.frameCanvas.height = 480;

    // 5. Start RAF detection loop
    this.isTracking = true;
    this.statusSubs.forEach((cb) => cb(true));
    this.runDetectionLoop();
  }

  private runDetectionLoop(): void {
    let consecutiveErrors = 0;
    // Throttle to ~15 fps for detect() in IMAGE mode to avoid overwhelming CPU
    let lastDetectTime = 0;
    const DETECT_INTERVAL_MS = 66; // ~15 fps

    const loop = () => {
      if (!this.isTracking) return;

      const video    = this.videoEl;
      const detector = this.handLandmarker;
      const canvas   = this.frameCanvas;

      if (!video || !detector || !canvas ||
          video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        this.rafId = requestAnimationFrame(loop);
        return;
      }

      const now = performance.now();
      if (now - lastDetectTime < DETECT_INTERVAL_MS) {
        this.rafId = requestAnimationFrame(loop);
        return;
      }
      lastDetectTime = now;

      try {
        // Draw the current video frame into the offscreen canvas
        const ctx = canvas.getContext("2d");
        if (!ctx) { this.rafId = requestAnimationFrame(loop); return; }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // detect() (IMAGE mode) is compatible with WebKit2GTK — no timestamp needed
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const results = detector.detect(canvas) as { landmarks?: Landmark[][] };
        consecutiveErrors = 0;

        if (results.landmarks && results.landmarks.length > 0) {
          this.landmarksSubs.forEach((cb) => cb(results.landmarks as Landmark[][]));
          const gesture = classifyGesture(results.landmarks[0]);
          if (gesture) this.dispatchGesture(gesture);
        } else {
          this.landmarksSubs.forEach((cb) => cb(null));
        }
      } catch (err) {
        consecutiveErrors++;
        if (consecutiveErrors >= 30) {
          this.errorSubs.forEach((cb) =>
            cb(`Gesture detection stopped: ${err instanceof Error ? err.message : "unknown error"}`)
          );
          this.isTracking = false;
          this.statusSubs.forEach((cb) => cb(false));
          return;
        }
      }

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  public stopTracking(): void {
    this.isTracking = false;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    // Remove the DOM-attached video element (added to satisfy WebKitGTK).
    if (this.videoEl) {
      this.videoEl.srcObject = null;
      this.videoEl.parentNode?.removeChild(this.videoEl);
      this.videoEl = null;
    }

    this.frameCanvas = null;

    this.statusSubs.forEach((cb) => cb(false));
    this.landmarksSubs.forEach((cb) => cb(null));
  }

  public isActive(): boolean {
    return this.isTracking;
  }

  /** Returns the live MediaStream so GestureOverlay can display the feed */
  public getMediaStream(): MediaStream | null {
    return this.mediaStream;
  }

  /**
   * Returns the off-screen video element already decoding frames for MediaPipe.
   * GestureOverlay uses this as the drawImage source so no second decode is needed.
   */
  public getVideoElement(): HTMLVideoElement | null {
    return this.videoEl;
  }

  // ── Path awareness ────────────────────────────────────────
  public setCurrentPath(path: string): void {
    this.currentPath = path;
  }

  // ── Subscriptions ─────────────────────────────────────────
  public onGesture(callback: GestureCallback): () => void {
    this.gestureSubs.add(callback);
    return () => this.gestureSubs.delete(callback);
  }

  public onStatusChange(callback: GestureStatusCallback): () => void {
    this.statusSubs.add(callback);
    return () => this.statusSubs.delete(callback);
  }

  /** Subscribe to raw landmark arrays for skeleton rendering */
  public onLandmarks(callback: LandmarksCallback): () => void {
    this.landmarksSubs.add(callback);
    return () => this.landmarksSubs.delete(callback);
  }

  /** Subscribe to camera / MediaPipe error messages */
  public onError(callback: CameraErrorCallback): () => void {
    this.errorSubs.add(callback);
    return () => this.errorSubs.delete(callback);
  }

  // ── Internal gesture dispatch ─────────────────────────────
  private dispatchGesture(gesture: GestureType): void {
    if (!this.isTracking) return;

    const now = Date.now();
    if (gesture === this.lastGesture && now - this.lastGestureAt < this.DEBOUNCE_MS) {
      return;
    }
    this.lastGesture  = gesture;
    this.lastGestureAt = now;

    const command = gestureToCommand(gesture, this.currentPath);
    this.gestureSubs.forEach((cb) => cb(gesture, command));
  }

  // ── Simulation (retained for Settings test buttons) ───────
  // Force-dispatches without requiring tracking to be active.
  public simulateGesture(gesture: GestureType): void {
    const was = this.isTracking;
    this.isTracking = true;
    this.dispatchGesture(gesture);
    this.isTracking = was;
  }

  public simulateGestureSequence(gestures: GestureType[], delayMs = 800): void {
    gestures.forEach((g, i) => {
      setTimeout(() => this.dispatchGesture(g), i * delayMs);
    });
  }

  public getLastGesture(): GestureType | undefined {
    return this.lastGesture;
  }

  public getLastGestureLabel(): string | undefined {
    return this.lastGesture ? GESTURE_LABELS[this.lastGesture] : undefined;
  }
}

// Singleton — one gesture engine for the whole OS session.
export const gestureEngine = new GestureEngine();
export type { GestureType };
