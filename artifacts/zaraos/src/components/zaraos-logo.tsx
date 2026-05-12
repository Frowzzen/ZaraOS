// ============================================================
// ZaraOS Logo Components
//
// ZaraOSIcon   — SVG Z mark, scalable at any size via className/style
// ZaraOSMark   — SVG Z mark + "ZaraOS" wordmark inline
//
// The Z mark is a geometric double-stroke Z: a solid Z letterform
// with a parallelogram gap through the diagonal, creating two
// parallel diagonal lines — matching the Gemini logo mockup.
// ============================================================

interface LogoProps {
  className?: string;
  /** Width in px. Height is inferred from the 100:80 aspect ratio. */
  size?: number;
}

/**
 * The Z mark icon only. Renders as a filled SVG, inherits currentColor.
 * Use `className="text-primary"` or `text-white` to color it.
 */
export function ZaraOSIcon({ className = "", size = 36 }: LogoProps) {
  const h = Math.round(size * 0.8);
  return (
    <svg
      width={size}
      height={h}
      viewBox="0 0 100 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ZaraOS"
      className={className}
    >
      {/*
        Outer Z path (clockwise):
          top bar → diagonal right edge → bottom bar → diagonal left edge
        Inner gap (parallelogram through the diagonal centre — evenodd cuts it out):
      */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="
          M 5 5 L 95 5 L 95 22
          L 28 58
          L 95 58 L 95 75 L 5 75 L 5 58
          L 72 22
          L 5 22 Z
          M 72 24 L 28 48 L 28 56 L 72 32 Z
        "
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Z mark + "ZaraOS" wordmark, horizontally composed.
 * The icon and text share the same vertical centre.
 */
export function ZaraOSMark({
  className = "",
  size = 28,
}: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <ZaraOSIcon size={size} />
      <span
        className="font-bold tracking-tight leading-none select-none"
        style={{ fontSize: Math.round(size * 0.72), letterSpacing: "-0.01em" }}
      >
        ZaraOS
      </span>
    </span>
  );
}
