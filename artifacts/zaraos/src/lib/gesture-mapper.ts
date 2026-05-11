// ============================================================
// ZaraOS Gesture Mapper
//
// The canonical mapping of gesture types to runtime commands.
// Every gesture produces a natural language command string that
// is fed into zaraRuntime.executeCommand(cmd, "gesture").
//
// This means gestures, voice, and text all enter the Runtime
// through the same pipeline — no separate command system.
//
// Panel navigation uses a fixed order so left/right swipes
// cycle through panels predictably. The current route is
// provided by the caller (typically the Layout component).
//
// Future: MediaPipe Hands classifies hand shapes → GestureType.
// This file maps GestureType → Runtime command. The interface
// between hardware recognition and software action is clean.
// ============================================================

import type { GestureType, GestureMapping } from "@/core/types";

// ── Panel Order ────────────────────────────────────────────
// The canonical left-to-right order of ZaraOS panels.
// SWIPE_LEFT = go to previous panel, SWIPE_RIGHT = go to next.
export const PANEL_ORDER = [
  "/",
  "/assistant",
  "/console",
  "/apps",
  "/files",
  "/media",
  "/settings",
  "/privacy",
  "/ai-providers",
  "/developers",
  "/skills",
] as const;

export type PanelPath = typeof PANEL_ORDER[number];

// ── Navigation Helpers ─────────────────────────────────────
export function getPreviousPanel(currentPath: string): PanelPath {
  const idx = PANEL_ORDER.indexOf(currentPath as PanelPath);
  if (idx <= 0) return PANEL_ORDER[PANEL_ORDER.length - 1];
  return PANEL_ORDER[idx - 1];
}

export function getNextPanel(currentPath: string): PanelPath {
  const idx = PANEL_ORDER.indexOf(currentPath as PanelPath);
  if (idx < 0 || idx >= PANEL_ORDER.length - 1) return PANEL_ORDER[0];
  return PANEL_ORDER[idx + 1];
}

// ── Gesture → Command Map ──────────────────────────────────
// Returns a runtime command string for a given gesture.
// Panel-aware commands (SWIPE_LEFT, SWIPE_RIGHT) need the
// current path to resolve the correct target panel.
export function gestureToCommand(
  gesture: GestureType,
  currentPath: string = "/"
): string {
  switch (gesture) {
    case "OPEN_PALM":
      // Wake Zara — always opens the assistant.
      return "open assistant";

    case "SWIPE_LEFT":
      // Navigate to previous panel.
      return `navigate to ${getPreviousPanel(currentPath)}`;

    case "SWIPE_RIGHT":
      // Navigate to next panel.
      return `navigate to ${getNextPanel(currentPath)}`;

    case "SWIPE_UP":
      // Scroll down (content moves upward in viewport).
      return "scroll down";

    case "SWIPE_DOWN":
      // Scroll up (content moves downward in viewport).
      return "scroll up";

    case "SWIPE_ACROSS":
      // Close active window — returns to home dashboard.
      return "go home";

    case "PINCH":
      // Select the currently focused element.
      return "select focused";

    case "GRAB":
      // Begin drag mode on the focused element.
      return "begin drag";

    case "FIST":
      // Dismiss / close — goes home.
      return "go home";

    case "TWO_FINGERS_UP":
      // Enter precision scroll mode.
      return "enable precision scroll";

    default:
      return "unknown gesture";
  }
}

// ── Gesture Mapping Reference ──────────────────────────────
// The full mapping table, used by the Settings panel and
// the gesture status overlay in the layout.
export const GESTURE_MAPPINGS: GestureMapping[] = [
  {
    gesture: "OPEN_PALM",
    label: "Open Palm",
    description: "Hold palm open toward camera",
    command: "open assistant",
    source: "gesture",
    requiresGestureMode: false, // Works in Hybrid too
  },
  {
    gesture: "SWIPE_LEFT",
    label: "Swipe Left",
    description: "Move hand left across frame",
    command: "previous panel",
    source: "gesture",
    requiresGestureMode: false,
  },
  {
    gesture: "SWIPE_RIGHT",
    label: "Swipe Right",
    description: "Move hand right across frame",
    command: "next panel",
    source: "gesture",
    requiresGestureMode: false,
  },
  {
    gesture: "SWIPE_UP",
    label: "Swipe Up",
    description: "Move hand upward across frame",
    command: "scroll down",
    source: "gesture",
    requiresGestureMode: false,
  },
  {
    gesture: "SWIPE_DOWN",
    label: "Swipe Down",
    description: "Move hand downward across frame",
    command: "scroll up",
    source: "gesture",
    requiresGestureMode: false,
  },
  {
    gesture: "SWIPE_ACROSS",
    label: "Swipe Across Window",
    description: "Fast horizontal swipe across active window",
    command: "close active window",
    source: "gesture",
    requiresGestureMode: false,
  },
  {
    gesture: "PINCH",
    label: "Pinch",
    description: "Bring thumb and index finger together",
    command: "select",
    source: "gesture",
    requiresGestureMode: false,
  },
  {
    gesture: "GRAB",
    label: "Grab",
    description: "Curl all fingers to grab position",
    command: "drag",
    source: "gesture",
    requiresGestureMode: true,
  },
  {
    gesture: "FIST",
    label: "Fist",
    description: "Close all fingers into a fist",
    command: "dismiss",
    source: "gesture",
    requiresGestureMode: false,
  },
  {
    gesture: "TWO_FINGERS_UP",
    label: "Two Fingers Up",
    description: "Extend index and middle finger upward",
    command: "precision scroll",
    source: "gesture",
    requiresGestureMode: true,
  },
];

export const GESTURE_LABELS: Record<GestureType, string> = Object.fromEntries(
  GESTURE_MAPPINGS.map((m) => [m.gesture, m.label])
) as Record<GestureType, string>;
