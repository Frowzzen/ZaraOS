// ============================================================
// ZaraOS Gesture Classifier
//
// Converts a MediaPipe 21-landmark hand result into a GestureType.
// Also exports drawHandSkeleton() for the GestureOverlay canvas.
//
// Landmark coordinate system (MediaPipe normalized):
//   x: 0 = left edge of frame, 1 = right edge
//   y: 0 = top of frame,       1 = bottom
//   z: depth relative to wrist (negative = closer to camera)
//
// In "user" facingMode the frame is already mirrored in the browser
// video element, but the raw coordinates from MediaPipe are NOT
// mirrored — treat x=0 as the left side from MediaPipe's perspective.
//
// Swipe detection: tracks the last N wrist positions within a time
// window and fires a swipe gesture when velocity crosses SWIPE_THRESHOLD.
// The wrist history is consumed (cleared) on each swipe to avoid double-fire.
// ============================================================

import type { GestureType } from "@/core/types";

// ── Landmark shape (matches MediaPipe NormalizedLandmark) ────
export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

// ── Landmark indices (MediaPipe canonical) ───────────────────
const L = {
  WRIST:      0,
  THUMB_CMC:  1,  THUMB_MCP:  2,  THUMB_IP:   3,  THUMB_TIP:  4,
  INDEX_MCP:  5,  INDEX_PIP:  6,  INDEX_DIP:  7,  INDEX_TIP:  8,
  MIDDLE_MCP: 9,  MIDDLE_PIP: 10, MIDDLE_DIP: 11, MIDDLE_TIP: 12,
  RING_MCP:  13,  RING_PIP:  14,  RING_DIP:  15,  RING_TIP:  16,
  PINKY_MCP: 17,  PINKY_PIP: 18,  PINKY_DIP: 19,  PINKY_TIP: 20,
} as const;

// ── Swipe detection state ────────────────────────────────────
const WRIST_HISTORY_MAX = 8;
const SWIPE_WINDOW_MS   = 500;   // history window
const SWIPE_THRESHOLD   = 0.16;  // normalized displacement to trigger swipe

type WristPos = { x: number; y: number; t: number };
let wristHistory: WristPos[] = [];

// ── Helpers ──────────────────────────────────────────────────
function dist2D(a: Landmark, b: Landmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * A four-finger (index, middle, ring, pinky) is extended when its TIP
 * is above its PIP which is above its MCP in the image (smaller y = higher).
 * We require both the TIP→PIP and PIP→MCP conditions to reduce false positives
 * when a finger is partially curled.
 */
function isFingerExtended(tip: Landmark, pip: Landmark, mcp: Landmark): boolean {
  return tip.y < pip.y && pip.y < mcp.y;
}

/**
 * The thumb extends sideways rather than upward. We detect extension by
 * checking that the TIP is sufficiently far from the CMC (carpal joint)
 * in 2D normalized space.
 */
function isThumbExtended(tip: Landmark, _ip: Landmark, cmc: Landmark): boolean {
  return dist2D(tip, cmc) > 0.12;
}

// ── Swipe detector ───────────────────────────────────────────
function detectSwipe(wrist: Landmark): GestureType | null {
  const now = Date.now();
  wristHistory.push({ x: wrist.x, y: wrist.y, t: now });

  // Trim to window
  wristHistory = wristHistory.filter((p) => now - p.t < SWIPE_WINDOW_MS);
  if (wristHistory.length > WRIST_HISTORY_MAX) {
    wristHistory = wristHistory.slice(-WRIST_HISTORY_MAX);
  }

  if (wristHistory.length < 3) return null;

  const oldest = wristHistory[0];
  const newest = wristHistory[wristHistory.length - 1];
  const dx = newest.x - oldest.x;
  const dy = newest.y - oldest.y;

  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDx < SWIPE_THRESHOLD && absDy < SWIPE_THRESHOLD) return null;

  // Consume history to prevent re-triggering on the same motion
  wristHistory = [];

  if (absDx > absDy) {
    // Horizontal — note MediaPipe x is NOT mirrored; the <video> CSS mirrors.
    // From the user's perspective a rightward wave = smaller x in raw coords.
    return dx < 0 ? "SWIPE_RIGHT" : "SWIPE_LEFT";
  }
  return dy < 0 ? "SWIPE_UP" : "SWIPE_DOWN";
}

// ── Main classifier ──────────────────────────────────────────

/**
 * Given a 21-landmark hand result from MediaPipe, returns the most likely
 * GestureType or null if no clear gesture is detected.
 *
 * Priority order:
 *   1. Swipe (velocity-based, takes precedence for navigation)
 *   2. PINCH   (thumb+index close)
 *   3. FIST    (no fingers extended)
 *   4. OPEN_PALM (4+ fingers extended)
 *   5. TWO_FINGERS_UP (peace sign)
 *   6. SWIPE_ACROSS (index only — pointing)
 *   7. GRAB    (thumb only extended — hook gesture)
 */
