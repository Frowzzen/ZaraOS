// ============================================================
// GestureOverlay — floating camera feed + hand skeleton
//
// Mounted by Layout when gesture mode is active.
// Displays the camera feed and the live MediaPipe hand skeleton
// drawn by gesture-classifier.drawHandSkeleton().
//
// The overlay is non-interactive (pointer-events: none for the
// canvas layer) so it does not block UI elements behind it.
//
// Visual design:
//   - Fixed, bottom-right corner, 200 × 150 px
//   - Video is CSS-mirrored (scaleX(-1)) so left/right match
//     the user's natural perspective
//   - Skeleton canvas is also mirrored to match
//   - Detected gesture label appears as a floating badge
//   - Loading spinner shown while WASM initializes (~2-4 s)
//   - Error state shown if camera is denied or MediaPipe fails
// ============================================================

import { useEffect, useRef, useState } from "react";
import { gestureEngine } from "@/lib/gesture-engine";
import { drawHandSkeleton } from "@/lib/gesture-classifier";
import type { Landmark } from "@/lib/gesture-classifier";
import { X, Hand, Loader2, AlertTriangle } from "lucide-react";

interface GestureOverlayProps {
  onClose?: () => void;
}

export function GestureOverlay({ onClose }: GestureOverlayProps) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [gesture, setGesture]         = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);

  // ── Sync the display video to the engine's MediaStream ────
  // The engine holds the stream for detection; we grab it here
  // to render the feed in the overlay <video> element.
  useEffect(() => {
    function syncStream() {
      const stream = gestureEngine.getMediaStream();
      const video  = videoRef.current;
      if (!video) return;

      if (stream && video.srcObject !== stream) {
        video.srcObject = stream;
        video.play().catch(() => {});
        setCameraReady(true);
        setLoading(false);
      } else if (!stream) {
        setCameraReady(false);
        video.srcObject = null;
      }
    }

    syncStream();
    const id = setInterval(syncStream, 400);
    return () => clearInterval(id);
  }, []);

  // ── Draw skeleton when landmarks arrive ───────────────────
  useEffect(() => {
    return gestureEngine.onLandmarks((landmarksArray) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (landmarksArray && landmarksArray.length > 0) {
        drawHandSkeleton(
          ctx,
          landmarksArray[0] as Landmark[],
          canvas.width,
          canvas.height,
        );
      }
    });
  }, []);

  // ── Show gesture label briefly after each detection ───────
  useEffect(() => {
    return gestureEngine.onGesture((detectedGesture) => {
      setGesture(detectedGesture);
      // Auto-clear after 1.2 s
      setTimeout(() => {
        setGesture((prev) => (prev === detectedGesture ? null : prev));
      }, 1200);
    });
  }, []);

  // ── Start tracking on mount, stop on unmount ──────────────
  useEffect(() => {
    void gestureEngine.startTracking(window.location.pathname);
    return () => { gestureEngine.stopTracking(); };
  }, []);

  // ── Auto-dismiss after 20 s if still stuck loading ────────
  useEffect(() => {
    const t = setTimeout(() => {
      if (loading && !error) {
        setError("MediaPipe could not load. Check your internet connection.");
        setLoading(false);
      }
    }, 20_000);
    return () => clearTimeout(t);
  }, [loading, error]);

  // ── Handle engine errors (camera denied, WASM fail) ───────
  useEffect(() => {
    return gestureEngine.onError((msg) => {
      setError(msg);
      setLoading(false);
    });
  }, []);

  return (
    <div
      className="fixed bottom-5 right-5 z-50 w-52 rounded-xl overflow-hidden border border-purple-500/35 bg-black/85 backdrop-blur-sm shadow-2xl shadow-purple-900/40"
      data-testid="gesture-overlay"
    >
      {/* ── Header bar ── */}
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-purple-900/40 border-b border-purple-500/20">
        <div className="flex items-center gap-1.5">
          <Hand className="w-3 h-3 text-purple-400" />
          <span className="text-[10px] font-mono text-purple-300 uppercase tracking-widest">
            Gesture
          </span>
          {cameraReady && (
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse flex-shrink-0" />
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-muted-foreground/40 hover:text-white transition-colors ml-2"
            title="Hide gesture overlay"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* ── Camera + skeleton ── */}
      <div className="relative w-52 h-39" style={{ height: "150px" }}>

        {/* Loading state */}
        {loading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
            <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
            <p className="text-[9px] font-mono text-purple-400/60">
              Loading MediaPipe...
            </p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 z-10">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-[9px] font-mono text-red-400/70 text-center leading-snug">
              {error}
            </p>
          </div>
        )}

        {/* Camera feed — mirrored so it feels like a mirror */}
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            cameraReady ? "opacity-100" : "opacity-0"
          }`}
          style={{ transform: "scaleX(-1)" }}
          playsInline
          muted
          autoPlay
        />

        {/* Skeleton canvas — same mirror transform */}
        <canvas
          ref={canvasRef}
          width={208}
          height={150}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ transform: "scaleX(-1)" }}
        />

        {/* Gesture label badge */}
        {gesture && (
          <div className="absolute bottom-2 left-2 right-2 flex justify-center animate-in fade-in duration-100 z-20">
            <span className="text-[10px] font-mono text-purple-100 bg-purple-900/90 border border-purple-500/40 px-2 py-0.5 rounded-full shadow-lg">
              {gesture.replace(/_/g, " ")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
