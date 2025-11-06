"use client";

import React from "react";

type Drop = {
  left: string;
  delay: string;
  duration: string;
  sizeClass: string;
  opacity?: number;
};

const drops: Drop[] = [
  { left: "12%", delay: "0s", duration: "7.2s", sizeClass: "w-3 h-3 md:w-4 md:h-4", opacity: 0.95 },
  { left: "32%", delay: "1.1s", duration: "6.8s", sizeClass: "w-2.5 h-2.5 md:w-3.5 md:h-3.5", opacity: 0.9 },
  { left: "52%", delay: "2.2s", duration: "7.8s", sizeClass: "w-3.5 h-3.5 md:w-5 md:h-5", opacity: 0.96 },
  { left: "68%", delay: "0.6s", duration: "6.5s", sizeClass: "w-2.5 h-2.5 md:w-3 md:h-3", opacity: 0.88 },
  { left: "84%", delay: "1.7s", duration: "7.4s", sizeClass: "w-3 h-3 md:w-4 h-4", opacity: 0.92 },
];

export default function GlowingDrops() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {drops.map((d, idx) => (
        <div
          key={idx}
          className={`glow-drop-ball ${d.sizeClass}`}
          style={{
            left: d.left,
            animationDelay: d.delay,
            animationDuration: d.duration,
            opacity: d.opacity ?? 0.92
          }}
        />
      ))}
    </div>
  );
}