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
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-label="OmniChat logo"
    >
      <defs>
        <linearGradient id="oc-bg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9333EA" />
          <stop offset="50%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#4C1D95" />
        </linearGradient>
        <linearGradient id="oc-shine" x1="10" y1="2" x2="38" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="white" stopOpacity="0.25" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <filter id="oc-shadow" x="-2" y="-1" width="52" height="54" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#1e1b4b" floodOpacity="0.5" />
        </filter>
      </defs>

      {/* Rounded square */}
      <rect x="1" y="1" width="46" height="46" rx="10" fill="url(#oc-bg)" filter="url(#oc-shadow)" />

      {/* Inner bevel / border */}
      <rect x="2.5" y="2.5" width="43" height="43" rx="8.5" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

      {/* Top-left shine */}
      <rect x="1" y="1" width="46" height="46" rx="10" fill="url(#oc-shine)" />

      {/* Swirl / vortex — two curved blades */}
      <g transform="translate(24,24)">
        {/* Blade 1 — top-right sweeping down */}
        <path
          d="M-2,-14 C10,-14 14,-4 14,2 C14,8 8,13 2,14 C-4,15 -10,12 -12,6"
          stroke="white"
          strokeWidth="5.5"
          strokeLinecap="round"
          fill="none"
          opacity="1"
        />
        {/* Blade 2 — bottom-left sweeping up */}
        <path
          d="M2,14 C-10,14 -14,4 -14,-2 C-14,-8 -8,-13 -2,-14 C4,-15 10,-12 12,-6"
          stroke="white"
          strokeWidth="5.5"
          strokeLinecap="round"
          fill="none"
          opacity="1"
        />

        {/* Center overlap — purple dot */}
        <circle cx="0" cy="0" r="4" fill="#7C3AED" />

        {/* Subtle highlight on blades */}
        <path
          d="M-2,-14 C10,-14 14,-4 14,2 C14,8 8,13 2,14"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  );
}
