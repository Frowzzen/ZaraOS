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
  // feedCanvasRef — displays camera frames (drawn via RAF, works in WebKitGTK)
  // skeletonCanvasRef — hand skeleton drawn on top
  const feedCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const feedRafRef    = useRef<number | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [gesture, setGesture]         = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);

  // ── Canvas-based camera feed ───────────────────────────────
  // We draw from the engine's own video element (already decoding frames
  // for MediaPipe) into a canvas via RAF. This avoids creating a second
  // decoder — WebKitGTK handles one MediaStream decode at a time reliably.
  useEffect(() => {
    let running = true;

    function drawFrame() {
      if (!running) return;
      const vid    = gestureEngine.getVideoElement();
      const canvas = feedCanvasRef.current;

      if (canvas && vid && vid.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.save();
          ctx.scale(-1, 1);
          ctx.drawImage(vid, -canvas.width, 0, canvas.width, canvas.height);
          ctx.restore();
        }
        if (!cameraReady) {
          setCameraReady(true);
          setLoading(false);
        }
      }

      feedRafRef.current = requestAnimationFrame(drawFrame);
    }

    feedRafRef.current = requestAnimationFrame(drawFrame);

    return () => {
      running = false;
      if (feedRafRef.current !== null) cancelAnimationFrame(feedRafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      className="fixed bottom-5 right-5 z-50 w-52 rounded-xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.96)", border: "1px solid rgba(148,163,184,0.16)", boxShadow: "0 12px 40px rgba(148,163,184,0.38), 0 4px 12px rgba(148,163,184,0.20), -4px -4px 16px rgba(255,255,255,0.88)" }}
      data-testid="gesture-overlay"
    >
      {/* ── Header bar ── */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-100/80" style={{ background: "linear-gradient(180deg, #ffffff 0%, #f8f9fc 100%)" }}>
        <div className="flex items-center gap-1.5">
          <Hand className="w-3 h-3 text-indigo-400" />
          <span className="text-[10px] font-mono text-indigo-500/70 uppercase tracking-widest">
            Gesture
          </span>
          {cameraReady && (
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse flex-shrink-0" />
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors ml-2"
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
            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
            <p className="text-[9px] font-mono text-slate-400/80">
              Loading MediaPipe...
            </p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 z-10">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-[9px] font-mono text-rose-500/75 text-center leading-snug">
              {error}
            </p>
          </div>
        )}

        {/* Camera feed — drawn via RAF into canvas (works in WebKitGTK) */}
        <canvas
          ref={feedCanvasRef}
          width={208}
          height={150}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            cameraReady ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Skeleton canvas — CSS mirror matches the feed canvas mirror */}
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
            <span className="text-[10px] font-mono text-indigo-700 px-2 py-0.5 rounded-full shadow-sm" style={{ background: "rgba(255,255,255,0.92)", border: "1px solid rgba(99,102,241,0.25)" }}>
              {gesture.replace(/_/g, " ")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
