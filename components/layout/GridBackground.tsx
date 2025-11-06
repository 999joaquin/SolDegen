"use client";

import React from "react";

const GridBackground = () => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-black to-indigo-900/20" />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(147, 51, 234, 0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(147, 51, 234, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: "120px 120px",
          backgroundPosition: "0px 0px",
          willChange: "background-position",
          animation: "gridDrift 45s linear infinite",
        }}
      />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgba(168, 85, 247, 0.25) 1px, transparent 1px),
            linear-gradient(90deg, rgba(168, 85, 247, 0.25) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          backgroundPosition: "0px 0px",
          willChange: "background-position",
          animation: "gridDrift 30s linear infinite reverse",
        }}
      />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(rgba(196, 132, 253, 0.35) 1px, transparent 1px),
            linear-gradient(90deg, rgba(196, 132, 253, 0.35) 1px, transparent 1px)
          `,
          backgroundSize: "30px 30px",
          backgroundPosition: "0px 0px",
          willChange: "background-position",
          animation: "gridDrift 20s linear infinite",
        }}
      />
      {[...Array(6)].map((_, i) => (
        <div
          key={`orb-${i}`}
          className="absolute rounded-full blur-3xl"
          style={{
            width: `${80 + i * 40}px`,
            height: `${80 + i * 40}px`,
            left: `${10 + i * 15}%`,
            top: `${15 + i * 12}%`,
            background: `radial-gradient(circle, rgba(168,85,247,0.4) 0%, rgba(147,51,234,0) 70%)`,
            animation: `floatOrb ${14 + i * 2}s ease-in-out infinite alternate`,
            animationDelay: `${i * 1.5}s`,
          }}
        />
      ))}
      <div className="absolute inset-0">
        {[...Array(40)].map((_, i) => {
          // Use seed-based positioning to avoid hydration mismatch
          const seed = i * 123.456;
          const left = ((seed * 9.9) % 100);
          const top = ((seed * 7.7) % 100);
          const duration = 3 + ((seed * 5.5) % 5);
          const delay = ((seed * 3.3) % 3);
          
          return (
            <div
              key={`p-${i}`}
              className="absolute w-0.5 h-0.5 bg-purple-300 rounded-full opacity-60"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                animation: `particle ${duration}s linear infinite`,
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </div>
      <style>{`
        /* Updated for seamless looping: move the repeating background by multiples of its size */
        @keyframes gridDrift {
          0% { background-position: 0px 0px; }
          100% { background-position: 120px 120px; }
        }
        /* REMOVED transform-based gridDrift to avoid visible reset snap */

        @keyframes floatOrb {
          0% { transform: translateY(0) scale(1); }
          100% { transform: translateY(-30px) scale(1.08); }
        }
        @keyframes particle {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default GridBackground;