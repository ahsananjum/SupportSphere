import type { SVGProps } from 'react';
import React from 'react';

/**
 * Pure SVG organic wave art for the auth brand showcase.
 * Recreates the subtle fluid curve aesthetic tailored to the light/paper theme
 * with clear mint highlights, crisp scaling, and zero layout shift.
 */
export function AuthWaveArt(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 800 1000"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      {...props}
    >
      <defs>
        <linearGradient
          id="wave-light-base"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="var(--color-rule)" stopOpacity="0.8" />
          <stop offset="60%" stopColor="var(--color-rule)" stopOpacity="0.3" />
          <stop
            offset="100%"
            stopColor="var(--color-paper)"
            stopOpacity="0.05"
          />
        </linearGradient>

        <linearGradient
          id="wave-light-mint"
          x1="0%"
          y1="15%"
          x2="100%"
          y2="85%"
        >
          <stop
            offset="0%"
            stopColor="var(--color-accent-deep)"
            stopOpacity="0.65"
          />
          <stop
            offset="45%"
            stopColor="var(--color-accent)"
            stopOpacity="0.45"
          />
          <stop
            offset="100%"
            stopColor="var(--color-signal)"
            stopOpacity="0.1"
          />
        </linearGradient>
      </defs>

      {/* Layer 1: Sweeping background contours */}
      <path
        d="M-50,280 C170,350 310,540 850,750"
        stroke="url(#wave-light-base)"
        strokeWidth="1.5"
      />
      <path
        d="M-50,305 C180,375 320,565 850,775"
        stroke="url(#wave-light-base)"
        strokeWidth="1.2"
      />
      <path
        d="M-50,330 C190,400 330,590 850,800"
        stroke="url(#wave-light-base)"
        strokeWidth="1.4"
      />
      <path
        d="M-50,355 C200,425 340,615 850,825"
        stroke="url(#wave-light-base)"
        strokeWidth="1.2"
      />
      <path
        d="M-50,380 C210,450 350,640 850,850"
        stroke="url(#wave-light-base)"
        strokeWidth="1.5"
      />

      {/* Layer 2: Core ribbon wave with mint highlight */}
      <path
        d="M-40,400 C220,470 365,665 860,875"
        stroke="url(#wave-light-mint)"
        strokeWidth="2"
      />
      <path
        d="M-50,415 C228,485 372,680 850,890"
        stroke="url(#wave-light-base)"
        strokeWidth="1.25"
      />
      <path
        d="M-50,435 C236,505 380,700 850,910"
        stroke="url(#wave-light-base)"
        strokeWidth="1.4"
      />
      <path
        d="M-40,450 C244,520 388,715 860,925"
        stroke="url(#wave-light-mint)"
        strokeWidth="1.5"
      />
      <path
        d="M-50,470 C252,540 396,735 850,945"
        stroke="url(#wave-light-base)"
        strokeWidth="1.5"
      />
      <path
        d="M-50,490 C260,560 404,755 850,965"
        stroke="url(#wave-light-base)"
        strokeWidth="1.2"
      />

      {/* Layer 3: Lower trailing contours */}
      <path
        d="M-50,515 C270,585 414,780 850,990"
        stroke="url(#wave-light-base)"
        strokeWidth="1.25"
      />
      <path
        d="M-50,540 C280,610 424,805 850,1015"
        stroke="url(#wave-light-base)"
        strokeWidth="1.1"
      />
      <path
        d="M-50,570 C290,640 434,835 850,1045"
        stroke="url(#wave-light-base)"
        strokeWidth="1.3"
      />
    </svg>
  );
}