export function classifyGesture(landmarks: Landmark[]): GestureType | null {
  if (landmarks.length < 21) return null;

  // 1. Check for swipe first
  const swipe = detectSwipe(landmarks[L.WRIST]);
  if (swipe) return swipe;

  // Extension state for each finger
  const thumbExt  = isThumbExtended(landmarks[L.THUMB_TIP],  landmarks[L.THUMB_IP],   landmarks[L.THUMB_CMC]);
  const indexExt  = isFingerExtended(landmarks[L.INDEX_TIP],  landmarks[L.INDEX_PIP],  landmarks[L.INDEX_MCP]);
  const middleExt = isFingerExtended(landmarks[L.MIDDLE_TIP], landmarks[L.MIDDLE_PIP], landmarks[L.MIDDLE_MCP]);
  const ringExt   = isFingerExtended(landmarks[L.RING_TIP],   landmarks[L.RING_PIP],   landmarks[L.RING_MCP]);
  const pinkyExt  = isFingerExtended(landmarks[L.PINKY_TIP],  landmarks[L.PINKY_PIP],  landmarks[L.PINKY_MCP]);
  const extCount  = [thumbExt, indexExt, middleExt, ringExt, pinkyExt].filter(Boolean).length;

  // 2. PINCH — thumb and index tips very close, others curled
  const pinchDist = dist2D(landmarks[L.THUMB_TIP], landmarks[L.INDEX_TIP]);
  if (pinchDist < 0.055 && !middleExt && !ringExt && !pinkyExt) {
    return "PINCH";
  }

  // 3. FIST — all fingers curled
  if (extCount === 0) {
    return "FIST";
  }

  // 4. OPEN_PALM — 4 or more fingers extended (thumb optional)
  if (indexExt && middleExt && ringExt && pinkyExt) {
    return "OPEN_PALM";
  }

  // 5. TWO_FINGERS_UP — index + middle only (peace / "V")
  if (indexExt && middleExt && !ringExt && !pinkyExt) {
    return "TWO_FINGERS_UP";
  }

  // 6. SWIPE_ACROSS — index only pointing (static, before motion kicks in)
  if (indexExt && !middleExt && !ringExt && !pinkyExt) {
    return "SWIPE_ACROSS";
  }

  // 7. GRAB — thumb only (hook / grip gesture)
  if (thumbExt && !indexExt && !middleExt && !ringExt && !pinkyExt) {
    return "GRAB";
  }

  return null;
}

// ── Skeleton drawing ─────────────────────────────────────────
// Hand skeleton topology following MediaPipe's 21-landmark structure.

const HAND_CONNECTIONS: [number, number][] = [
  // Thumb chain
  [L.WRIST, L.THUMB_CMC], [L.THUMB_CMC, L.THUMB_MCP], [L.THUMB_MCP, L.THUMB_IP], [L.THUMB_IP, L.THUMB_TIP],
  // Index chain
  [L.WRIST, L.INDEX_MCP], [L.INDEX_MCP, L.INDEX_PIP], [L.INDEX_PIP, L.INDEX_DIP], [L.INDEX_DIP, L.INDEX_TIP],
  // Middle chain
  [L.WRIST, L.MIDDLE_MCP], [L.MIDDLE_MCP, L.MIDDLE_PIP], [L.MIDDLE_PIP, L.MIDDLE_DIP], [L.MIDDLE_DIP, L.MIDDLE_TIP],
  // Ring chain
  [L.WRIST, L.RING_MCP], [L.RING_MCP, L.RING_PIP], [L.RING_PIP, L.RING_DIP], [L.RING_DIP, L.RING_TIP],
  // Pinky chain
  [L.WRIST, L.PINKY_MCP], [L.PINKY_MCP, L.PINKY_PIP], [L.PINKY_PIP, L.PINKY_DIP], [L.PINKY_DIP, L.PINKY_TIP],
  // Palm knuckle bar
  [L.INDEX_MCP, L.MIDDLE_MCP], [L.MIDDLE_MCP, L.RING_MCP], [L.RING_MCP, L.PINKY_MCP], [L.WRIST, L.PINKY_MCP],
];

/**
 * Draw the hand skeleton onto a 2D canvas.
 * Coordinates are scaled from normalized [0,1] to pixel dimensions.
 * The canvas is expected to be CSS-mirrored (scaleX(-1)) to match the video.
 */
export function drawHandSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  width: number,
  height: number,
): void {
  if (landmarks.length < 21) return;

  // Bone connections
  ctx.strokeStyle = "rgba(0, 240, 255, 0.65)";
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  for (const [a, b] of HAND_CONNECTIONS) {
    ctx.beginPath();
    ctx.moveTo(landmarks[a].x * width, landmarks[a].y * height);
    ctx.lineTo(landmarks[b].x * width, landmarks[b].y * height);
    ctx.stroke();
  }

  // All landmark dots
  for (const lm of landmarks) {
    ctx.beginPath();
    ctx.arc(lm.x * width, lm.y * height, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 240, 255, 0.85)";
    ctx.fill();
  }

  // Larger dots on fingertips
  const tips: number[] = [L.THUMB_TIP, L.INDEX_TIP, L.MIDDLE_TIP, L.RING_TIP, L.PINKY_TIP];
  for (const ti of tips) {
    ctx.beginPath();
    ctx.arc(landmarks[ti].x * width, landmarks[ti].y * height, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(168, 85, 247, 0.9)";
    ctx.fill();
    ctx.strokeStyle = "rgba(168, 85, 247, 0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Wrist dot
  ctx.beginPath();
  ctx.arc(landmarks[L.WRIST].x * width, landmarks[L.WRIST].y * height, 5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 240, 255, 0.5)";
  ctx.fill();
}

export { HAND_CONNECTIONS };
