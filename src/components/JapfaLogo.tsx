import React from "react";

interface JapfaLogoProps {
  className?: string;
  iconOnly?: boolean;
}

export function JapfaLogo({ className = "h-11", iconOnly = false }: JapfaLogoProps) {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* JAPFA BRAND EMBLEM */}
      <div className="h-full aspect-square flex items-center justify-center shrink-0">
        <svg
          viewBox="0 0 120 120"
          className="h-full w-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer Left crescent / ellipse path */}
          <path
            d="M 28,68 C 12,96 34,108 58,102 C 34,106 18,92 32,64 C 42,44 60,30 78,20 C 58,32 38,48 28,68 Z"
            fill="#E35D15"
          />
          {/* Outer Right crescent / ellipse path */}
          <path
            d="M 92,52 C 108,24 86,12 62,18 C 86,14 102,28 88,56 C 78,76 60,90 42,100 C 62,88 82,72 92,52 Z"
            fill="#E35D15"
          />
          {/* Head of stylized human */}
          <circle cx="58" cy="36" r="8" fill="#E35D15" />
          {/* Body and Outstretched Arms of stylized human */}
          <path
            d="M 58,48 C 58,54 59,62 55,75 C 50,90 41,102 36,108 C 42,100 50,86 54,72 C 58,58 58,50 58,48 Z"
            fill="#E35D15"
          />
          <path
            d="M 38,58 C 46,50 56,48 68,52 C 78,56 86,64 92,72 C 84,62 74,54 64,50 C 54,46 44,48 38,58 Z"
            fill="#E35D15"
          />
        </svg>
      </div>

      {/* JAPFA TYPOGRAPHY WORDMARK */}
      {!iconOnly && (
        <div className="flex flex-col justify-center">
          <span 
            className="font-serif font-black text-[#1A1A1A] tracking-[-0.03em] leading-none"
            style={{ fontSize: "1.75rem" }}
          >
            JAPFA
          </span>
        </div>
      )}
    </div>
  );
}
