"use client";

import React from "react";

type RocketProps = {
  left: number; // percentage (0-100)
  top: number; // percentage (0-100)
  rotation: number; // degrees
  running: boolean;
  crashed: boolean;
  multiplier: number;
};

const Rocket: React.FC<RocketProps> = ({
  left,
  top,
  rotation,
  running,
  crashed,
  multiplier,
}) => {
  if (crashed) return null;

  // Flame intensity scales slightly with multiplier to feel more dynamic
  const flameWidth = Math.min(100, 50 + multiplier * 8); // px
  const flameOpacity = Math.min(1, 0.6 + Math.max(0, multiplier - 1) * 0.1);

  // Subtle glow scales with multiplier
  const glowSize = Math.min(140, 70 + multiplier * 12); // px
  const glowOpacity = Math.min(0.9, 0.45 + multiplier * 0.05);

  const particles = Array.from({ length: 6 }).map((_, i) => i);

  // Layered flame sizing
  const coreWidth = flameWidth * 0.55;
  const midWidth = flameWidth * 0.8;
  const coreThickness = 6 + Math.min(8, multiplier * 1.2);
  const midThickness = coreThickness + 2;
  const outerThickness = midThickness + 2;

  return (
    <div
      className="absolute transition-all duration-150 ease-out"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div
        className="relative"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: "transform 0.12s ease-out",
        }}
      >
        {/* Glow behind the rocket */}
        <div
          className="rocket-glow"
          style={{
            width: glowSize,
            height: glowSize,
            opacity: glowOpacity,
          }}
        />

        {/* Rocket visual */}
        <img
          src="/rocket.png"
          alt="rocket"
          className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 drop-shadow-lg relative z-10"
          style={{
            filter: "drop-shadow(0 0 10px rgba(59, 130, 246, 0.85))",
          }}
        />

        {/* Thruster flame */}
        {running && (
          <div
            className="thruster"
            style={{
              right: "100%",
              marginRight: "-5px",
            }}
          >
            <span
              className="flame flame-core"
              style={{
                width: coreWidth,
                height: coreThickness,
                opacity: Math.min(1, 0.9 + Math.max(0, multiplier - 1) * 0.12),
              }}
            />
            <span
              className="flame flame-middle"
              style={{
                width: midWidth,
                height: midThickness,
                opacity: Math.min(0.95, 0.75 + Math.max(0, multiplier - 1) * 0.1),
              }}
            />
            <span
              className="flame flame-outer"
              style={{
                width: flameWidth,
                height: outerThickness,
                opacity: flameOpacity,
              }}
            />
            <span className="heat-haze" />
          </div>
        )}

        {/* Exhaust particles */}
        {running && (
          <div className="absolute right-[100%] top-1/2 -translate-y-1/2 pointer-events-none">
            {particles.map((i) => {
              const size = 6 + i; // px
              const offsetY = (i - 3) * 2; // small vertical spread
              const delay = i * 120; // staggered animation
              return (
                <span
                  key={`particle-${i}`}
                  className="exhaust-particle"
                  style={{
                    width: size,
                    height: size,
                    top: offsetY,
                    animationDelay: `${delay}ms`,
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Speed lines when moving fast */}
        {running && multiplier > 2 && (
          <div className="absolute inset-0 pointer-events-none -z-0">
            <span
              className="speed-line"
              style={{ top: "-8px", animationDelay: "0ms" }}
            />
            <span
              className="speed-line"
              style={{ top: "6px", animationDelay: "200ms" }}
            />
            <span
              className="speed-line"
              style={{ top: "18px", animationDelay: "380ms" }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Rocket;