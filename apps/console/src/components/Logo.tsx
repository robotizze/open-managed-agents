const SIZE_PX = {
  sm: 24,
  md: 28,
  lg: 32,
} as const;

interface LogoProps {
  size?: keyof typeof SIZE_PX;
  /** Brand is the product identity. Current is reserved for intentional
   * monochrome or inverse treatments supplied by the surrounding surface. */
  tone?: "brand" | "current";
  className?: string;
}

export function Logo({ size = "sm", tone = "brand", className = "" }: LogoProps) {
  const px = SIZE_PX[size];
  return (
    <span role="img" aria-label="GETTER AI" className={`inline-flex shrink-0 ${className}`.trim()} style={{ width: px, height: px }}>
      <img src="/getter-icon.png" alt="" className={tone === "current" ? "hidden" : "h-full w-full object-contain dark:hidden"} />
      <img src="/getter-icon-white.png" alt="" className={tone === "current" ? "h-full w-full object-contain" : "hidden h-full w-full object-contain dark:block"} />
    </span>
  );
}
