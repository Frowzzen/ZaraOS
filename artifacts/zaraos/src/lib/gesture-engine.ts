// ============================================================
// ZaraOS Gesture Engine
//
// Manages camera access and gesture classification.
// Gesture events are mapped to runtime commands via gesture-mapper.ts
// and then dispatched through zaraRuntime.executeCommand() — the
// same pipeline as voice and keyboard input.
//
// Integration point: Replace simulateGesture() / simulateGestureSequence()
// with real MediaPipe Hands output.
//
// MediaPipe integration steps (future):
//   1. import { Hands } from "@mediapipe/hands";
//   2. Create Hands instance with model complexity and confidence thresholds
//   3. Feed webcam frames via requestAnimationFrame loop
//   4. On result: classify landmarks → GestureType
//   5. Call this.dispatchGesture(classified) — no other changes needed
// ============================================================

import type { GestureType } from "@/core/types";
import { gestureToCommand, GESTURE_LABELS } from "./gesture-mapper";

type GestureCallback = (gesture: GestureType, command: string) => void;
type GestureStatusCallback = (isTracking: boolean) => void;

class GestureEngine {
  private isTracking = false;
  private currentPath = "/";
  // Set-based subscriptions — consistent with VoiceEngine, supports multiple subscribers.
  private gestureSubs: Set<GestureCallback>       = new Set();
  private statusSubs:  Set<GestureStatusCallback> = new Set();
  private lastGesture?: GestureType;
  private lastGestureAt = 0;
  private readonly DEBOUNCE_MS = 600; // Prevent rapid double-fires

  // ── Permissions ──────────────────────────────────────────
  public async requestCameraPermission(): Promise<boolean> {
    // TODO: Real implementation:
    //   const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    //   stream.getTracks().forEach(t => t.stop()); // Just check permission, don't hold stream
    //   return true;
    return Promise.resolve(true);
  }

  // ── Tracking Control ─────────────────────────────────────
  public startTracking(initialPath = "/"): void {
    this.isTracking = true;
    this.currentPath = initialPath;
    this.statusSubs.forEach((cb) => cb(true));
    // TODO: Initialize MediaPipe Hands here and start the RAF loop.
    // The loop should call this.dispatchGesture(classified) on each recognized gesture.
  }

  public stopTracking(): void {
    this.isTracking = false;
    this.statusSubs.forEach((cb) => cb(false));
    // TODO: Cancel RAF loop and release camera stream.
  }

  public isActive(): boolean {
    return this.isTracking;
  }

  // ── Path Awareness ────────────────────────────────────────
  // The engine needs the current navigation path to resolve
  // SWIPE_LEFT / SWIPE_RIGHT to the correct panels.
  public setCurrentPath(path: string): void {
    this.currentPath = path;
  }

  // ── Subscriptions ─────────────────────────────────────────
  // Both return an unsubscribe function — safe to call in useEffect cleanup.
  // Multiple subscribers are supported (consistent with VoiceEngine).
  public onGesture(callback: GestureCallback): () => void {
    this.gestureSubs.add(callback);
    return () => this.gestureSubs.delete(callback);
  }

  public onStatusChange(callback: GestureStatusCallback): () => void {
    this.statusSubs.add(callback);
    return () => this.statusSubs.delete(callback);
  }

  // ── Gesture Dispatch ──────────────────────────────────────
  // The internal dispatch point — all recognized gestures go here,
  // whether from real MediaPipe output or simulation.
  private dispatchGesture(gesture: GestureType): void {
    if (!this.isTracking) return;

    // Debounce — ignore rapid repeats of the same gesture.
    const now = Date.now();
    if (gesture === this.lastGesture && now - this.lastGestureAt < this.DEBOUNCE_MS) {
      return;
    }
    this.lastGesture = gesture;
    this.lastGestureAt = now;

    const command = gestureToCommand(gesture, this.currentPath);
    this.gestureSubs.forEach((cb) => cb(gesture, command));
  }

  // ── Simulation (Alpha 0.1) ─────────────────────────────────
  // Used by the gesture demo panel and settings test buttons.
  // Remove in production — replace with real MediaPipe dispatch.
  public simulateGesture(gesture: GestureType): void {
    this.dispatchGesture(gesture);
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
