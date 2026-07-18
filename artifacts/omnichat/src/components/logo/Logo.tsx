import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className, size = 40 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-label="OmniChat logo"
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient id="logoGlow" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#C084FC" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Rounded square background */}
      <rect width="40" height="40" rx="10" fill="url(#logoGradient)" />

      {/* Subtle top glow */}
      <path
        d="M0 14C0 6.268 6.268 0 14 0h12c7.732 0 14 6.268 14 14v4c0-5.523-4.477-10-10-10H10C4.477 8 0 12.477 0 18v-4z"
        fill="url(#logoGlow)"
      />

      {/* Connection lines / network path */}
      <path
        d="M11 27L17 21L23 24L29 17"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.5"
      />

      {/* Left chat bubble */}
      <path
        d="M10 25V17c0-1.105.895-2 2-2h6c1.105 0 2 .895 2 2v5c0 1.105-.895 2-2 2h-3l-3 3v-3h-2c-1.105 0-2-.895-2-2z"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="rgba(255,255,255,0.15)"
      />

      {/* Right chat bubble */}
      <path
        d="M20 22V14c0-1.105.895-2 2-2h6c1.105 0 2 .895 2 2v5c0 1.105-.895 2-2 2h-2l-3 3v-3h-3c-1.105 0-2-.895-2-2z"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="white"
        fillOpacity="0.9"
      />

      {/* Person / user dot connecting the channels */}
      <circle cx="20" cy="19" r="3.5" fill="white" />
      <circle cx="20" cy="19" r="1.8" fill="#7C3AED" />

      {/* Signal / WiFi indicator */}
      <path
        d="M27 8c2.5 0 5 2.5 5 5"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeOpacity="0.7"
      />
      <path
        d="M30 7c3.5 0 6 3 6 6"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeOpacity="0.4"
      />
    </svg>
  );
}
