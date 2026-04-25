import React from "react";

/** Ghost wordmark (Telegram-style bar uses ~40px). Keep lightweight SVG — replaces raster logo when assets are absent. */
export function GhostLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="24" cy="24" r="22" fill="#243a52" />
      <path
        d="M14 18c0-1 1-2 2-1l16 6c1 0 1 2 0 2l-16 6c-1 1-2 0-2-1V18Z"
        fill="#8ab4e6"
      />
    </svg>
  );
}
