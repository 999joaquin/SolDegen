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
        {[...Array(40)].map((_, i) => (
          <div
            key={`p-${i}`}
            className="absolute w-0.5 h-0.5 bg-purple-300 rounded-full opacity-60"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `particle ${3 + Math.random() * 5}s linear infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes gridDrift {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(60px, 60px) scale(1.02); }
        }
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