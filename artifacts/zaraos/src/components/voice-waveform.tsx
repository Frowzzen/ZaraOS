// ============================================================
// VoiceWaveform — animated equalizer bars for voice listening
//
// Shows 7 independent bars that oscillate at slightly different
// speeds and amplitudes to create a live "audio" feel.
// When active=false the bars collapse to a flat resting state.
//
// Uses framer-motion for smooth, GPU-accelerated animation.
// No audio data is consumed — the animation is purely visual.
// ============================================================

import { motion } from "framer-motion";

// Each tuple: [peakScaleY, durationSeconds, delaySeconds]
// Values are hand-tuned for an organic, non-mechanical look.
const BAR_CONFIGS: [number, number, number][] = [
  [0.35, 0.70, 0.00],
  [0.90, 0.52, 0.08],
  [0.60, 0.80, 0.16],
  [1.00, 0.46, 0.04],
  [0.55, 0.64, 0.12],
  [0.80, 0.56, 0.20],
  [0.30, 0.74, 0.06],
];

export type WaveformColor = "amber" | "cyan" | "purple";
export type WaveformSize  = "xs" | "sm" | "md";

interface VoiceWaveformProps {
  active?: boolean;
  color?:  WaveformColor;
  size?:   WaveformSize;
  className?: string;
}

const COLOR_CLASS: Record<WaveformColor, string> = {
  amber:  "bg-amber-400",
  cyan:   "bg-cyan-400",
  purple: "bg-purple-400",
};

// Total container height in px.
const SIZE_H: Record<WaveformSize, number> = {
  xs: 12,
  sm: 16,
  md: 22,
};

// Bar width class.
const SIZE_W: Record<WaveformSize, string> = {
  xs: "w-px",
  sm: "w-0.5",
  md: "w-0.5",
};

export function VoiceWaveform({
  active    = true,
  color     = "amber",
  size      = "sm",
  className = "",
}: VoiceWaveformProps) {
  const h          = SIZE_H[size];
  const barW       = SIZE_W[size];
  const colorClass = COLOR_CLASS[color];
  const gap        = size === "xs" ? "gap-px" : "gap-px";

  return (
    <div
      className={`flex items-center ${gap} flex-shrink-0 ${className}`}
      style={{ height: h }}
      aria-hidden="true"
    >
      {BAR_CONFIGS.map(([peak, duration, delay], i) => (
        <motion.div
          key={i}
          className={`${barW} rounded-full ${colorClass}`}
          style={{ height: h, originY: "50%" }}
          animate={
            active
              ? { scaleY: [0.12, peak, 0.12] }
              : { scaleY: 0.12 }
          }
          transition={
            active
              ? {
                  duration,
                  repeat:    Infinity,
                  ease:      "easeInOut",
                  delay,
                  repeatType: "loop",
                }
              : { duration: 0.25, ease: "easeOut" }
          }
        />
      ))}
    </div>
  );
}
