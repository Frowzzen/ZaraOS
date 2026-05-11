// ============================================================
// ZaraOS Input Mode System
//
// Manages the global input mode state. All input — voice,
// gesture, text — is always routed through the same Runtime.
// The mode only controls which input channels are ACTIVE and
// what the UI surfaces as the primary interaction method.
//
// Modes:
//   hybrid  — Default. Voice primary, gesture for nav, text always available.
//   voice   — Voice is the only active input. Text still works as fallback.
//   gesture — Gesture is primary. Voice and text still available.
//   text    — Silent mode. Only keyboard/text input. No mic, no camera.
//
// All modes still route through zaraRuntime.executeCommand().
// No mode creates a separate command pipeline.
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { InputMode, InputModeConfig } from "./types";

const STORAGE_KEY = "zaraos_input_mode_v1";
const STORAGE_VOICE_KEY = "zaraos_voice_active_v1";
const STORAGE_GESTURE_KEY = "zaraos_gesture_active_v1";

function buildConfig(mode: InputMode, voiceActive: boolean, gestureActive: boolean): InputModeConfig {
  return {
    mode,
    voiceEnabled: voiceActive,
    gestureEnabled: gestureActive,
    textEnabled: true, // always on — text is the silent fallback
    commandBoxVisible: true, // always accessible
  };
}

function loadMode(): InputMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && ["voice", "gesture", "text", "hybrid"].includes(raw)) {
      return raw as InputMode;
    }
  } catch {
    // Ignore storage errors.
  }
  return "hybrid";
}

function saveMode(mode: InputMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Storage full — not fatal.
  }
}

function loadBool(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (raw === "true") return true;
    if (raw === "false") return false;
  } catch {
    // ignore
  }
  return fallback;
}

function saveBool(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // ignore
  }
}

// ── Mode Metadata ──────────────────────────────────────────
export const INPUT_MODE_META: Record<InputMode, {
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  borderColor: string;
  bgColor: string;
}> = {
  hybrid: {
    label: "Hybrid Mode",
    shortLabel: "HYBRID",
    description: "Voice primary, gesture for navigation, text always available. Recommended.",
    color: "text-cyan-400",
    borderColor: "border-cyan-500/40",
    bgColor: "bg-cyan-500/10",
  },
  voice: {
    label: "Voice Mode",
    shortLabel: "VOICE",
    description: "Voice commands are the primary input. Text available as fallback.",
    color: "text-amber-400",
    borderColor: "border-amber-500/40",
    bgColor: "bg-amber-500/10",
  },
  gesture: {
    label: "Gesture Mode",
    shortLabel: "GESTURE",
    description: "Camera gestures are primary for navigation and control.",
    color: "text-purple-400",
    borderColor: "border-purple-500/40",
    bgColor: "bg-purple-500/10",
  },
  text: {
    label: "Text Mode",
    shortLabel: "TEXT",
    description: "Silent mode. Keyboard and command box only. No mic or camera.",
    color: "text-green-400",
    borderColor: "border-green-500/40",
    bgColor: "bg-green-500/10",
  },
};

// ── Context ────────────────────────────────────────────────
interface InputModeContextType {
  mode: InputMode;
  config: InputModeConfig;
  setMode: (mode: InputMode) => void;
  cycleMode: () => void;
  // Independent hardware toggles — override mode defaults.
  // Voice and gesture can each be switched off regardless of mode.
  // Text/keyboard is always on and cannot be disabled.
  voiceActive: boolean;
  gestureActive: boolean;
  keyboardOnly: boolean; // true when both voice + gesture are off
  toggleVoice: () => void;
  toggleGesture: () => void;
  setVoice: (on: boolean) => void;
  setGesture: (on: boolean) => void;
  isCommandBoxOpen: boolean;
  openCommandBox: () => void;
  closeCommandBox: () => void;
  toggleCommandBox: () => void;
}

const InputModeContext = createContext<InputModeContextType | undefined>(undefined);

const MODE_CYCLE: InputMode[] = ["hybrid", "voice", "gesture", "text"];

export function InputModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<InputMode>(loadMode);
  const [voiceActive, setVoiceActive] = useState<boolean>(() =>
    loadBool(STORAGE_VOICE_KEY, true)
  );
  const [gestureActive, setGestureActive] = useState<boolean>(() =>
    loadBool(STORAGE_GESTURE_KEY, true)
  );
  const [isCommandBoxOpen, setCommandBoxOpen] = useState(false);

  const config = buildConfig(mode, voiceActive, gestureActive);
  const keyboardOnly = !voiceActive && !gestureActive;

  const setMode = useCallback((next: InputMode) => {
    setModeState(next);
    saveMode(next);
  }, []);

  const cycleMode = useCallback(() => {
    setModeState((prev) => {
      const idx = MODE_CYCLE.indexOf(prev);
      const next = MODE_CYCLE[(idx + 1) % MODE_CYCLE.length];
      saveMode(next);
      return next;
    });
  }, []);

  const toggleVoice = useCallback(() => {
    setVoiceActive((v) => {
      saveBool(STORAGE_VOICE_KEY, !v);
      return !v;
    });
  }, []);

  const toggleGesture = useCallback(() => {
    setGestureActive((v) => {
      saveBool(STORAGE_GESTURE_KEY, !v);
      return !v;
    });
  }, []);

  const setVoice = useCallback((on: boolean) => {
    setVoiceActive(on);
    saveBool(STORAGE_VOICE_KEY, on);
  }, []);

  const setGesture = useCallback((on: boolean) => {
    setGestureActive(on);
    saveBool(STORAGE_GESTURE_KEY, on);
  }, []);

  const openCommandBox = useCallback(() => setCommandBoxOpen(true), []);
  const closeCommandBox = useCallback(() => setCommandBoxOpen(false), []);
  const toggleCommandBox = useCallback(() => setCommandBoxOpen((v) => !v), []);

  // Global keyboard shortcut: Ctrl+Space to toggle command box
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.code === "Space") {
        e.preventDefault();
        setCommandBoxOpen((v) => !v);
      }
      if (e.key === "Escape" && isCommandBoxOpen) {
        setCommandBoxOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isCommandBoxOpen]);

  return (
    <InputModeContext.Provider value={{
      mode,
      config,
      setMode,
      cycleMode,
      voiceActive,
      gestureActive,
      keyboardOnly,
      toggleVoice,
      toggleGesture,
      setVoice,
      setGesture,
      isCommandBoxOpen,
      openCommandBox,
      closeCommandBox,
      toggleCommandBox,
    }}>
      {children}
    </InputModeContext.Provider>
  );
}

export function useInputMode(): InputModeContextType {
  const ctx = useContext(InputModeContext);
  if (!ctx) throw new Error("useInputMode must be used within InputModeProvider");
  return ctx;
}
